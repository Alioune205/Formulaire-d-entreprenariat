from django.contrib import admin

from .models import Inscription, Membre


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
