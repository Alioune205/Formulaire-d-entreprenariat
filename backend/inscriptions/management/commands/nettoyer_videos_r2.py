"""Supprime de Cloudflare R2 les vidéos « orphelines » (envoyées mais jamais rattachées à une
candidature : formulaire abandonné, candidature supprimée…).

    python manage.py nettoyer_videos_r2              # affiche seulement ce qui serait supprimé
    python manage.py nettoyer_videos_r2 --supprimer  # supprime réellement

Nécessite que le serveur puisse joindre R2 (compte payant PythonAnywhere, ou exécution depuis
un ordinateur qui utilise la même base de données). Les vidéos de moins de 24 h sont ignorées :
un candidat peut être en train de remplir son formulaire.
"""
import datetime as dt

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from inscriptions import stockage_r2
from inscriptions.models import CandidaturePoste


class Command(BaseCommand):
    help = "Liste (et supprime avec --supprimer) les vidéos R2 non rattachées à une candidature."

    def add_arguments(self, parser):
        parser.add_argument("--supprimer", action="store_true", help="Supprimer réellement les orphelines.")
        parser.add_argument("--age-heures", type=int, default=24, help="Âge minimal d'une orpheline (défaut 24 h).")

    def handle(self, *args, supprimer, age_heures, **options):
        if not stockage_r2.configure():
            raise CommandError("R2 n'est pas configuré (variables R2_* du fichier .env).")
        utilisees = set(CandidaturePoste.objects.exclude(video_r2_cle="").values_list("video_r2_cle", flat=True))
        limite = timezone.now() - dt.timedelta(hours=age_heures)
        try:
            objets = list(stockage_r2.lister_objets())
        except Exception as e:  # noqa: BLE001
            raise CommandError(f"Impossible de joindre R2 depuis cette machine : {e}") from e

        orphelines = [(c, t) for c, t, d in objets if c not in utilisees and d < limite]
        total = sum(t for _, t in objets)
        self.stdout.write(f"{len(objets)} vidéo(s) sur R2 ({total / 1e6:.1f} Mo), "
                          f"{len(utilisees)} rattachée(s) à une candidature, {len(orphelines)} orpheline(s).")
        for cle, taille in orphelines:
            if supprimer:
                ok = stockage_r2.supprimer_objet(cle)
                self.stdout.write(f"  {'supprimée' if ok else 'ÉCHEC'} : {cle} ({taille / 1e6:.1f} Mo)")
            else:
                self.stdout.write(f"  à supprimer : {cle} ({taille / 1e6:.1f} Mo)")
        if orphelines and not supprimer:
            self.stdout.write(self.style.WARNING("Rien n'a été supprimé. Relancez avec --supprimer pour confirmer."))
