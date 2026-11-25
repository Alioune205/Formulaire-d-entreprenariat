from django.contrib import admin

from .models import (
    CandidaturePoste, CompteurVoix, Emargement, EnvoiDiffusion, HorairesVote, Inscription, Membre, ModeleEmail,
    ModificationHorairesVote, ParametresPlateforme,
)


class MembreInline(admin.TabularInline):
    model = Membre
    extra = 0


@admin.register(Inscription)
class InscriptionAdmin(admin.ModelAdmin):
    list_display = ("reference", "nom_groupe", "nom_projet", "email", "nb_membres", "statut", "engagement", "cree_le")
    list_filter = ("statut", "engagement", "cree_le")
    list_editable = ("statut",)
    search_fields = ("reference", "nom_groupe", "nom_projet", "email",
                     "membres__nom", "membres__prenom", "membres__departement")
    readonly_fields = ("reference", "cree_le", "modifie_le", "date_engagement")
    inlines = [MembreInline]

    @admin.display(description="membres")
    def nb_membres(self, obj):
        return obj.membres.count()


@admin.register(ModeleEmail)
class ModeleEmailAdmin(admin.ModelAdmin):
    list_display = ("sujet", "titre_rencontre", "date_rencontre", "lieu_rencontre", "modifie_le")


@admin.register(CandidaturePoste)
class CandidaturePosteAdmin(admin.ModelAdmin):
    list_display = ("prenom", "nom", "poste", "email", "telephone", "departement", "statut", "cree_le")
    list_filter = ("poste", "statut", "departement", "cree_le")
    list_editable = ("statut",)
    search_fields = ("nom", "prenom", "email", "telephone", "departement", "metier", "profession_de_foi")
    readonly_fields = ("cree_le", "modifie_le")


@admin.register(ParametresPlateforme)
class ParametresPlateformeAdmin(admin.ModelAdmin):
    list_display = ("inscriptions_ouvertes", "modifie_le")


@admin.register(EnvoiDiffusion)
class EnvoiDiffusionAdmin(admin.ModelAdmin):
    list_display = ("canal", "email_brut", "nom_destinataire", "envoye_le")
    list_filter = ("canal", "envoye_le")
    search_fields = ("email_brut", "email_canonique", "nom_destinataire")



@admin.register(Emargement)
class EmargementAdmin(admin.ModelAdmin):
    """Liste d'émargement : qui a voté et quand. Ne contient jamais le choix de vote."""
    list_display = ("nom_complet", "email_saisi", "recu", "vote_le")
    search_fields = ("nom_complet", "email_saisi", "recu")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(CompteurVoix)
class CompteurVoixAdmin(admin.ModelAdmin):
    """Urne : lecture seule, pour éviter toute modification manuelle des voix."""
    list_display = ("poste", "choix", "candidature", "voix")
    list_filter = ("poste",)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(HorairesVote)
class HorairesVoteAdmin(admin.ModelAdmin):
    """À modifier de préférence depuis l'onglet « Vote & résultats » du site (modification journalisée)."""
    list_display = ("debut", "fin", "modifie_le")


@admin.register(ModificationHorairesVote)
class ModificationHorairesVoteAdmin(admin.ModelAdmin):
    """Journal des changements d'horaires : lecture seule."""
    list_display = ("le", "par", "debut_apres", "fin_apres", "motif")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
