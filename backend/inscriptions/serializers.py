from django.core import signing
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from . import stockage_r2
from .genre import estimer_genre, genre_effectif
from .models import CandidaturePoste, Inscription, Membre, ModeleEmail
from .utils import (
    domaine_est_faute_frappe,
    normaliser_email_canonique,
    normaliser_telephone,
)

MIN_MEMBRES = 1
MAX_MEMBRES = 6

# Départements et filières (métiers) de l'ISEP Amadou Trawaré.
# ⚠ Garder synchronisé avec frontend/src/lib/filieres.js
FILIERES = {
    "TIC": [
        "Administration des Bases de Données",
        "Analyse de Performance Digitale",
        "Administration Systèmes, Sécurité et Cloud",
        "Réseaux, Sécurité et Internet des Objets (IoT)",
        "Développement Backend",
        "Développement Frontend",
    ],
    "Automobile": [
        "Technicien Supérieur en Électromécanique Automobile",
        "Technicien Supérieur en Électricité et Électronique Automobile",
        "Technicien Supérieur en Carrosserie et Peinture Automobile",
        "Technicien Supérieur en Froid et Climatisation",
    ],
}


class MembreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Membre
        fields = ["id", "nom", "prenom", "departement", "metier"]

    def validate(self, attrs):
        for champ in ("nom", "prenom", "departement", "metier"):
            attrs[champ] = attrs[champ].strip()
            if not attrs[champ]:
                raise serializers.ValidationError({champ: "Ce champ est obligatoire."})
        if attrs["departement"] not in FILIERES:
            raise serializers.ValidationError({"departement": "Choisissez TIC ou Automobile."})
        if attrs["metier"] not in FILIERES[attrs["departement"]]:
            raise serializers.ValidationError({"metier": "Cette filière n'appartient pas au département choisi."})
        return attrs


class InscriptionPubliqueSerializer(serializers.ModelSerializer):
    """Utilisé par le formulaire public : création uniquement."""

    membres = MembreSerializer(many=True)
    reference = serializers.CharField(read_only=True)
    email = serializers.EmailField(
        max_length=254,
        error_messages={"invalid": "Adresse e-mail invalide.", "required": "L'adresse e-mail est obligatoire.",
                        "blank": "L'adresse e-mail est obligatoire."},
    )

    class Meta:
        model = Inscription
        fields = ["id", "reference", "nom_groupe", "nom_projet", "email", "description_projet", "engagement", "membres"]
        read_only_fields = ["id", "reference"]

    def validate_email(self, value):
        return value.strip().lower()

    def validate_nom_groupe(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError("Le nom du groupe est trop court.")
        if Inscription.objects.filter(nom_groupe__iexact=value).exists():
            raise serializers.ValidationError("Un groupe porte déjà ce nom. Choisissez-en un autre.")
        return value

    def validate_nom_projet(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError("Le nom du projet est trop court.")
        return value

    def validate_description_projet(self, value):
        value = value.strip()
        if len(value) < 30:
            raise serializers.ValidationError("Décrivez le projet en au moins 30 caractères.")
        return value

    def validate_engagement(self, value):
        if value is not True:
            raise serializers.ValidationError("Le groupe doit s'engager pour valider l'inscription.")
        return value

    def validate_membres(self, value):
        if len(value) < MIN_MEMBRES:
            raise serializers.ValidationError("Ajoutez au moins un membre.")
        if len(value) > MAX_MEMBRES:
            raise serializers.ValidationError(f"Un groupe compte au maximum {MAX_MEMBRES} membres.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        membres = validated_data.pop("membres")
        inscription = Inscription.objects.create(date_engagement=timezone.now(), **validated_data)
        Membre.objects.bulk_create(Membre(inscription=inscription, **m) for m in membres)
        return inscription


class MembreAdminSerializer(serializers.ModelSerializer):
    """Membre vu par le back-office : genre corrigé par un admin, estimé, et effectif."""

    genre_estime = serializers.SerializerMethodField()
    genre_effectif = serializers.SerializerMethodField()
    nom_groupe = serializers.CharField(source="inscription.nom_groupe", read_only=True)

    class Meta:
        model = Membre
        fields = ["id", "nom", "prenom", "departement", "metier", "genre", "genre_estime", "genre_effectif",
                  "nom_groupe"]

    def get_genre_estime(self, obj):
        return estimer_genre(obj.prenom)

    def get_genre_effectif(self, obj):
        return genre_effectif(obj)


class InscriptionAdminSerializer(serializers.ModelSerializer):
    """Utilisé par la page d'administration : lecture + modification du statut / des notes."""

    membres = MembreAdminSerializer(many=True, read_only=True)
    reference = serializers.CharField(read_only=True)
    statut_libelle = serializers.CharField(source="get_statut_display", read_only=True)

    class Meta:
        model = Inscription
        fields = [
            "id", "reference", "nom_groupe", "nom_projet", "email", "description_projet",
            "engagement", "date_engagement", "statut", "statut_libelle", "notes_admin",
            "cree_le", "modifie_le", "acceptation_envoyee_le", "membres",
        ]
        read_only_fields = [
            "id", "reference", "nom_groupe", "nom_projet", "email", "description_projet",
            "engagement", "date_engagement", "cree_le", "modifie_le", "acceptation_envoyee_le",
        ]


class MembreGenreSerializer(MembreAdminSerializer):
    """Back-office : corriger le genre estimé d'un membre ("" = revenir à l'estimation)."""

    class Meta(MembreAdminSerializer.Meta):
        read_only_fields = ["id", "nom", "prenom", "departement", "metier", "nom_groupe"]


class ModeleEmailSerializer(serializers.ModelSerializer):
    """Back-office : consultation et personnalisation du modèle d'e-mail."""

    class Meta:
        model = ModeleEmail
        fields = [
            "id", "sujet", "introduction", "titre_rencontre",
            "texte_rencontre", "date_rencontre", "lieu_rencontre", "consigne", "modifie_le",
        ]
        read_only_fields = ["id", "modifie_le"]


SEL_JETON_VIDEO = "candidature-video-r2"


class CandidaturePostePublicSerializer(serializers.ModelSerializer):
    """Utilisé par le formulaire public pour postuler à un poste de gouvernance."""

    photo = serializers.ImageField(
        required=True,
        error_messages={"required": "La photo est obligatoire pour que les électeurs puissent vous identifier.",
                        "blank": "La photo est obligatoire."}
    )
    # Jeton signé renvoyé par /api/candidatures/video/autorisation/ après l'envoi direct vers R2.
    video_jeton = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = CandidaturePoste
        fields = [
            "id", "poste", "nom", "prenom", "email", "telephone",
            "departement", "metier", "niveau", "nom_projet",
            "profession_de_foi", "photo", "lien_video", "fichier_video", "video_jeton",
        ]
        read_only_fields = ["id"]

    def validate_video_jeton(self, value):
        if not value:
            return None
        try:
            # Jeton émis par le serveur il y a moins de 6 h : la clé ne peut pas être inventée.
            donnees = signing.loads(value, salt=SEL_JETON_VIDEO, max_age=6 * 3600)
        except signing.SignatureExpired:
            raise serializers.ValidationError("L'envoi de la vidéo a expiré. Choisissez à nouveau votre vidéo.")
        except signing.BadSignature:
            raise serializers.ValidationError("Vidéo invalide. Choisissez à nouveau votre vidéo.")
        if CandidaturePoste.objects.filter(video_r2_cle=donnees["cle"]).exists():
            raise serializers.ValidationError("Cette vidéo est déjà associée à une autre candidature.")
        return donnees

    def validate_email(self, value):
        val = value.strip().lower()
        typo = domaine_est_faute_frappe(val)
        if typo:
            domaine, suggestion = typo
            raise serializers.ValidationError(
                f"Vérifiez votre adresse e-mail : vouliez-vous écrire « @{suggestion} » au lieu de « @{domaine} » ?"
            )

        canon = normaliser_email_canonique(val)
        existants = CandidaturePoste.objects.values_list("email", flat=True)
        if any(normaliser_email_canonique(e) == canon for e in existants):
            raise serializers.ValidationError(
                "Une candidature a déjà été enregistrée avec cette adresse e-mail. Un candidat ne peut postuler qu'à un seul poste."
            )
        return val

    def validate_telephone(self, value):
        val = value.strip()
        tel_norm = normaliser_telephone(val)
        if len(tel_norm) < 8:
            raise serializers.ValidationError("Indiquez un numéro de téléphone valide (au moins 8 chiffres).")
        existants = CandidaturePoste.objects.values_list("telephone", flat=True)
        if any(normaliser_telephone(t) == tel_norm for t in existants):
            raise serializers.ValidationError(
                "Une candidature a déjà été enregistrée avec ce numéro de téléphone. Un candidat ne peut postuler qu'à un seul poste."
            )
        return val

    def validate_photo(self, value):
        # Limite à 6 Mo
        if value.size > 6 * 1024 * 1024:
            raise serializers.ValidationError("La photo ne doit pas dépasser 6 Mo.")
        return value

    def validate_fichier_video(self, value):
        if value and stockage_r2.configure():
            # Avec R2, les vidéos ne doivent jamais être stockées sur le disque du serveur.
            raise serializers.ValidationError(
                "Les vidéos sont désormais envoyées directement vers notre stockage. Rechargez la page et réessayez."
            )
        if value:
            # Limite à 25 Mo
            if value.size > 25 * 1024 * 1024:
                raise serializers.ValidationError("Le fichier vidéo ne doit pas dépasser 25 Mo.")
        return value

    def validate(self, attrs):
        for champ in ("nom", "prenom", "telephone", "departement", "metier", "profession_de_foi"):
            if champ in attrs and isinstance(attrs[champ], str):
                attrs[champ] = attrs[champ].strip()
                if not attrs[champ]:
                    raise serializers.ValidationError({champ: "Ce champ est obligatoire."})

        if len(attrs.get("profession_de_foi", "")) < 30:
            raise serializers.ValidationError({"profession_de_foi": "Votre profession de foi doit comporter au moins 30 caractères."})

        video = attrs.pop("video_jeton", None)
        if video:
            # Si le serveur peut joindre R2, on vérifie que la vidéo est bien arrivée et sa taille.
            # Sinon (PythonAnywhere gratuit), la taille est garantie par la signature de l'URL d'envoi.
            etat, taille = stockage_r2.verifier_objet(video["cle"])
            if etat == "absent":
                raise serializers.ValidationError(
                    {"video_jeton": "La vidéo n'a pas été reçue. Relancez son envoi avant de valider."})
            if etat == "ok" and taille > stockage_r2.taille_max():
                raise serializers.ValidationError({"video_jeton": "La vidéo dépasse la taille autorisée."})
            attrs["video_r2_cle"] = video["cle"]
            attrs["fichier_video"] = None

        return attrs


class CandidaturePosteAdminSerializer(serializers.ModelSerializer):
    """Utilisé par le back-office pour consulter et valider les candidatures."""

    poste_libelle = serializers.CharField(source="get_poste_display", read_only=True)
    statut_libelle = serializers.CharField(source="get_statut_display", read_only=True)
    # Lien de lecture temporaire (12 h) pour les vidéos stockées sur R2 : le bucket reste privé.
    video_url = serializers.SerializerMethodField()

    class Meta:
        model = CandidaturePoste
        fields = [
            "id", "poste", "poste_libelle", "nom", "prenom", "email", "telephone",
            "departement", "metier", "niveau", "nom_projet",
            "profession_de_foi", "photo", "lien_video", "fichier_video", "video_r2_cle", "video_url",
            "statut", "statut_libelle", "notes_admin", "cree_le", "modifie_le",
        ]
        read_only_fields = [
            "id", "poste_libelle", "statut_libelle", "video_r2_cle", "video_url", "cree_le", "modifie_le",
        ]
        # L'admin peut ajouter un candidat sans photo (ex. dossier reçu par WhatsApp) : initiales affichées.
        extra_kwargs = {"photo": {"required": False}}

    def validate_photo(self, value):
        if value and value.size > 6 * 1024 * 1024:
            raise serializers.ValidationError("La photo ne doit pas dépasser 6 Mo.")
        return value

    def get_video_url(self, obj):
        if obj.video_r2_cle and stockage_r2.configure():
            return stockage_r2.url_lecture(obj.video_r2_cle)
        return None

