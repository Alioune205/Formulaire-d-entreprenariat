# Mise en ligne gratuite — Vercel + PythonAnywhere

| Partie | Hébergeur (gratuit) | Rôle |
| --- | --- | --- |
| Frontend React (`frontend/`) | **Vercel** | Pages, images, scripts — servis par un CDN mondial |
| Backend Django (`backend/`) | **PythonAnywhere** (compte Beginner) | API, base SQLite, envoi des e-mails Gmail |

Pourquoi ce choix : Vercel absorbe tout le trafic « lourd » (pages, photos), et PythonAnywhere
gratuit est l'un des rares hébergeurs gratuits qui **conserve la base SQLite** et **autorise l'envoi via Gmail**.

Durée estimée : 45 minutes. Remplacez partout `VOTRE-IDENTIFIANT` par votre identifiant PythonAnywhere.

---

## 0. Avant de commencer

- [ ] Le projet est sur **GitHub** (dépôt public ou privé).
- [ ] Un **nouveau mot de passe d'application Gmail** pour `senepapealioune0@gmail.com`
      (https://myaccount.google.com/apppasswords) — l'ancien a circulé, supprimez-le.

---

## 1. PythonAnywhere — tester Gmail EN PREMIER

1. Créez un compte gratuit sur https://www.pythonanywhere.com (identifiant = adresse du site :
   `VOTRE-IDENTIFIANT.pythonanywhere.com`).
2. Ouvrez **Consoles → Bash** et testez la connexion à Gmail :

   ```bash
   python3 -c "import smtplib; s=smtplib.SMTP('smtp.gmail.com',587,timeout=15); s.starttls(); print('Gmail joignable :', s.noop())"
   ```

   - `Gmail joignable : (250, ...)` → continuez.
   - Erreur `Network is unreachable` / `timed out` → **arrêtez-vous** et signalez-le : il faudra
     passer par une autre solution d'envoi d'e-mails.

## 2. PythonAnywhere — installer le backend

Dans la console Bash :

```bash
git clone https://github.com/VOTRE-COMPTE/Formulaire-d-entreprenariat.git
cd Formulaire-d-entreprenariat/backend
mkvirtualenv ciat --python=python3.12      # prenez la version 3.10+ la plus récente proposée
pip install -r requirements.txt
cp .env.production.example .env
python -c "import secrets; print(secrets.token_urlsafe(50))"   # -> copiez la clé
nano .env                                   # collez la clé, le mot de passe Gmail, VOTRE-IDENTIFIANT
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser            # compte de la page /admin — mot de passe FORT
python manage.py check --deploy             # 2 avertissements HSTS attendus, rien d'autre
```

> Pour les lignes Vercel du `.env` (`CORS_ALLOWED_ORIGINS`, `FRONTEND_URL`), laissez la valeur
> d'exemple pour l'instant : on y revient à l'étape 5.

## 3. PythonAnywhere — créer l'application web

Onglet **Web → Add a new web app → Manual configuration** → même version de Python qu'à l'étape 2.

| Réglage | Valeur |
| --- | --- |
| Source code | `/home/VOTRE-IDENTIFIANT/Formulaire-d-entreprenariat/backend` |
| Virtualenv | `/home/VOTRE-IDENTIFIANT/.virtualenvs/ciat` |
| Static files : URL `/static/` | `/home/VOTRE-IDENTIFIANT/Formulaire-d-entreprenariat/backend/staticfiles` |
| Force HTTPS | **Enabled** |

Cliquez sur le lien du **WSGI configuration file**, effacez tout et collez :

```python
import os
import sys

chemin = "/home/VOTRE-IDENTIFIANT/Formulaire-d-entreprenariat/backend"
if chemin not in sys.path:
    sys.path.insert(0, chemin)
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings"

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
```

Cliquez sur **Reload**, puis ouvrez `https://VOTRE-IDENTIFIANT.pythonanywhere.com/api/infos/` :
vous devez voir `{"date_limite": ..., "inscriptions_ouvertes": true}`.

## 4. Vercel — publier le frontend

1. https://vercel.com → **Add New → Project** → importez le dépôt GitHub.
2. **Root Directory : `frontend`** (important : l'ancien code Next.js à la racine est ignoré).
3. **Environment Variables** : `VITE_API_URL` = `https://VOTRE-IDENTIFIANT.pythonanywhere.com`
4. **Deploy**. Notez l'adresse obtenue (ex. `https://club-ciat.vercel.app`).

## 5. Relier les deux

Sur PythonAnywhere, dans `backend/.env`, remplacez `https://VOTRE-SITE.vercel.app` (2 lignes)
par l'adresse Vercel, puis **Web → Reload**.

## 6. Vérifications finales (sur téléphone ET ordinateur)

- [ ] Le site Vercel s'affiche, le compte à rebours tourne, le carrousel défile.
- [ ] Une inscription test → référence affichée **et** e-mail de confirmation reçu.
- [ ] `/suivi` avec cette référence → dossier trouvé.
- [ ] « Référence oubliée ? » → code reçu par e-mail → nouvelle référence.
- [ ] `/admin` → connexion, inscription visible, export CSV.
- [ ] Supprimez l'inscription test depuis `/admin`.
- [ ] Ouvrir directement `https://VOTRE-SITE.vercel.app/suivi` (lien partagé) fonctionne.

---

## Pendant la semaine d'inscriptions

**Chaque soir** (console Bash PythonAnywhere) :

```bash
cd ~/Formulaire-d-entreprenariat/backend && workon ciat && python manage.py sauvegarder
```

Et téléchargez l'**export CSV** depuis `/admin` : une copie de secours hors du serveur.

**En cas de problème** : onglet **Web → Log files → Error log** (les erreurs Django y apparaissent).

**Mettre à jour le code** après une correction :

```bash
cd ~/Formulaire-d-entreprenariat && git pull && cd backend && workon ciat \
  && python manage.py migrate && python manage.py collectstatic --noinput
```
puis **Web → Reload**. Côté Vercel, chaque `git push` redéploie automatiquement.

**Ne pas oublier** : sur l'onglet Web de PythonAnywhere, le bouton
**« Run until 1 month from today »** — à cliquer avant la campagne pour éviter toute mise en pause.

## Capacité mesurée (test de charge, conditions du compte gratuit)

Serveur à **un seul processus** et envoi d'e-mail simulé à 1,5 s (latence Gmail) :

| Scénario | Résultat |
| --- | --- |
| 1 inscription toutes les 2 s + 2 visites/s pendant 2 min | 60/60 inscriptions OK, réponse médiane **0,08 s**, visites ≤ 3 s |
| 50 inscriptions envoyées **à la même seconde** | 50/50 enregistrées, **aucune perte**, mais attente jusqu'à ~80 s |

Débit soutenu ≈ **35 inscriptions par minute**. Limite Gmail : ~500 e-mails / 24 h
(1 e-mail par inscription, 2 par récupération de référence).
