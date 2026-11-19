"""Utilitaires de normalisation (e-mails, numéros de téléphone, anti-doublons)."""
import re

TYPOS_DOMAINES = {
    "gamil.com": "gmail.com",
    "gmial.com": "gmail.com",
    "gmal.com": "gmail.com",
    "gmaill.com": "gmail.com",
    "gmail.con": "gmail.com",
    "gmail.cm": "gmail.com",
    "yaho.com": "yahoo.com",
    "yaho.fr": "yahoo.fr",
    "yahoo.con": "yahoo.com",
    "hotmal.com": "hotmail.com",
    "hotmial.com": "hotmail.com",
    "outlok.com": "outlook.com",
}


def normaliser_telephone(tel):
    """Conserve les chiffres ; normalise les numéros sénégalais (+221) sur 9 chiffres."""
    chiffres = re.sub(r"\D", "", str(tel or ""))
    if len(chiffres) > 9 and (chiffres.startswith("221") or chiffres.startswith("00221")):
        return chiffres[-9:]
    return chiffres


def normaliser_email_canonique(email):
    """Normalise un e-mail (et ignore les points/+tag sur Gmail)."""
    val = str(email or "").strip().lower()
    if "@" not in val:
        return val
    local, domaine = val.rsplit("@", 1)
    if domaine in ("gmail.com", "googlemail.com"):
        local = local.split("+", 1)[0].replace(".", "")
        domaine = "gmail.com"
    return f"{local}@{domaine}"


def domaine_est_faute_frappe(email):
    """Renvoie (domaine_fautif, suggestion) si le domaine est une coquille connue, sinon None."""
    val = str(email or "").strip().lower()
    if "@" not in val:
        return None
    domaine = val.rsplit("@", 1)[1]
    if domaine in TYPOS_DOMAINES:
        return (domaine, TYPOS_DOMAINES[domaine])
    return None
