from django.conf import settings
from django.contrib import admin
from django.urls import include, path

admin.site.site_header = settings.ADMIN_SITE_HEADER
admin.site.site_title = "Administration CIAT"
admin.site.index_title = "Gestion des inscriptions"

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/", include("inscriptions.urls")),
]
