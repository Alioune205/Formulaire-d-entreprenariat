import secrets
from datetime import timedelta

from django.contrib.auth.hashers import check_password, make_password
from django.db import models
from django.utils import timezone

# Sans 0/O ni 1/I/L pour éviter les confusions à la lecture.
ALPHABET_REFERENCE = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


def generer_reference():
    """Référence aléatoire et unique, ex. CIAT-2026-7KQ4MZ."""
    annee = timezone.localdate().year
    while True:
        suffixe = "".join(secrets.choice(ALPHABET_REFERENCE) for _ in range(6))
        reference = f"CIAT-{annee}-{suffixe}"
        if not Inscription.objects.filter(reference=reference).exists():
            return reference


class Inscription(models.Model):
    """Inscription d'un groupe (équipe projet) au Club d'Entrepreneuriat."""

    class Statut(models.TextChoices):
        EN_ATTENTE = "EN_ATTENTE", "En attente"
        ENTRETIEN = "ENTRETIEN", "Convoqué en entretien"
        ACCEPTE = "ACCEPTE", "Accepté"
        REJETE = "REJETE", "Rejeté"

    reference = models.CharField("référence", max_length=32, unique=True, editable=False)
    nom_groupe = models.CharField("nom du groupe", max_length=120)
    nom_projet = models.CharField("nom du projet", max_length=150)
    email = models.EmailField(
        "e-mail du responsable",
        blank=True,  # vide uniquement pour les inscriptions antérieures à ce champ
        help_text="Sert à récupérer la référence du dossier en cas d'oubli.",
    )
    description_projet = models.TextField("description du projet")
    engagement = models.BooleanField(
        "engagement accepté",
        default=False,
        help_text="Le groupe s'est engagé à respecter la charte du club.",
    )
    date_engagement = models.DateTimeField("date d'engagement", null=True, blank=True)

    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.EN_ATTENTE)
    notes_admin = models.TextField("notes internes", blank=True)
    acceptation_envoyee_le = models.DateTimeField(
        "e-mail d'acceptation envoyé le", null=True, blank=True,
        help_text="Évite d'envoyer deux fois l'e-mail de félicitations.",
    )
    cree_le = models.DateTimeField("inscrit le", auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-cree_le"]
        verbose_name = "inscription"
        verbose_name_plural = "inscriptions"

    def __str__(self):
        return f"{self.nom_groupe} — {self.nom_projet}"

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = generer_reference()
        super().save(*args, **kwargs)

    def regenerer_reference(self):
        """Remplace la référence : l'ancienne ne fonctionne plus."""
        self.reference = generer_reference()
        self.save(update_fields=["reference", "modifie_le"])
        return self.reference


class Membre(models.Model):
    """Membre d'un groupe inscrit."""

    class Genre(models.TextChoices):
        FILLE = "F", "Fille"
        GARCON = "H", "Garçon"

    inscription = models.ForeignKey(Inscription, on_delete=models.CASCADE, related_name="membres")
    nom = models.CharField(max_length=80)
    prenom = models.CharField("prénom", max_length=80)
    # Correction saisie par un admin dans le back-office. Vide = on utilise l'estimation
    # à partir du prénom (voir genre.py). Jamais demandé dans le formulaire public.
    genre = models.CharField(max_length=1, choices=Genre.choices, blank=True)
    departement = models.CharField("département", max_length=120)
    metier = models.CharField("métier", max_length=120)

    class Meta:
        ordering = ["id"]
        verbose_name = "membre"

    def __str__(self):
        return f"{self.prenom} {self.nom}"


class CodeVerification(models.Model):
    """Code à 6 chiffres envoyé par e-mail pour récupérer une référence oubliée."""

    DUREE_VALIDITE = timedelta(minutes=15)
    MAX_TENTATIVES = 5
    MAX_CODES_PAR_HEURE = 3  # par adresse e-mail : évite d'inonder une boîte mail de codes

    @classmethod
    def quota_atteint(cls, email):
        depuis = timezone.now() - timedelta(hours=1)
        return cls.objects.filter(email=email, cree_le__gte=depuis).count() >= cls.MAX_CODES_PAR_HEURE

    email = models.EmailField(db_index=True)
    code_hache = models.CharField(max_length=128)  # jamais stocké en clair
    cree_le = models.DateTimeField(auto_now_add=True)
    expire_le = models.DateTimeField()
    tentatives = models.PositiveSmallIntegerField(default=0)
    utilise = models.BooleanField(default=False)

    class Meta:
        ordering = ["-cree_le"]
        verbose_name = "code de vérification"
        verbose_name_plural = "codes de vérification"

    @classmethod
    def creer(cls, email):
        """Invalide les anciens codes de cet e-mail et en crée un nouveau. Renvoie le code en clair."""
        cls.objects.filter(email=email, utilise=False).update(utilise=True)
        code = f"{secrets.randbelow(1_000_000):06d}"
        cls.objects.create(
            email=email,
            code_hache=make_password(code),
            expire_le=timezone.now() + cls.DUREE_VALIDITE,
        )
        return code

    @property
    def valide(self):
        return not self.utilise and self.tentatives < self.MAX_TENTATIVES and timezone.now() < self.expire_le

    def verifier(self, code):
        """Vérifie le code ; compte la tentative et consomme le code en cas de succès."""
        if not self.valide:
            return False
        if check_password(code, self.code_hache):
            self.utilise = True
            self.save(update_fields=["utilise"])
            return True
        self.tentatives += 1
        self.save(update_fields=["tentatives"])
        return False


DEFAUT_SUJET = "Félicitations — Votre projet « {nom_projet} » est retenu au Club d'Entrepreneuriat du CIAT"
DEFAUT_INTRO = (
    "Félicitations ! Nous avons le plaisir de vous informer que le projet « {nom_projet} », présenté par "
    "le groupe « {nom_groupe} », a été retenu pour intégrer le Club d'Entrepreneuriat du "
    "Centre d'Innovation, d'Application et de Transfert (CIAT) de l'ISEP Amadou Trawaré pour l'année 2026-2027."
)
DEFAUT_TITRE_RENCONTRE = "Rencontre avec les groupes"
DEFAUT_TEXTE_RENCONTRE = (
    "L'ensemble des groupes retenus est convié à une rencontre afin d'échanger avec l'équipe du CIAT "
    "et de présenter le programme d'accompagnement."
)
DEFAUT_DATE_RENCONTRE = "Mercredi 18 novembre 2026 à 13h00"
DEFAUT_LIEU_RENCONTRE = "À l'Amphi (ISEP Amadou Trawaré)"
DEFAUT_CONSIGNE = (
    "Nous vous invitons à préparer une courte présentation de votre projet (deux minutes environ) "
    "en vue de cette rencontre."
)


class ModeleEmail(models.Model):
    """Modèle d'e-mail de félicitations / rencontre personnalisable depuis l'interface admin."""

    sujet = models.CharField("objet de l'e-mail", max_length=250, default=DEFAUT_SUJET)
    introduction = models.TextField("message d'introduction", default=DEFAUT_INTRO)
    titre_rencontre = models.CharField("titre de la rencontre", max_length=150, blank=True, default=DEFAUT_TITRE_RENCONTRE)
    texte_rencontre = models.TextField("description de la rencontre", blank=True, default=DEFAUT_TEXTE_RENCONTRE)
    date_rencontre = models.CharField("date et heure", max_length=120, blank=True, default=DEFAUT_DATE_RENCONTRE)
    lieu_rencontre = models.CharField("lieu", max_length=150, blank=True, default=DEFAUT_LIEU_RENCONTRE)
    consigne = models.TextField("consigne de préparation", blank=True, default=DEFAUT_CONSIGNE)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "modèle d'e-mail"
        verbose_name_plural = "modèles d'e-mails"

    def __str__(self):
        return f"Modèle d'e-mail CIAT (mis à jour le {self.modifie_le})"

    @classmethod
    def obtenir(cls):
        try:
            obj, _ = cls.objects.get_or_create(id=1)
            return obj
        except Exception:
            return cls(
                id=1,
                sujet=DEFAUT_SUJET,
                introduction=DEFAUT_INTRO,
                titre_rencontre=DEFAUT_TITRE_RENCONTRE,
                texte_rencontre=DEFAUT_TEXTE_RENCONTRE,
                date_rencontre=DEFAUT_DATE_RENCONTRE,
                lieu_rencontre=DEFAUT_LIEU_RENCONTRE,
                consigne=DEFAUT_CONSIGNE,
            )

    def reinitialiser(self):
        self.sujet = DEFAUT_SUJET
        self.introduction = DEFAUT_INTRO
        self.titre_rencontre = DEFAUT_TITRE_RENCONTRE
        self.texte_rencontre = DEFAUT_TEXTE_RENCONTRE
        self.date_rencontre = DEFAUT_DATE_RENCONTRE
        self.lieu_rencontre = DEFAUT_LIEU_RENCONTRE
        self.consigne = DEFAUT_CONSIGNE
        self.save()
        return self


class CandidaturePoste(models.Model):
    """Candidature d'un étudiant à un poste de gouvernance ou de chef de cellule du club."""

    class Categorie(models.TextChoices):
        BUREAU = "BUREAU", "Bureau Exécutif"
        CELLULE = "CELLULE", "Cellules Thématiques"

    class Poste(models.TextChoices):
        # Bureau exécutif
        PRESIDENT = "PRESIDENT", "Président(e)"
        VICE_PRESIDENT = "VICE_PRESIDENT", "Vice-Président(e)"
        SECRETAIRE_GENERAL = "SECRETAIRE_GENERAL", "Secrétaire Général(e)"
        TRESORIER = "TRESORIER", "Trésorier(ère)"
        RESPONSABLE_COMMUNICATION = "RESPONSABLE_COMMUNICATION", "Responsable Communication"
        RESPONSABLE_EVENEMENTIEL = "RESPONSABLE_EVENEMENTIEL", "Responsable Événementiel"
        RESPONSABLE_PARTENARIAT = "RESPONSABLE_PARTENARIAT", "Responsable Partenariats"
        RESPONSABLE_PEDAGOGIE = "RESPONSABLE_PEDAGOGIE", "Responsable Pédagogie & Formation"
        # Chefs de cellules thématiques
        CHEF_CELLULE_TIC = "CHEF_CELLULE_TIC", "Chef de Cellule TIC"
        CHEF_CELLULE_AUTOMOBILE = "CHEF_CELLULE_AUTOMOBILE", "Chef de Cellule Automobile"
        CHEF_CELLULE_ENERGIE = "CHEF_CELLULE_ENERGIE", "Chef de Cellule Énergie"
        CHEF_CELLULE_SANTE = "CHEF_CELLULE_SANTE", "Chef de Cellule Santé"
        CHEF_CELLULE_FEMMES = "CHEF_CELLULE_FEMMES", "Chef de Cellule Femmes & Entrepreneuriat"

    class Statut(models.TextChoices):
        EN_ATTENTE = "EN_ATTENTE", "En attente de validation"
        VALIDE = "VALIDE", "Candidature validée pour l'élection"
        REJETE = "REJETE", "Non retenue"
        ELU = "ELU", "Élu(e)"

    poste = models.CharField("poste brigué", max_length=40, choices=Poste.choices, db_index=True)
    nom = models.CharField("nom", max_length=80)
    prenom = models.CharField("prénom", max_length=80)
    email = models.EmailField(
        "e-mail",
        unique=True,
        help_text="Un candidat ne peut postuler qu'à un seul poste avec son e-mail.",
    )
    telephone = models.CharField("téléphone", max_length=30)
    departement = models.CharField("département", max_length=120)
    metier = models.CharField("métier / filière", max_length=120)
    niveau = models.CharField("niveau d'études", max_length=50, blank=True)
    nom_projet = models.CharField("groupe ou projet au club (optionnel)", max_length=150, blank=True)
    profession_de_foi = models.TextField("profession de foi / vision pour le poste")

    # Photo obligatoire pour que les électeurs identifient le candidat avant le vote
    photo = models.ImageField("photo officielle du candidat", upload_to="candidatures/photos/")

    # Vidéo de campagne : soit un lien externe (Drive, YouTube, etc.), soit un court fichier
    lien_video = models.URLField("lien vidéo de présentation", blank=True, max_length=500)
    fichier_video = models.FileField("fichier vidéo court", upload_to="candidatures/videos/", blank=True, null=True)

    statut = models.CharField(
        "statut de candidature",
        max_length=20,
        choices=Statut.choices,
        default=Statut.EN_ATTENTE,
        db_index=True,
    )
    notes_admin = models.TextField("notes internes du jury", blank=True)

    cree_le = models.DateTimeField("date de candidature", auto_now_add=True)
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["poste", "nom", "prenom"]
        verbose_name = "candidature à la gouvernance"
        verbose_name_plural = "candidatures à la gouvernance"

    def __str__(self):
        return f"{self.prenom} {self.nom} — {self.get_poste_display()}"


class ParametresPlateforme(models.Model):
    """Paramètres globaux de la plateforme modifiables depuis le back-office."""

    inscriptions_ouvertes = models.BooleanField(
        "inscriptions ouvertes",
        default=True,
        help_text="Active ou ferme immédiatement les inscriptions de projets sur le site.",
    )
    modifie_le = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "paramètres de la plateforme"
        verbose_name_plural = "paramètres de la plateforme"

    def __str__(self):
        etat = "Ouvertes" if self.inscriptions_ouvertes else "Fermées"
        return f"Plateforme CIAT — Inscriptions : {etat}"

    @classmethod
    def obtenir(cls):
        obj, _ = cls.objects.get_or_create(id=1, defaults={"inscriptions_ouvertes": True})
        return obj

