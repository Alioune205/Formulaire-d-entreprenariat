"""E-mails envoyés aux groupes (HTML aux couleurs du CIAT + version texte).

Un échec d'envoi est journalisé sans bloquer la requête, sauf pour le code de vérification
(sans lui, la récupération est impossible).
"""
import logging
from email.mime.image import MIMEImage
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlencode

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

from .models import CodeVerification

logger = logging.getLogger(__name__)

LOGO = Path(__file__).resolve().parent / "assets" / "logo-email.png"
SIGNATURE = "\n\n— L'équipe du Club d'Entrepreneuriat\nCIAT · ISEP Amadou Trawaré"


@lru_cache(maxsize=1)
def _logo_octets():
    return LOGO.read_bytes()


def apres_reponse(response, fonction, *args):
    """Exécute `fonction(*args)` une fois la réponse transmise au visiteur.

    Le serveur WSGI (uWSGI sur PythonAnywhere) appelle response.close() après avoir envoyé
    la réponse : le visiteur n'attend donc pas Gmail (1 à 3 s). Les erreurs sont journalisées.
    """
    def lancer():
        try:
            fonction(*args)
        except Exception:  # noqa: BLE001
            logger.exception("Échec de l'envoi différé (%s)", fonction.__name__)

    response._resource_closers.append(lancer)
    return response


def lien_suivi(dossier):
    params = urlencode({"ref": dossier.reference, "groupe": dossier.nom_groupe})
    return f"{settings.FRONTEND_URL.rstrip('/')}/suivi?{params}"


def _envoyer(destinataire, sujet, texte, gabarit, contexte):
    """Envoie un e-mail multipart : texte brut + HTML, avec le logo intégré (cid:logo-ciat)."""
    html = render_to_string(gabarit, {"sujet": sujet, **contexte})
    msg = EmailMultiAlternatives(sujet, texte + SIGNATURE, None, [destinataire])
    msg.attach_alternative(html, "text/html")
    msg.mixed_subtype = "related"  # le logo fait partie du message, ce n'est pas une pièce jointe
    logo = MIMEImage(_logo_octets(), "png")
    logo.add_header("Content-ID", "<logo-ciat>")
    logo.add_header("Content-Disposition", "inline", filename="logo-ciat.png")
    msg.attach(logo)
    msg.send(fail_silently=False)


def envoyer_confirmation(inscription):
    lien = lien_suivi(inscription)
    try:
        _envoyer(
            inscription.email,
            f"Inscription confirmée — {inscription.nom_groupe}",
            f"Bonjour,\n\nLe groupe « {inscription.nom_groupe} » (projet {inscription.nom_projet}) "
            f"est bien inscrit au Club d'Entrepreneuriat.\n\n"
            f"Votre référence de dossier : {inscription.reference}\n\n"
            f"Conservez-la : avec le nom du groupe, elle permet de suivre votre dossier.\n{lien}",
            "emails/confirmation.html",
            {
                "apercu": f"Votre référence : {inscription.reference}",
                "surtitre": "Inscription confirmée",
                "titre": "Bienvenue au Club d'Entrepreneuriat !",
                "dossier": inscription,
                "lien_suivi": lien,
            },
        )
    except Exception:  # noqa: BLE001 — l'inscription reste valide même si l'e-mail échoue
        logger.exception("Échec de l'e-mail de confirmation pour l'inscription %s", inscription.pk)


def envoyer_code(email, code):
    minutes = int(CodeVerification.DUREE_VALIDITE.total_seconds() // 60)
    _envoyer(
        email,
        f"Votre code de vérification : {code}",
        f"Bonjour,\n\nVous avez demandé à récupérer la référence de votre dossier.\n\n"
        f"Votre code de vérification : {code}\n\n"
        f"Il est valable {minutes} minutes. Si vous n'êtes pas à l'origine de cette demande, "
        "ignorez simplement cet e-mail : votre référence actuelle reste valable.",
        "emails/code.html",
        {
            "apercu": f"Code valable {minutes} minutes. Ne le partagez avec personne.",
            "surtitre": "Récupération de référence",
            "titre": "Votre code de vérification",
            "code": code,
            "minutes": minutes,
        },
    )


def envoyer_alerte_regeneration(email, inscriptions):
    groupes = "\n".join(f"• {i.nom_groupe} (projet {i.nom_projet}) : {i.reference}" for i in inscriptions)
    try:
        _envoyer(
            email,
            "Votre nouvelle référence de dossier",
            "Bonjour,\n\nUne nouvelle référence vient d'être générée après vérification de votre adresse e-mail :\n"
            f"{groupes}\n\nNotez-la bien : l'ancienne référence ne fonctionne plus. "
            "Si vous n'êtes pas à l'origine de cette opération, contactez l'équipe du club.",
            "emails/regeneration.html",
            {
                "apercu": "Notez-la bien : l'ancienne référence ne fonctionne plus.",
                "surtitre": "Nouvelle référence",
                "titre": "Voici votre nouvelle référence",
                "dossiers": inscriptions,
                "lien_suivi": lien_suivi(inscriptions[0]),
            },
        )
    except Exception:  # noqa: BLE001
        logger.exception("Échec de l'e-mail d'alerte de régénération pour %s", email)
