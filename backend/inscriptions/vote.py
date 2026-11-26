"""Vote en ligne des élections du Club d'Entrepreneuriat.

Parcours : e-mail + prénom + nom -> code à 6 chiffres par e-mail -> bulletin -> confirmation.

Règles :
- électeurs : membres des groupes inscrits (sauf groupes rejetés) et candidats non rejetés ;
- une seule participation par membre, par candidat et par adresse e-mail ;
- poste à candidat unique : Pour / Contre / Blanc (élu si Pour > Contre) ;
- poste à plusieurs candidats : un candidat ou Blanc (égalité : la commission tranche) ;
- bulletin nominatif : les choix sont enregistrés avec le nom du votant (annoncé sur la page de vote)
  et consultables par l'administration ; les compteurs donnent les résultats ;
- résultats visibles uniquement après la clôture.
"""
import re
import secrets
import unicodedata
from datetime import datetime, timedelta, timezone as dt_timezone

from django.conf import settings
from django.core import signing
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import validate_email
from django.db import DatabaseError, IntegrityError, transaction
from django.db.models import F
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle

from . import stockage_r2
from .emails import apres_reponse, envoyer_code_vote
from .models import (
    BulletinNominatif, CandidaturePoste, CodeVote, CompteurVoix, Emargement, HorairesVote, Inscription, Membre,
    ModificationHorairesVote,
)
from .postes import POSTES_CATALOGUE
from .utils import domaine_est_faute_frappe, normaliser_email_canonique

SEL_SESSION_VOTE = "vote-session"
DUREE_SESSION = 30 * 60  # secondes pour remplir le bulletin après le code
GRACE_CLOTURE = timedelta(minutes=10)  # un bulletin commencé avant la clôture peut être validé
RE_CODE = re.compile(r"^\d{6}$")
ALPHABET_RECU = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


# --- Calendrier -------------------------------------------------------------------------------

def horaires_vote():
    """(début, fin) : horaires réglés dans le back-office, sinon VOTE_DEBUT / VOTE_FIN des réglages."""
    try:
        h = HorairesVote.obtenir()
    except DatabaseError:  # migration pas encore appliquée : on garde les horaires par défaut
        h = None
    debut = h.debut if h and h.debut else datetime.fromisoformat(settings.VOTE_DEBUT)
    fin = h.fin if h and h.fin else datetime.fromisoformat(settings.VOTE_FIN)
    return debut, fin


def vote_debut():
    return horaires_vote()[0]


def vote_fin():
    return horaires_vote()[1]


def etat_vote(maintenant=None):
    maintenant = maintenant or timezone.now()
    debut, fin = horaires_vote()
    if maintenant < debut:
        return "avant"
    if maintenant <= fin:
        return "ouvert"
    return "clos"


def infos_vote():
    debut, fin = horaires_vote()
    return {"vote_debut": debut.isoformat(), "vote_fin": fin.isoformat(), "vote_etat": etat_vote()}


def _reponse_vote_ferme():
    if etat_vote() == "avant":
        detail = "Le vote n'est pas encore ouvert. Il ouvre le jeudi 26 novembre à 8h."
    else:
        detail = "Le vote est clos. Merci pour votre participation !"
    return Response({"detail": detail, "code": "vote_ferme"}, status=status.HTTP_403_FORBIDDEN)


# --- Throttles (par IP, limites larges : Wi-Fi du campus partagé) --------------------------------

class _ParIP(SimpleRateThrottle):
    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class VoteDemandeThrottle(_ParIP):
    scope = "vote_demande"


class VoteVerificationThrottle(_ParIP):
    scope = "vote_verification"


class VoteThrottle(_ParIP):
    scope = "vote"


# --- Liste électorale -------------------------------------------------------------------------

def cle_nom(*parties):
    """Clé de comparaison d'un nom : sans accents, casse, ponctuation ni ordre des mots."""
    texte = " ".join(str(p or "") for p in parties)
    texte = unicodedata.normalize("NFKD", texte)
    texte = "".join(c for c in texte if not unicodedata.combining(c)).lower()
    mots = re.findall(r"[a-z0-9]+", texte)
    return " ".join(sorted(mots))


def membres_eligibles():
    return Membre.objects.exclude(inscription__statut=Inscription.Statut.REJETE).select_related("inscription")


def candidatures_en_lice():
    return CandidaturePoste.objects.exclude(statut=CandidaturePoste.Statut.REJETE)


def nombre_electeurs():
    """Électeurs inscrits : membres éligibles + candidats qui ne figurent pas déjà parmi eux."""
    cles_membres = {cle_nom(m.prenom, m.nom) for m in membres_eligibles()}
    candidats_hors_groupes = sum(1 for c in candidatures_en_lice() if cle_nom(c.prenom, c.nom) not in cles_membres)
    return membres_eligibles().count() + candidats_hors_groupes


def trouver_electeur(email_saisi, prenom, nom):
    """Renvoie (membre, candidature, erreur). Une seule des deux valeurs est renseignée."""
    cle = cle_nom(prenom, nom)
    deja = "Vous avez déjà voté. Une seule participation est autorisée par électeur."

    membres = [m for m in membres_eligibles().select_related("emargement") if cle_nom(m.prenom, m.nom) == cle]
    if membres:
        libre = next((m for m in membres if not hasattr(m, "emargement")), None)
        return (libre, None, None) if libre else (None, None, deja)

    candidat = next(
        (c for c in candidatures_en_lice().filter(email__iexact=email_saisi) if cle_nom(c.prenom, c.nom) == cle),
        None,
    )
    if candidat:
        if Emargement.objects.filter(candidature=candidat).exists():
            return None, None, deja
        return None, candidat, None

    return None, None, (
        f"« {prenom} {nom} » ne figure pas sur la liste électorale (membres des groupes inscrits au club). "
        "Écrivez votre prénom et votre nom exactement comme lors de l'inscription de votre groupe, "
        "ou contactez la commission électorale."
    )


# --- Bulletin ---------------------------------------------------------------------------------

def _photo(request, c):
    if not c.photo:
        return None
    return request.build_absolute_uri(c.photo.url) if request else c.photo.url


def _video(request, c):
    if c.video_r2_cle and stockage_r2.configure():
        return stockage_r2.url_lecture(c.video_r2_cle)
    if c.fichier_video:
        return request.build_absolute_uri(c.fichier_video.url) if request else c.fichier_video.url
    return c.lien_video or None


def postes_du_bulletin():
    """[(poste_catalogue, [candidatures])] dans l'ordre officiel ; les postes vacants sont exclus."""
    par_poste = {}
    for c in candidatures_en_lice().order_by("nom", "prenom"):
        par_poste.setdefault(c.poste, []).append(c)
    return [(p, par_poste[p["code"]]) for p in POSTES_CATALOGUE if par_poste.get(p["code"])]


def bulletin(request=None):
    return [
        {
            "code": p["code"],
            "titre": p["titre"],
            "categorie": p.get("categorie", ""),
            "candidat_unique": len(cands) == 1,
            "candidats": [
                {
                    "id": c.id, "prenom": c.prenom, "nom": c.nom, "departement": c.departement,
                    "metier": c.metier, "niveau": c.niveau, "photo": _photo(request, c),
                    "video": _video(request, c), "profession_de_foi": c.profession_de_foi,
                }
                for c in cands
            ],
        }
        for p, cands in postes_du_bulletin()
    ]


# --- Vues publiques ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def vue_bulletin(request):
    """GET /api/vote/bulletin/ — postes soumis au vote et leurs candidats."""
    return Response({**infos_vote(), "postes": bulletin(request)})


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([VoteDemandeThrottle])
def demande_code(request):
    """POST /api/vote/demande/ — {email, prenom, nom} : vérifie la liste électorale et envoie le code."""
    if etat_vote() != "ouvert":
        return _reponse_vote_ferme()

    email_saisi = str(request.data.get("email", "")).strip().lower()
    prenom = str(request.data.get("prenom", "")).strip()[:80]
    nom = str(request.data.get("nom", "")).strip()[:80]
    if not prenom or not nom:
        return Response({"detail": "Indiquez votre prénom et votre nom."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        validate_email(email_saisi)
    except DjangoValidationError:
        return Response({"detail": "Adresse e-mail invalide."}, status=status.HTTP_400_BAD_REQUEST)
    faute = domaine_est_faute_frappe(email_saisi)
    if faute:
        return Response(
            {"detail": f"Vouliez-vous dire « @{faute[1]} » au lieu de « @{faute[0]} » ?"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    email = normaliser_email_canonique(email_saisi)
    if Emargement.objects.filter(email=email).exists():
        return Response(
            {"detail": "Cette adresse e-mail a déjà servi à voter. Une adresse ne peut voter qu'une seule fois.",
             "code": "deja_vote"},
            status=status.HTTP_409_CONFLICT,
        )

    membre, candidature, erreur = trouver_electeur(email_saisi, prenom, nom)
    if erreur:
        code_http = status.HTTP_409_CONFLICT if "déjà voté" in erreur else status.HTTP_404_NOT_FOUND
        return Response(
            {"detail": erreur, "code": "deja_vote" if code_http == 409 else "non_inscrit"}, status=code_http
        )

    if CodeVote.quota_atteint(email):
        return Response(
            {"detail": "Trop de codes demandés pour cette adresse. Réessayez dans une heure."},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    nom_complet = f"{(membre or candidature).prenom} {(membre or candidature).nom}"
    _, code = CodeVote.creer(email, email_saisi, nom_complet, membre=membre, candidature=candidature)
    minutes = int(CodeVote.DUREE_VALIDITE.total_seconds() // 60)
    response = Response({
        "message": f"Un code à 6 chiffres vient d'être envoyé à {email_saisi}. Il est valable {minutes} minutes. "
                   "Pensez à regarder dans les spams.",
        "electeur": nom_complet,
    })
    return apres_reponse(response, envoyer_code_vote, email_saisi, code, prenom)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([VoteVerificationThrottle])
def verification_code(request):
    """POST /api/vote/verification/ — {email, code} : renvoie un jeton de session de vote (30 min)."""
    if etat_vote() != "ouvert":
        return _reponse_vote_ferme()
    email = normaliser_email_canonique(str(request.data.get("email", "")).strip().lower())
    code = str(request.data.get("code", "")).strip()
    invalide = Response({"detail": "Code invalide ou expiré. Demandez un nouveau code."},
                        status=status.HTTP_400_BAD_REQUEST)
    if not email or not RE_CODE.match(code):
        return invalide

    with transaction.atomic():
        cv = CodeVote.objects.select_for_update().filter(email=email, utilise=False).order_by("-cree_le").first()
        if cv is None or not cv.valide:
            return invalide
        if not cv.verifier(code):
            restantes = CodeVote.MAX_TENTATIVES - cv.tentatives
            if restantes <= 0:
                return invalide
            return Response(
                {"detail": f"Code incorrect. Il vous reste {restantes} tentative{'s' if restantes > 1 else ''}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    jeton = signing.dumps({"c": cv.id, "t": timezone.now().timestamp()}, salt=SEL_SESSION_VOTE)
    return Response({"jeton": jeton, "electeur": cv.nom_complet, "expire_dans": DUREE_SESSION})


def _generer_recu():
    while True:
        brut = "".join(secrets.choice(ALPHABET_RECU) for _ in range(8))
        recu = f"V-{brut[:4]}-{brut[4:]}"
        if not Emargement.objects.filter(recu=recu).exists():
            return recu


def _incrementer(poste, choix, candidature=None):
    cle = f"{poste}:{choix}:{candidature.id if candidature else ''}"
    compteur, _ = CompteurVoix.objects.get_or_create(
        cle=cle, defaults={"poste": poste, "choix": choix, "candidature": candidature}
    )
    CompteurVoix.objects.filter(pk=compteur.pk).update(voix=F("voix") + 1)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([VoteThrottle])
def voter(request):
    """POST /api/vote/voter/ — {jeton, choix: {POSTE: id_candidat | "BLANC" | "POUR" | "CONTRE"}}."""
    try:
        session = signing.loads(str(request.data.get("jeton", "")), salt=SEL_SESSION_VOTE, max_age=DUREE_SESSION)
    except signing.SignatureExpired:
        return Response({"detail": "Votre session de vote a expiré (30 minutes). Recommencez avec un nouveau code.",
                         "code": "session_expiree"}, status=status.HTTP_400_BAD_REQUEST)
    except signing.BadSignature:
        return Response({"detail": "Session de vote invalide. Recommencez."}, status=status.HTTP_400_BAD_REQUEST)

    maintenant = timezone.now()
    commence_le = datetime.fromtimestamp(session["t"], tz=dt_timezone.utc)
    if maintenant < vote_debut() or (maintenant > vote_fin() and
                                      (commence_le > vote_fin() or maintenant > vote_fin() + GRACE_CLOTURE)):
        return _reponse_vote_ferme()

    cv = CodeVote.objects.select_related("membre", "candidature").filter(pk=session["c"], utilise=True).first()
    if cv is None or (cv.membre_id is None and cv.candidature_id is None):
        return Response({"detail": "Session de vote invalide. Recommencez."}, status=status.HTTP_400_BAD_REQUEST)

    # Validation du bulletin : chaque poste reçoit un choix valide ; un poste oublié compte comme blanc.
    choix_recus = request.data.get("choix") or {}
    if not isinstance(choix_recus, dict):
        return Response({"detail": "Bulletin invalide."}, status=status.HTTP_400_BAD_REQUEST)
    a_compter = []
    lisible = []
    for poste, cands in postes_du_bulletin():
        code_poste = poste["code"]
        valeur = str(choix_recus.get(code_poste, "BLANC")).strip().upper()
        if valeur == "BLANC":
            a_compter.append((code_poste, CompteurVoix.Choix.BLANC, None))
        elif len(cands) == 1 and valeur in ("POUR", "CONTRE"):
            a_compter.append((code_poste, valeur, cands[0]))
        elif len(cands) > 1 and valeur.isdigit() and any(c.id == int(valeur) for c in cands):
            a_compter.append((code_poste, CompteurVoix.Choix.CANDIDAT, next(c for c in cands if c.id == int(valeur))))
        else:
            return Response({"detail": f"Choix invalide pour le poste « {poste['titre']} ». Rechargez la page."},
                            status=status.HTTP_400_BAD_REQUEST)
        _, choix_compte, cand = a_compter[-1]
        nom_cand = f"{cand.prenom} {cand.nom}" if cand else ""
        libelle = {"BLANC": "Vote blanc", "POUR": f"Pour {nom_cand}", "CONTRE": f"Contre {nom_cand}"}.get(
            choix_compte, nom_cand)
        lisible.append({"poste": code_poste, "titre": poste["titre"], "choix": libelle})

    try:
        with transaction.atomic():
            # L'émargement est écrit en premier : la contrainte d'unicité bloque tout second vote,
            # même si deux bulletins arrivent en même temps.
            emargement = Emargement.objects.create(
                membre=cv.membre, candidature=cv.candidature, email=cv.email, email_saisi=cv.email_saisi,
                nom_complet=cv.nom_complet, recu=_generer_recu(),
            )
            for code_poste, choix, candidature in a_compter:
                _incrementer(code_poste, choix, candidature)
            try:
                with transaction.atomic():  # point de sauvegarde : le vote passe même si la table manque
                    BulletinNominatif.objects.create(emargement=emargement, choix=lisible)
            except DatabaseError:
                pass
    except IntegrityError:
        return Response({"detail": "Vous avez déjà voté. Une seule participation est autorisée par électeur.",
                         "code": "deja_vote"}, status=status.HTTP_409_CONFLICT)

    return Response({"recu": emargement.recu, "vote_le": emargement.vote_le}, status=status.HTTP_201_CREATED)


# --- Back-office --------------------------------------------------------------------------------

def calculer_resultats():
    compteurs = {}
    for c in CompteurVoix.objects.all():
        compteurs[c.cle] = c.voix
    resultats = []
    for poste, cands in postes_du_bulletin():
        code = poste["code"]
        blancs = compteurs.get(f"{code}:BLANC:", 0)
        if len(cands) == 1:
            c = cands[0]
            pour = compteurs.get(f"{code}:POUR:{c.id}", 0)
            contre = compteurs.get(f"{code}:CONTRE:{c.id}", 0)
            resultats.append({
                "code": code, "titre": poste["titre"], "candidat_unique": True, "blancs": blancs,
                "total": pour + contre + blancs, "pour": pour, "contre": contre,
                "candidats": [{"id": c.id, "prenom": c.prenom, "nom": c.nom, "voix": pour, "elu": pour > contre}],
                "egalite": False,
            })
            continue
        lignes = [
            {"id": c.id, "prenom": c.prenom, "nom": c.nom, "voix": compteurs.get(f"{code}:CANDIDAT:{c.id}", 0)}
            for c in cands
        ]
        lignes.sort(key=lambda x: -x["voix"])
        maxi = lignes[0]["voix"]
        en_tete = [x for x in lignes if x["voix"] == maxi]
        egalite = maxi > 0 and len(en_tete) > 1
        for x in lignes:
            x["elu"] = maxi > 0 and not egalite and x["voix"] == maxi
        resultats.append({
            "code": code, "titre": poste["titre"], "candidat_unique": False, "blancs": blancs,
            "total": sum(x["voix"] for x in lignes) + blancs, "candidats": lignes, "egalite": egalite,
        })
    return resultats


@api_view(["GET"])
@permission_classes([permissions.IsAdminUser])
def admin_vote(request):
    """GET /api/admin/vote/ — participation et résultats en direct (provisoires jusqu'à la clôture)."""
    etat = etat_vote()
    return Response({
        **infos_vote(),
        "votants": Emargement.objects.count(),
        "electeurs": nombre_electeurs(),
        "postes_au_vote": len(postes_du_bulletin()),
        # Résultats visibles par l'admin dès l'ouverture : provisoires tant que le vote n'est pas clos.
        "resultats": calculer_resultats() if etat != "avant" else None,
        "resultats_provisoires": etat == "ouvert",
    })


@api_view(["GET"])
@permission_classes([permissions.IsAdminUser])
def admin_emargement(request):
    """GET /api/admin/vote/emargement/ — qui a voté, quand, et ses choix (bulletin nominatif s'il existe)."""
    try:
        bulletins = {b.emargement_id: b.choix for b in BulletinNominatif.objects.all()}
    except DatabaseError:
        bulletins = {}
    return Response([
        {"nom_complet": e.nom_complet, "email": e.email_saisi, "recu": e.recu, "vote_le": e.vote_le,
         "type": "Candidat" if e.candidature_id else "Membre", "choix": bulletins.get(e.id)}
        for e in Emargement.objects.all()
    ])


def _lire_date(valeur, champ):
    try:
        d = datetime.fromisoformat(str(valeur))
    except (TypeError, ValueError):
        raise ValueError(f"Date de {champ} invalide.")
    if timezone.is_naive(d):
        d = d.replace(tzinfo=dt_timezone.utc)  # heure de Dakar = UTC
    return d


def _journal_horaires():
    return [
        {"par": m.par, "motif": m.motif, "le": m.le, "debut_avant": m.debut_avant, "fin_avant": m.fin_avant,
         "debut_apres": m.debut_apres, "fin_apres": m.fin_apres}
        for m in ModificationHorairesVote.objects.all()
    ]


@api_view(["GET", "POST"])
@permission_classes([permissions.IsAdminUser])
def admin_horaires(request):
    """GET/POST /api/admin/vote/horaires/ — prolonger, avancer ou clore le vote depuis le back-office.

    Règles : motif obligatoire (journalisé) ; l'ouverture ne bouge plus une fois le vote commencé ;
    plus aucune modification une fois le vote clos (les résultats sont alors visibles).
    """
    if request.method == "GET":
        return Response({**infos_vote(), "journal": _journal_horaires()})

    maintenant = timezone.now()
    etat = etat_vote(maintenant)
    debut_avant, fin_avant = horaires_vote()
    if etat == "clos":
        return Response({"detail": "Le vote est clos : ses horaires ne peuvent plus être modifiés."},
                        status=status.HTTP_409_CONFLICT)

    motif = str(request.data.get("motif", "")).strip()
    if len(motif) < 5:
        return Response({"detail": "Indiquez le motif de la modification (décision de la commission…)."},
                        status=status.HTTP_400_BAD_REQUEST)
    try:
        debut = _lire_date(request.data.get("debut", debut_avant.isoformat()), "début")
        if request.data.get("clore_maintenant"):
            fin = maintenant
        else:
            fin = _lire_date(request.data.get("fin", fin_avant.isoformat()), "fin")
    except ValueError as e:
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    if etat == "ouvert" and abs((debut - debut_avant).total_seconds()) >= 60:
        return Response({"detail": "Le vote a déjà commencé : l'heure d'ouverture ne peut plus changer."},
                        status=status.HTTP_400_BAD_REQUEST)
    if etat == "ouvert":
        debut = debut_avant
    if fin <= debut:
        return Response({"detail": "La clôture doit être après l'ouverture."}, status=status.HTTP_400_BAD_REQUEST)
    if fin < maintenant - timedelta(minutes=1):
        return Response({"detail": "La clôture ne peut pas être dans le passé (utilisez « Clore maintenant »)."},
                        status=status.HTTP_400_BAD_REQUEST)
    if etat == "avant" and debut < maintenant - timedelta(minutes=1):
        debut = maintenant  # ouverture avancée à « maintenant » au plus tôt

    with transaction.atomic():
        HorairesVote.objects.update_or_create(id=1, defaults={"debut": debut, "fin": fin})
        ModificationHorairesVote.objects.create(
            par=request.user.get_username(), motif=motif[:1000],
            debut_avant=debut_avant, fin_avant=fin_avant, debut_apres=debut, fin_apres=fin,
        )
    return Response({**infos_vote(), "journal": _journal_horaires()})


# --- Électeurs ajoutés par la commission (nouveaux membres absents des groupes inscrits) ---------

GROUPE_AJOUTS = "Nouveaux membres (ajout commission)"


def groupe_ajouts():
    groupe = Inscription.objects.filter(nom_groupe=GROUPE_AJOUTS).first()
    if groupe:
        return groupe
    return Inscription.objects.create(
        nom_groupe=GROUPE_AJOUTS, nom_projet="Électeurs ajoutés par la commission électorale",
        description_projet="Membres ayant rejoint le club après les inscriptions, ajoutés à la liste électorale.",
        engagement=True, statut=Inscription.Statut.ACCEPTE,
    )


def _electeurs_ajoutes():
    groupe = Inscription.objects.filter(nom_groupe=GROUPE_AJOUTS).first()
    if not groupe:
        return []
    return [
        {"id": m.id, "prenom": m.prenom, "nom": m.nom, "a_vote": hasattr(m, "emargement")}
        for m in groupe.membres.select_related("emargement").order_by("-id")
    ]


def _decouper_nom(ligne):
    """« Mamadou Lamine Fall » -> ("Mamadou Lamine", "Fall"). L'ordre importe peu : la comparaison l'ignore."""
    mots = ligne.replace(";", " ").replace(",", " ").split()
    if len(mots) < 2 or not cle_nom(*mots):
        return None
    return " ".join(mots[:-1])[:80], mots[-1][:80]


@api_view(["GET", "POST"])
@permission_classes([permissions.IsAdminUser])
def admin_electeurs(request):
    """GET/POST /api/admin/vote/electeurs/ — ajouter des électeurs (un « Prénom Nom » par ligne)."""
    if request.method == "POST":
        if etat_vote() == "clos":
            return Response({"detail": "Le vote est clos : la liste électorale ne peut plus changer."},
                            status=status.HTTP_409_CONFLICT)
        lignes = [l.strip() for l in str(request.data.get("lignes", "")).splitlines() if l.strip()]
        if not lignes:
            return Response({"detail": "Écrivez au moins un « Prénom Nom »."}, status=status.HTTP_400_BAD_REQUEST)
        if len(lignes) > 300:
            return Response({"detail": "300 noms maximum à la fois."}, status=status.HTTP_400_BAD_REQUEST)
        connus = {cle_nom(m.prenom, m.nom) for m in membres_eligibles()}
        connus |= {cle_nom(c.prenom, c.nom) for c in candidatures_en_lice()}
        ajoutes, ignores = [], []
        groupe = None
        for ligne in lignes:
            nom = _decouper_nom(ligne)
            if not nom:
                ignores.append({"ligne": ligne, "raison": "Il faut au moins un prénom et un nom."})
                continue
            cle = cle_nom(*nom)
            if cle in connus:
                ignores.append({"ligne": ligne, "raison": "Déjà sur la liste électorale."})
                continue
            groupe = groupe or groupe_ajouts()
            Membre.objects.create(inscription=groupe, prenom=nom[0], nom=nom[1],
                                  departement="Non renseigné", metier="Non renseigné")
            connus.add(cle)
            ajoutes.append(f"{nom[0]} {nom[1]}")
        return Response({"ajoutes": ajoutes, "ignores": ignores, "electeurs": _electeurs_ajoutes(),
                         "total_electeurs": nombre_electeurs()})
    return Response({"electeurs": _electeurs_ajoutes(), "total_electeurs": nombre_electeurs()})


@api_view(["DELETE"])
@permission_classes([permissions.IsAdminUser])
def admin_electeur_supprimer(request, pk):
    """DELETE /api/admin/vote/electeurs/<id>/ — retirer un électeur ajouté (erreur de saisie), s'il n'a pas voté."""
    membre = Membre.objects.filter(pk=pk, inscription__nom_groupe=GROUPE_AJOUTS).select_related("emargement").first()
    if not membre:
        return Response({"detail": "Électeur introuvable."}, status=status.HTTP_404_NOT_FOUND)
    if hasattr(membre, "emargement"):
        return Response({"detail": "Cette personne a déjà voté : elle ne peut plus être retirée."},
                        status=status.HTTP_409_CONFLICT)
    membre.delete()
    return Response({"electeurs": _electeurs_ajoutes(), "total_electeurs": nombre_electeurs()})
