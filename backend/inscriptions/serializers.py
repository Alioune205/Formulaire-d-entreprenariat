from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .genre import estimer_genre, genre_effectif
from .models import Inscription, Membre

MIN_MEMBRES = 3
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
            raise serializers.ValidationError(f"Un groupe compte au minimum {MIN_MEMBRES} membres.")
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

    class Meta:
        model = Membre
        fields = ["id", "nom", "prenom", "departement", "metier", "genre", "genre_estime", "genre_effectif"]

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
        read_only_fields = ["id", "nom", "prenom", "departement", "metier"]
