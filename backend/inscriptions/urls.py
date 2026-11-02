from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("admin/inscriptions", views.InscriptionAdminViewSet, basename="admin-inscriptions")

urlpatterns = [
    path("inscriptions/", views.InscriptionPubliqueView.as_view(), name="inscription-publique"),
    path("infos/", views.infos_publiques, name="infos-publiques"),
    path("suivi/", views.suivi_dossier, name="suivi-dossier"),
    path("recuperation/demande/", views.recuperation_demande, name="recuperation-demande"),
    path("recuperation/verification/", views.recuperation_verification, name="recuperation-verification"),
    path("admin/connexion/", views.connexion_admin, name="admin-connexion"),
    path("admin/deconnexion/", views.deconnexion_admin, name="admin-deconnexion"),
    path("", include(router.urls)),
]
