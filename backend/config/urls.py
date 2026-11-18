from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve

admin.site.site_header = settings.ADMIN_SITE_HEADER
admin.site.site_title = "Administration CIAT"
admin.site.index_title = "Gestion des inscriptions"

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/", include("inscriptions.urls")),
    re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
]
