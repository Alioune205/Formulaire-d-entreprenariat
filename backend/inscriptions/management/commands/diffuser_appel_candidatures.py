"""Commande Django pour diffuser l'appel à candidatures avec l'affiche à TOUS les e-mails de la plateforme.

Usage :
    python manage.py diffuser_appel_candidatures
    python manage.py diffuser_appel_candidatures --dry-run
    python manage.py diffuser_appel_candidatures --limite 10
"""
import time
from django.core.mail import get_connection
from django.core.management.base import BaseCommand
from inscriptions.emails import (
    collecter_tous_destinataires_plateforme,
    envoyer_appel_candidatures,
)
from inscriptions.models import EnvoiDiffusion


class Command(BaseCommand):
    help = "Envoie l'e-mail officiel avec le flyer d'appel à candidatures à tous les contacts uniques de la plateforme."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Affiche la liste des destinataires sans envoyer d'e-mails.",
        )
        parser.add_argument(
            "--limite",
            type=int,
            default=None,
            help="Limite le nombre d'e-mails à envoyer pour ce passage.",
        )
        parser.add_argument(
            "--pause",
            type=float,
            default=0.3,
            help="Pause en secondes entre deux envois (défaut : 0.3 s).",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        limite = options["limite"]
        pause = options["pause"]

        self.stdout.write(self.style.NOTICE("--- Collecte des destinataires uniques de la plateforme ---"))
        collecte = collecter_tous_destinataires_plateforme()

        total = len(collecte["tous"])
        deja = collecte["deja_envoyes_count"]
        restants = collecte["restants"]

        self.stdout.write(f"Destinataires uniques identifiés : {total}")
        self.stdout.write(f"E-mails déjà envoyés précédemment : {deja}")
        self.stdout.write(f"Restants à envoyer : {len(restants)}")

        if dry_run:
            self.stdout.write(self.style.WARNING("\n[MODE DRY-RUN] Aucun e-mail ne sera envoyé."))
            for i, d in enumerate(restants, 1):
                self.stdout.write(f"  {i:3d}. {d['nom']} <{d['email']}> ({d['source']})")
            return

        if not restants:
            self.stdout.write(self.style.SUCCESS("Tous les contacts ont déjà reçu l'e-mail. Aucun doublon à envoyer."))
            return

        a_traiter = restants[:limite] if limite else restants
        self.stdout.write(self.style.NOTICE(f"\nDébut de l'envoi vers {len(a_traiter)} destinataire(s)..."))

        succes = 0
        echecs = 0

        connexion = get_connection()
        try:
            connexion.open()
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Impossible d'ouvrir la connexion SMTP : {e}"))
            return

        try:
            for index, d in enumerate(a_traiter, 1):
                email = d["email"]
                nom = d["nom"]
                salutation = d["salutation"]
                canonique = d["email_canonique"]
                tel = d["telephone_normalise"]

                try:
                    envoyer_appel_candidatures(email, salutation, connection=connexion)
                    EnvoiDiffusion.objects.get_or_create(
                        canal="ELECTIONS_APPEL",
                        email_canonique=canonique,
                        defaults={
                            "email_brut": email,
                            "nom_destinataire": nom[:160],
                            "telephone_normalise": tel,
                        },
                    )
                    succes += 1
                    self.stdout.write(self.style.SUCCESS(f"[{index}/{len(a_traiter)}] OK -> {nom} <{email}>"))
                except Exception as err:
                    echecs += 1
                    self.stderr.write(self.style.ERROR(f"[{index}/{len(a_traiter)}] ERREUR -> {email} : {err}"))

                if pause > 0:
                    time.sleep(pause)
        finally:
            try:
                connexion.close()
            except Exception:
                pass

        self.stdout.write("\n" + "=" * 50)
        self.stdout.write(self.style.SUCCESS(f"Fin de la diffusion : {succes} envoyé(s) avec succès, {echecs} échec(s)."))
        if len(restants) > len(a_traiter):
            self.stdout.write(self.style.NOTICE(f"Il reste encore {len(restants) - len(a_traiter)} e-mail(s) en attente."))
