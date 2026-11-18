import re

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .genre import estimer_genre, genre_effectif
from .models import CandidaturePoste, Inscription, Membre, ModeleEmail

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


TYPOS_DOMAINES = {
    "gamil.com": "gmail.com",
    "gmial.com": "gmail.com",
    "gmal.com": "gmail.com",
    "gmaill.com": "gmail.com",
    "gmail.con": "gmail.com",
    "gmail.cm": "gmail.com",
    "yaho.com": "yahoo.com",
    "yaho.fr": "yahoo.fr",
    "yahoo.con": "yahoo.com",
    "hotmal.com": "hotmail.com",
    "hotmial.com": "hotmail.com",
    "outlok.com": "outlook.com",
}


def normaliser_telephone(tel):
    """Conserve les chiffres ; normalise les numéros sénégalais (+221) sur 9 chiffres."""
    chiffres = re.sub(r"\D", "", str(tel or ""))
    if len(chiffres) > 9 and (chiffres.startswith("221") or chiffres.startswith("00221")):
        return chiffres[-9:]
    return chiffres


def normaliser_email_canonique(email):
    """Normalise un e-mail (et ignore les points/+tag sur Gmail)."""
    val = str(email or "").strip().lower()
    if "@" not in val:
        return val
    local, domaine = val.rsplit("@", 1)
    if domaine in ("gmail.com", "googlemail.com"):
        local = local.split("+", 1)[0].replace(".", "")
        domaine = "gmail.com"
    return f"{local}@{domaine}"


class CandidaturePostePublicSerializer(serializers.ModelSerializer):
    """Utilisé par le formulaire public pour postuler à un poste de gouvernance."""

    photo = serializers.ImageField(
        required=True,
        error_messages={"required": "La photo est obligatoire pour que les électeurs puissent vous identifier.",
                        "blank": "La photo est obligatoire."}
    )

    class Meta:
        model = CandidaturePoste
        fields = [
            "id", "poste", "nom", "prenom", "email", "telephone",
            "departement", "metier", "niveau", "nom_projet",
            "profession_de_foi", "photo", "lien_video", "fichier_video",
        ]
        read_only_fields = ["id"]

    def validate_email(self, value):
        val = value.strip().lower()
        if "@" in val:
            domaine = val.rsplit("@", 1)[1]
            if domaine in TYPOS_DOMAINES:
                raise serializers.ValidationError(
                    f"Vérifiez votre adresse e-mail : vouliez-vous écrire « @{TYPOS_DOMAINES[domaine]} » au lieu de « @{domaine} » ?"
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

        return attrs


class CandidaturePosteAdminSerializer(serializers.ModelSerializer):
    """Utilisé par le back-office pour consulter et valider les candidatures."""

    poste_libelle = serializers.CharField(source="get_poste_display", read_only=True)
    statut_libelle = serializers.CharField(source="get_statut_display", read_only=True)

    class Meta:
        model = CandidaturePoste
        fields = [
            "id", "poste", "poste_libelle", "nom", "prenom", "email", "telephone",
            "departement", "metier", "niveau", "nom_projet",
            "profession_de_foi", "photo", "lien_video", "fichier_video",
            "statut", "statut_libelle", "notes_admin", "cree_le", "modifie_le",
        ]
        read_only_fields = [
            "id", "poste_libelle", "statut_libelle", "cree_le", "modifie_le",
        ]

