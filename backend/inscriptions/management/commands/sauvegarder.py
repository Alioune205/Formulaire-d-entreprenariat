"""Sauvegarde à chaud de la base SQLite : python manage.py sauvegarder

Utilise l'API de sauvegarde de SQLite : la copie est cohérente même si des inscriptions
arrivent pendant l'opération. Conserve les N dernières sauvegardes.
"""
import sqlite3
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = "Sauvegarde la base de données dans backend/sauvegardes/ (garde les 14 dernières)."

    def add_arguments(self, parser):
        parser.add_argument("--garder", type=int, default=14, help="Nombre de sauvegardes à conserver.")

    def handle(self, *args, garder, **options):
        source = Path(settings.DATABASES["default"]["NAME"])
        dossier = Path(settings.BASE_DIR) / "sauvegardes"
        dossier.mkdir(exist_ok=True)
        cible = dossier / f"db-{timezone.localtime():%Y-%m-%d_%Hh%M}.sqlite3"

        with sqlite3.connect(source) as src, sqlite3.connect(cible) as dst:
            src.backup(dst)
        # Vérifie que la copie est lisible.
        with sqlite3.connect(cible) as dst:
            nb = dst.execute("SELECT COUNT(*) FROM inscriptions_inscription").fetchone()[0]

        anciennes = sorted(dossier.glob("db-*.sqlite3"))[:-garder]
        for f in anciennes:
            f.unlink()

        self.stdout.write(self.style.SUCCESS(
            f"Sauvegarde créée : {cible.name} ({nb} inscription(s)). "
            f"{len(anciennes)} ancienne(s) sauvegarde(s) supprimée(s)."
        ))
