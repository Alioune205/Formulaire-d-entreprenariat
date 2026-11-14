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


def _construire(destinataire, sujet, texte, gabarit, contexte, connection=None):
    """Construit un e-mail multipart : texte brut + HTML, avec le logo intégré (cid:logo-ciat)."""
    html = render_to_string(gabarit, {"sujet": sujet, **contexte})
    msg = EmailMultiAlternatives(sujet, texte + SIGNATURE, None, [destinataire], connection=connection)
    msg.attach_alternative(html, "text/html")
    msg.mixed_subtype = "related"  # le logo fait partie du message, ce n'est pas une pièce jointe
    logo = MIMEImage(_logo_octets(), "png")
    logo.add_header("Content-ID", "<logo-ciat>")
    logo.add_header("Content-Disposition", "inline", filename="logo-ciat.png")
    msg.attach(logo)
    return msg


def _envoyer(destinataire, sujet, texte, gabarit, contexte, connection=None):
    _construire(destinataire, sujet, texte, gabarit, contexte, connection).send(fail_silently=False)


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


# --- E-mail de félicitations (projet accepté) ---------------------------------

def chef_de_projet(inscription):
    """Le premier membre saisi est le responsable du groupe."""
    return inscription.membres.order_by("id").first()


def formater_texte(modele, salutation, inscription):
    intro = (
        (getattr(modele, "introduction", "") or "")
        .replace("{nom_projet}", inscription.nom_projet)
        .replace("{nom_groupe}", inscription.nom_groupe)
    )
    bloc_rencontre = []
    if getattr(modele, "titre_rencontre", None):
        bloc_rencontre.append(modele.titre_rencontre)
    if getattr(modele, "texte_rencontre", None):
        bloc_rencontre.append(modele.texte_rencontre)
    if getattr(modele, "date_rencontre", None):
        bloc_rencontre.append(f"Date : {modele.date_rencontre}")
    if getattr(modele, "lieu_rencontre", None):
        bloc_rencontre.append(f"Lieu : {modele.lieu_rencontre}")

    texte_rencontre = "\n".join(bloc_rencontre)
    if texte_rencontre:
        texte_rencontre = f"\n\n{texte_rencontre}"

    consigne = f"\n\n{modele.consigne}" if getattr(modele, "consigne", None) else ""

    return (
        f"{salutation}\n\n"
        f"{intro}"
        f"{texte_rencontre}"
        f"{consigne}\n\n"
        f"Référence du dossier : {inscription.reference}\n\n"
        "Nous vous adressons nos sincères félicitations.\n\nCordialement,"
    )


def _message_acceptation(inscription, connection=None, membres=None, config=None):
    from .models import ModeleEmail
    if config is None:
        config = ModeleEmail.obtenir()
    elif isinstance(config, dict):
        from types import SimpleNamespace
        defaut = ModeleEmail.obtenir()
        config = SimpleNamespace(
            sujet=config.get("sujet", defaut.sujet),
            introduction=config.get("introduction", defaut.introduction),
            titre_rencontre=config.get("titre_rencontre", defaut.titre_rencontre),
            texte_rencontre=config.get("texte_rencontre", defaut.texte_rencontre),
            date_rencontre=config.get("date_rencontre", defaut.date_rencontre),
            lieu_rencontre=config.get("lieu_rencontre", defaut.lieu_rencontre),
            consigne=config.get("consigne", defaut.consigne),
        )

    membres = membres if membres is not None else list(inscription.membres.order_by("id"))
    chef = membres[0] if membres else None
    salutation = f"Bonjour {chef.prenom} {chef.nom}," if chef else "Bonjour,"

    sujet = (
        (getattr(config, "sujet", "") or "Félicitations — Votre projet est retenu")
        .replace("{nom_projet}", inscription.nom_projet)
        .replace("{nom_groupe}", inscription.nom_groupe)
    )

    intro = (
        (getattr(config, "introduction", "") or "")
        .replace("{nom_projet}", inscription.nom_projet)
        .replace("{nom_groupe}", inscription.nom_groupe)
    )

    texte = formater_texte(config, salutation, inscription)

    apercu_titre = getattr(config, "titre_rencontre", "") or "Rencontre"
    apercu_date = getattr(config, "date_rencontre", "")
    apercu_texte = f"{apercu_titre} : {apercu_date}" if apercu_date else apercu_titre

    contexte = {
        "apercu": f"{apercu_texte}. Votre projet a été retenu.",
        "surtitre": "Résultat de la sélection",
        "titre": "Félicitations, votre projet est retenu",
        "salutation": salutation,
        "dossier": inscription,
        "membres": membres,
        "config": config,
        "introduction": intro,
    }
    return _construire(inscription.email, sujet, texte, "emails/acceptation.html", contexte, connection)


def envoyer_acceptation(inscription, connection=None, config=None):
    """Envoie l'e-mail de félicitations. Lève une exception en cas d'échec (géré par l'appelant)."""
    _message_acceptation(inscription, connection=connection, config=config).send(fail_silently=False)


def apercu_acceptation(inscription, membres=None, config=None):
    """HTML de l'e-mail pour l'aperçu du back-office (logo intégré en data URI). N'envoie rien."""
    import base64

    msg = _message_acceptation(inscription, membres=membres, config=config)
    html = msg.alternatives[0][0]
    logo = "data:image/png;base64," + base64.b64encode(_logo_octets()).decode()
    return {"sujet": msg.subject, "destinataire": inscription.email, "html": html.replace("cid:logo-ciat", logo)}


def apercu_modele_acceptation(config=None):
    """Aperçu du modèle avec un groupe fictif (aucune donnée réelle, aucun envoi)."""
    from types import SimpleNamespace as D

    exemple = D(
        nom_groupe="Les Bâtisseurs", nom_projet="AgriCollect", reference="CIAT-2026-EXEMPL",
        email="chef.de.projet@exemple.sn",
    )
    membres = [
        D(prenom="Awa", nom="Diop", metier="Développement Backend"),
        D(prenom="Moussa", nom="Fall", metier="Technicien Supérieur en Électromécanique Automobile"),
        D(prenom="Fatou", nom="Ndiaye", metier="Analyse de Performance Digitale"),
    ]
    return apercu_acceptation(exemple, membres=membres, config=config)
