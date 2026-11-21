"""Stockage des vidéos de campagne sur Cloudflare R2 (API compatible S3).

Principe : le navigateur envoie la vidéo DIRECTEMENT à R2 grâce à une URL pré-signée.
PythonAnywhere ne fait que calculer des signatures (calcul local, sans réseau) : aucun octet
de vidéo ne transite par le serveur, et son disque de 512 Mo n'est pas utilisé.

La signature AWS « SigV4 » est implémentée ici (≈ 80 lignes) pour éviter boto3, qui occupe
près de 100 Mo une fois installé. Elle est vérifiée contre botocore dans les tests.

Appels réseau serveur -> R2 (HEAD, DELETE, LIST) : FACULTATIFS. Le compte gratuit
PythonAnywhere n'autorise que certains sites ; si R2 est injoignable, la plateforme continue
de fonctionner (la suppression se fait alors depuis le navigateur de l'admin).
"""
import datetime as dt
import hashlib
import hmac
import logging
import os
import uuid
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from django.conf import settings

logger = logging.getLogger(__name__)

TYPES_VIDEO = {"video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov"}
PREFIXE = "candidatures/videos/"
DUREE_MAX_SIGNATURE = 7 * 24 * 3600  # limite imposée par SigV4


def configure():
    return all(getattr(settings, n, "") for n in ("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"))


def taille_max():
    return int(settings.R2_VIDEO_TAILLE_MAX_MO) * 1024 * 1024


def _hote():
    return f"{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"


def _hmac(cle, texte):
    return hmac.new(cle, texte.encode("utf-8"), hashlib.sha256).digest()


def _enc(texte, sur="-_.~"):
    return quote(str(texte), safe=sur)


def url_presignee(methode, cle="", expire=3600, entetes=None, requete=None, maintenant=None):
    """URL pré-signée SigV4 (signature dans la chaîne de requête), style « path » : /bucket/cle.

    entetes : en-têtes qui seront SIGNÉS et devront être envoyés à l'identique par le client
              (ex. content-type, content-length : R2 refuse un fichier d'une autre taille).
    requete : paramètres supplémentaires (ex. list-type=2 pour lister le bucket).
    """
    maintenant = maintenant or dt.datetime.now(dt.timezone.utc)
    amz_date = maintenant.strftime("%Y%m%dT%H%M%SZ")
    jour = maintenant.strftime("%Y%m%d")
    portee = f"{jour}/auto/s3/aws4_request"
    hote = _hote()

    entetes = {k.lower(): str(v).strip() for k, v in (entetes or {}).items()}
    entetes["host"] = hote
    noms_signes = ";".join(sorted(entetes))

    chemin = f"/{settings.R2_BUCKET}" + (f"/{_enc(cle, sur='-_.~/')}" if cle else "")
    params = {
        **(requete or {}),
        "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
        "X-Amz-Credential": f"{settings.R2_ACCESS_KEY_ID}/{portee}",
        "X-Amz-Date": amz_date,
        "X-Amz-Expires": str(min(int(expire), DUREE_MAX_SIGNATURE)),
        "X-Amz-SignedHeaders": noms_signes,
    }
    requete_canonique = "&".join(f"{_enc(k)}={_enc(v)}" for k, v in sorted(params.items()))
    entetes_canoniques = "".join(f"{k}:{entetes[k]}\n" for k in sorted(entetes))
    canonique = "\n".join([methode, chemin, requete_canonique, entetes_canoniques, noms_signes, "UNSIGNED-PAYLOAD"])

    a_signer = "\n".join([
        "AWS4-HMAC-SHA256", amz_date, portee, hashlib.sha256(canonique.encode("utf-8")).hexdigest(),
    ])
    k = _hmac(f"AWS4{settings.R2_SECRET_ACCESS_KEY}".encode("utf-8"), jour)
    for morceau in ("auto", "s3", "aws4_request"):
        k = _hmac(k, morceau)
    signature = hmac.new(k, a_signer.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"https://{hote}{chemin}?{requete_canonique}&X-Amz-Signature={signature}"


def nouvelle_cle(nom_fichier, type_mime):
    """Clé unique et non devinable : candidatures/videos/2026/11/3f9c…e1.mp4"""
    ext = TYPES_VIDEO.get(type_mime) or os.path.splitext(nom_fichier or "")[1].lower()[:6] or ".mp4"
    return f"{PREFIXE}{dt.date.today():%Y/%m}/{uuid.uuid4().hex}{ext}"


def autorisation_envoi(nom_fichier, type_mime, taille):
    """URL PUT valable 30 min, liée au type ET à la taille exacte du fichier annoncé."""
    cle = nouvelle_cle(nom_fichier, type_mime)
    url = url_presignee("PUT", cle, expire=30 * 60,
                        entetes={"content-type": type_mime, "content-length": str(int(taille))})
    return cle, url


def url_lecture(cle, expire=12 * 3600):
    """Lien de lecture temporaire : le bucket reste privé."""
    return url_presignee("GET", cle, expire=expire)


def url_suppression(cle, expire=15 * 60):
    return url_presignee("DELETE", cle, expire=expire)


# --- Appels réseau facultatifs (peuvent être bloqués sur PythonAnywhere gratuit) --------------

def _appel(methode, url, timeout=6):
    with urlopen(Request(url, method=methode), timeout=timeout) as r:  # noqa: S310 (URL construite ici)
        return r.status, r.headers, r.read()


def verifier_objet(cle):
    """Renvoie ("ok", taille), ("absent", None) ou ("injoignable", None)."""
    try:
        _, entetes, _ = _appel("HEAD", url_presignee("HEAD", cle, expire=300))
        return "ok", int(entetes.get("Content-Length") or 0)
    except HTTPError as e:
        if e.code == 404:
            return "absent", None
        logger.warning("R2 HEAD %s : HTTP %s", cle, e.code)
        return "injoignable", None
    except (URLError, OSError, ValueError) as e:
        logger.info("R2 injoignable depuis le serveur (%s) : vérification ignorée.", e)
        return "injoignable", None


def supprimer_objet(cle):
    """True si R2 a confirmé la suppression ; False si le serveur ne peut pas joindre R2."""
    try:
        _appel("DELETE", url_suppression(cle))
        return True
    except HTTPError as e:
        return e.code == 404  # déjà absent
    except (URLError, OSError) as e:
        logger.info("Suppression R2 impossible depuis le serveur (%s).", e)
        return False


def lister_objets(prefixe=PREFIXE):
    """Liste (cle, taille, date) des objets du préfixe. Lève une exception si R2 est injoignable."""
    import xml.etree.ElementTree as ET

    ns = "{http://s3.amazonaws.com/doc/2006-03-01/}"
    jeton = None
    while True:
        requete = {"list-type": "2", "prefix": prefixe}
        if jeton:
            requete["continuation-token"] = jeton
        _, _, corps = _appel("GET", url_presignee("GET", requete=requete, expire=300), timeout=20)
        racine = ET.fromstring(corps)
        for o in racine.iter(f"{ns}Contents"):
            yield (
                o.findtext(f"{ns}Key"),
                int(o.findtext(f"{ns}Size") or 0),
                dt.datetime.fromisoformat(o.findtext(f"{ns}LastModified").replace("Z", "+00:00")),
            )
        if racine.findtext(f"{ns}IsTruncated") != "true":
            break
        jeton = racine.findtext(f"{ns}NextContinuationToken")
