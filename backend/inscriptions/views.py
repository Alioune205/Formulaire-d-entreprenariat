import csv
import logging
import re
from datetime import datetime

from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.db.models import Count, Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import generics, mixins, permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle, SimpleRateThrottle
from django.contrib.auth import authenticate

from django.core.mail import get_connection

from .emails import (
    apercu_acceptation, apercu_modele_acceptation, apres_reponse, envoyer_acceptation, envoyer_alerte_regeneration, envoyer_code,
    envoyer_confirmation,
)
from .models import CodeVerification, Inscription, Membre, ModeleEmail
from .genre import genre_effectif
from .recap import calculer_recap
from .serializers import InscriptionAdminSerializer, InscriptionPubliqueSerializer, MembreGenreSerializer, ModeleEmailSerializer

logger = logging.getLogger(__name__)


def date_limite():
    return datetime.fromisoformat(settings.DATE_LIMITE_INSCRIPTION)


def inscriptions_ouvertes():
    return timezone.now() <= date_limite()


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def infos_publiques(request):
    """GET /api/infos/ — date limite (pour le compte à rebours) et état des inscriptions."""
    return Response({
        "date_limite": date_limite().isoformat(),
        "maintenant": timezone.now().isoformat(),
        "inscriptions_ouvertes": inscriptions_ouvertes(),
    })


# Étapes publiques affichées au candidat (les notes internes ne sont jamais exposées).
ETAPES_SUIVI = {
    Inscription.Statut.EN_ATTENTE: "Votre dossier a bien été reçu et attend son examen par l'équipe du club.",
    Inscription.Statut.ENTRETIEN: "Votre groupe est convoqué à un entretien. Vous serez contactés pour la date et le lieu.",
    Inscription.Statut.ACCEPTE: "Félicitations ! Votre groupe est accepté au Club d'Entrepreneuriat.",
    Inscription.Statut.REJETE: "Votre dossier n'a pas été retenu pour cette cohorte. Merci pour votre candidature.",
}
RE_CODE = re.compile(r"^\d{6}$")


class ThrottleParIP(SimpleRateThrottle):
    """Limite par adresse IP ; le taux est lu dans DEFAULT_THROTTLE_RATES[scope]."""

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class SuiviThrottle(ThrottleParIP):
    scope = "suivi"


class DemandeCodeThrottle(ThrottleParIP):
    scope = "recuperation_demande"


class VerificationCodeThrottle(ThrottleParIP):
    scope = "recuperation_verification"


def _email(request):
    return str(request.data.get("email", "")).strip().lower()


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([SuiviThrottle])
def suivi_dossier(request):
    """POST /api/suivi/ — {reference, nom_groupe} : les deux doivent correspondre."""
    reference = str(request.data.get("reference", "")).strip().upper()
    nom_groupe = str(request.data.get("nom_groupe", "")).strip()
    introuvable = Response(
        {"detail": "Aucun dossier ne correspond à cette référence et à ce nom de groupe."},
        status=status.HTTP_404_NOT_FOUND,
    )
    if not reference or not nom_groupe:
        return introuvable
    ins = (
        Inscription.objects.prefetch_related("membres")
        .filter(reference=reference, nom_groupe__iexact=nom_groupe)
        .first()
    )
    if ins is None:
        return introuvable
    return Response({
        "reference": ins.reference,
        "nom_groupe": ins.nom_groupe,
        "nom_projet": ins.nom_projet,
        "statut": ins.statut,
        "statut_libelle": ins.get_statut_display(),
        "message": ETAPES_SUIVI[ins.statut],
        "cree_le": ins.cree_le,
        "mis_a_jour_le": ins.modifie_le,
        "membres": [f"{x.prenom} {x.nom}" for x in ins.membres.all()],
    })


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([DemandeCodeThrottle])
def recuperation_demande(request):
    """POST /api/recuperation/demande/ — {email} : envoie un code à 6 chiffres si un dossier existe.

    La réponse est identique que l'adresse soit connue ou non, pour ne pas révéler qui est inscrit.
    """
    email = _email(request)
    try:
        validate_email(email)
    except DjangoValidationError:
        return Response({"email": ["Adresse e-mail invalide."]}, status=status.HTTP_400_BAD_REQUEST)

    minutes = int(CodeVerification.DUREE_VALIDITE.total_seconds() // 60)
    response = Response({
        "message": (
            f"Si un dossier est associé à {email}, un code de vérification vient d'y être envoyé. "
            f"Il est valable {minutes} minutes. Pensez à regarder dans les spams."
        ),
    })
    # Au-delà du quota horaire, on n'envoie plus rien mais on répond pareil. L'e-mail part
    # APRÈS la réponse : même message et même temps de réponse que l'adresse soit inscrite
    # ou non (sinon la lenteur de Gmail révélerait qui est inscrit).
    if Inscription.objects.filter(email__iexact=email).exists() and not CodeVerification.quota_atteint(email):
        apres_reponse(response, envoyer_code, email, CodeVerification.creer(email))
    return response


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([VerificationCodeThrottle])
def recuperation_verification(request):
    """POST /api/recuperation/verification/ — {email, code} : vérifie le code puis
    génère une NOUVELLE référence pour chaque dossier lié à cet e-mail (l'ancienne est invalidée)."""
    email = _email(request)
    code = str(request.data.get("code", "")).strip()
    invalide = Response(
        {"detail": "Code invalide ou expiré. Demandez un nouveau code."},
        status=status.HTTP_400_BAD_REQUEST,
    )
    if not email or not RE_CODE.match(code):
        return invalide

    with transaction.atomic():
        cv = (
            CodeVerification.objects.select_for_update()
            .filter(email=email, utilise=False)
            .order_by("-cree_le")
            .first()
        )
        if cv is None or not cv.valide:
            return invalide
        if not cv.verifier(code):
            restantes = CodeVerification.MAX_TENTATIVES - cv.tentatives
            if restantes <= 0:
                return invalide
            return Response(
                {"detail": f"Code incorrect. Il vous reste {restantes} tentative{'s' if restantes > 1 else ''}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        dossiers = list(Inscription.objects.select_for_update().filter(email__iexact=email))
        for ins in dossiers:
            ins.regenerer_reference()

    return apres_reponse(Response({
        "dossiers": [
            {"reference": i.reference, "nom_groupe": i.nom_groupe, "nom_projet": i.nom_projet}
            for i in dossiers
        ],
    }), envoyer_alerte_regeneration, email, dossiers)



class InscriptionPubliqueView(generics.CreateAPIView):
    """POST /api/inscriptions/ — formulaire public."""

    serializer_class = InscriptionPubliqueSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "inscription"

    def create(self, request, *args, **kwargs):
        if not inscriptions_ouvertes():
            return Response(
                {"detail": "Les inscriptions sont closes depuis le "
                           f"{timezone.localtime(date_limite()):%d/%m/%Y à %H:%M}."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        inscription = serializer.save()
        return apres_reponse(Response(
            {
                "reference": inscription.reference,
                "message": (
                    f"Merci ! Le groupe « {inscription.nom_groupe} » est bien inscrit. "
                    "L'équipe du club vous contactera pour la suite."
                ),
            },
            status=status.HTTP_201_CREATED,
        ), envoyer_confirmation, inscription)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def connexion_admin(request):
    """POST /api/admin/connexion/ — renvoie un token pour un compte staff."""
    user = authenticate(
        username=request.data.get("username", ""),
        password=request.data.get("password", ""),
    )
    if user is None or not user.is_staff:
        return Response({"detail": "Identifiants invalides."}, status=status.HTTP_401_UNAUTHORIZED)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "username": user.get_username()})


@api_view(["POST"])
def deconnexion_admin(request):
    Token.objects.filter(user=request.user).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


class InscriptionAdminViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """/api/admin/inscriptions/ — réservé aux comptes staff."""

    serializer_class = InscriptionAdminSerializer

    def get_queryset(self):
        qs = Inscription.objects.prefetch_related("membres")
        statut = self.request.query_params.get("statut")
        if statut:
            qs = qs.filter(statut=statut)
        q = self.request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(
                Q(nom_groupe__icontains=q)
                | Q(nom_projet__icontains=q)
                | Q(reference__icontains=q)
                | Q(email__icontains=q)
                | Q(membres__nom__icontains=q)
                | Q(membres__prenom__icontains=q)
                | Q(membres__departement__icontains=q)
                | Q(membres__metier__icontains=q)
            ).distinct()
        return qs

    @action(detail=False, methods=["get"])
    def stats(self, request):
        agg = Inscription.objects.aggregate(
            total=Count("id"),
            en_attente=Count("id", filter=Q(statut=Inscription.Statut.EN_ATTENTE)),
            entretien=Count("id", filter=Q(statut=Inscription.Statut.ENTRETIEN)),
            accepte=Count("id", filter=Q(statut=Inscription.Statut.ACCEPTE)),
            rejete=Count("id", filter=Q(statut=Inscription.Statut.REJETE)),
        )
        agg["membres"] = Inscription.objects.aggregate(n=Count("membres"))["n"]
        return Response(agg)

    @action(detail=False, methods=["get"])
    def export(self, request):
        """Export CSV (UTF-8 avec BOM pour Excel) : une ligne par membre."""
        response = HttpResponse(content_type="text/csv; charset=utf-8")
        nom = f"inscriptions-club-{timezone.localdate():%Y-%m-%d}.csv"
        response["Content-Disposition"] = f'attachment; filename="{nom}"'
        response.write("﻿")
        w = csv.writer(response, delimiter=";")
        w.writerow([
            "Référence", "Nom du groupe", "Nom du projet", "E-mail", "Description", "Engagement",
            "Statut", "Inscrit le", "Nom", "Prénom", "Genre", "Département", "Filière",
        ])
        for ins in self.get_queryset():
            base = [
                ins.reference, ins.nom_groupe, ins.nom_projet, ins.email, ins.description_projet,
                "Oui" if ins.engagement else "Non", ins.get_statut_display(),
                timezone.localtime(ins.cree_le).strftime("%d/%m/%Y %H:%M"),
            ]
            for m in ins.membres.all():
                w.writerow(base + [m.nom, m.prenom, {"F": "Fille", "H": "Garçon"}.get(genre_effectif(m), "À vérifier"),
                                   m.departement, m.metier])
        return response

    @action(detail=False, methods=["get"])
    def recap(self, request):
        """Récapitulatif : genre, départements, filières, tailles de groupes, e-mails d'acceptation."""
        statut = request.query_params.get("statut") or None
        if statut and statut not in Inscription.Statut.values:
            return Response({"detail": "Statut inconnu."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(calculer_recap(statut))

    # --- E-mails de félicitations -------------------------------------------

    @action(detail=False, methods=["post"], url_path="accepter-tous")
    def accepter_tous(self, request):
        """Passe au statut « Accepté » tous les dossiers en attente ou en entretien.

        Les dossiers rejetés ne sont pas modifiés. N'envoie aucun e-mail.
        """
        n = Inscription.objects.filter(
            statut__in=[Inscription.Statut.EN_ATTENTE, Inscription.Statut.ENTRETIEN]
        ).update(statut=Inscription.Statut.ACCEPTE, modifie_le=timezone.now())
        return Response({"acceptes": n})

    @action(detail=False, methods=["get"], url_path="modele-acceptation")
    def modele_acceptation(self, request):
        """Le modèle de l'e-mail de félicitations, rempli avec un groupe fictif. N'envoie rien."""
        return Response(apercu_modele_acceptation())

    @action(detail=False, methods=["get", "put", "patch"], url_path="modele-email")
    def reglage_modele_email(self, request):
        """Consulter ou mettre à jour le modèle d'e-mail personnalisable."""
        modele = ModeleEmail.obtenir()
        if request.method in ["PUT", "PATCH"]:
            serializer = ModeleEmailSerializer(modele, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        return Response(ModeleEmailSerializer(modele).data)

    @action(detail=False, methods=["post"], url_path="modele-email/reinitialiser")
    def reinitialiser_modele_email(self, request):
        """Remet à zéro tous les champs du modèle d'e-mail avec les textes par défaut."""
        modele = ModeleEmail.obtenir()
        modele.reinitialiser()
        return Response(ModeleEmailSerializer(modele).data)

    @action(detail=False, methods=["post"], url_path="modele-email/apercu")
    def apercu_direct_modele_email(self, request):
        """Génère un aperçu HTML immédiat avec les données saisies sans les sauvegarder."""
        return Response(apercu_modele_acceptation(config=request.data))

    @action(detail=True, methods=["get"], url_path="apercu-acceptation")
    def apercu_acceptation(self, request, pk=None):
        return Response(apercu_acceptation(self.get_object()))

    @action(detail=True, methods=["post"], url_path="envoyer-acceptation")
    def envoyer_acceptation(self, request, pk=None):
        """Envoie (ou renvoie) l'e-mail de félicitations à un groupe accepté."""
        ins = self.get_object()
        if ins.statut != Inscription.Statut.ACCEPTE:
            return Response({"detail": "Le dossier doit d'abord être au statut « Accepté »."},
                            status=status.HTTP_400_BAD_REQUEST)
        if not ins.email:
            return Response({"detail": "Ce groupe n'a pas d'adresse e-mail."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            envoyer_acceptation(ins)
        except Exception:  # noqa: BLE001
            logger.exception("Échec de l'e-mail d'acceptation pour %s", ins.pk)
            return Response({"detail": "L'e-mail n'a pas pu être envoyé. Réessayez plus tard."},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)
        ins.acceptation_envoyee_le = timezone.now()
        ins.save(update_fields=["acceptation_envoyee_le", "modifie_le"])
        return Response(self.get_serializer(ins).data)

    @action(detail=False, methods=["post"], url_path="envoyer-acceptations")
    def envoyer_acceptations(self, request):
        """Envoi groupé, PAR LOTS : le back-office rappelle cette route jusqu'à « restants = 0 ».

        Seuls les groupes acceptés, avec e-mail, et pas encore notifiés sont concernés :
        relancer l'envoi ne crée jamais de doublon.
        """
        try:
            limite = max(1, min(int(request.data.get("limite", 10)), 20))
        except (TypeError, ValueError):
            limite = 10
        if request.data.get("accepter") in (True, "true", "1", 1):
            # « Envoyer à tous les groupes » : les dossiers en attente / en entretien sont
            # d'abord acceptés (les rejetés ne sont jamais concernés).
            Inscription.objects.filter(
                statut__in=[Inscription.Statut.EN_ATTENTE, Inscription.Statut.ENTRETIEN]
            ).update(statut=Inscription.Statut.ACCEPTE, modifie_le=timezone.now())
        a_envoyer = Inscription.objects.filter(
            statut=Inscription.Statut.ACCEPTE, acceptation_envoyee_le=None
        ).exclude(email="").order_by("cree_le")
        lot = list(a_envoyer.prefetch_related("membres")[:limite])

        envoyes, echecs = [], []
        connexion = get_connection()  # une seule connexion Gmail pour tout le lot
        try:
            connexion.open()
            for ins in lot:
                try:
                    envoyer_acceptation(ins, connexion)
                except Exception as e:  # noqa: BLE001
                    logger.exception("Échec de l'e-mail d'acceptation pour %s", ins.pk)
                    echecs.append({"id": ins.pk, "nom_groupe": ins.nom_groupe, "erreur": type(e).__name__})
                    continue
                ins.acceptation_envoyee_le = timezone.now()
                ins.save(update_fields=["acceptation_envoyee_le", "modifie_le"])
                envoyes.append({"id": ins.pk, "nom_groupe": ins.nom_groupe, "email": ins.email})
        except Exception:  # noqa: BLE001 — connexion impossible
            logger.exception("Connexion au serveur d'e-mails impossible")
            return Response({"detail": "Connexion au serveur d'e-mails impossible. Réessayez plus tard."},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)
        finally:
            connexion.close()

        return Response({
            "envoyes": envoyes,
            "echecs": echecs,
            "restants": a_envoyer.count(),
            "sans_email": Inscription.objects.filter(statut=Inscription.Statut.ACCEPTE, email="").count(),
        })


class MembreAdminViewSet(mixins.ListModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    """/api/admin/membres/ (staff uniquement)

    GET  ?a_verifier=1 : membres dont le genre n'a pu être déduit du prénom ni corrigé.
    PATCH <id>/ {genre} : corriger le genre d'un membre ("" = revenir à l'estimation).
    """

    serializer_class = MembreGenreSerializer
    http_method_names = ["get", "patch"]

    def get_queryset(self):
        return Membre.objects.select_related("inscription").order_by("inscription__nom_groupe", "id")

    def list(self, request, *args, **kwargs):
        membres = self.get_queryset()
        if request.query_params.get("a_verifier"):
            membres = [m for m in membres if not genre_effectif(m)]
        return Response(self.get_serializer(membres, many=True).data)
