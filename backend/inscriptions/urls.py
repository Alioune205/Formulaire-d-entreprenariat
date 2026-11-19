from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("admin/inscriptions", views.InscriptionAdminViewSet, basename="admin-inscriptions")
router.register("admin/membres", views.MembreAdminViewSet, basename="admin-membres")
router.register("admin/candidatures", views.CandidaturePosteAdminViewSet, basename="admin-candidatures")

urlpatterns = [
    path("inscriptions/", views.InscriptionPubliqueView.as_view(), name="inscription-publique"),
    path("candidatures/", views.CandidaturePostePubliqueView.as_view(), name="candidature-publique"),
    path("candidatures/postes/", views.liste_postes_disponibles, name="candidatures-postes"),
    path("infos/", views.infos_publiques, name="infos-publiques"),
    path("suivi/", views.suivi_dossier, name="suivi-dossier"),
    path("recuperation/demande/", views.recuperation_demande, name="recuperation-demande"),
    path("recuperation/verification/", views.recuperation_verification, name="recuperation-verification"),
    path("admin/connexion/", views.connexion_admin, name="admin-connexion"),
    path("admin/deconnexion/", views.deconnexion_admin, name="admin-deconnexion"),
    path("admin/parametres/", views.parametres_plateforme, name="admin-parametres"),
    path("admin/diffusion-whatsapp/", views.diffusion_whatsapp, name="admin-diffusion-whatsapp"),
    path("admin/diffusion-whatsapp/apercu/", views.apercu_diffusion_whatsapp, name="admin-diffusion-whatsapp-apercu"),
    path("", include(router.urls)),
]
