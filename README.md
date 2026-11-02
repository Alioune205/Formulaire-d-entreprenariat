# Club d'Entrepreneuriat — CIAT · ISEP Amadou Trawaré

Plateforme d'inscription des groupes au Club d'Entrepreneuriat.

- **Frontend** : React 18 + Vite + Tailwind CSS (`frontend/`)
- **Backend** : Django 5 + Django REST Framework + SQLite (`backend/`)

## Fonctionnalités

**Formulaire public** (`/`)
- Nom du groupe, nom du projet, **e-mail du responsable** (reçoit la référence par e-mail)
- Membres (3 à 6) : nom, prénom, département (TIC ou Automobile), filière — ajout / retrait dynamique
- Description du projet (30 caractères minimum)
- **Bouton d'engagement** : l'envoi n'est possible qu'une fois le groupe engagé
- Validation côté client **et** côté serveur, nom de groupe unique, référence aléatoire `CIAT-2026-7KQ4MZ` renvoyée

**Compte à rebours** : clôture le **mercredi 11 novembre 2026 à 23 h 59** (heure de Dakar).
Après cette date, le formulaire est remplacé par un message et Django refuse les nouvelles inscriptions.
Date modifiable via la variable `DATE_LIMITE_INSCRIPTION`.

**Suivi de dossier** (`/suivi`) : référence + nom du groupe → statut, frise d'avancement, membres.
Les notes internes de l'administration ne sont jamais affichées.

**Référence oubliée** (`/recuperation`) :
1. le groupe saisit l'e-mail donné à l'inscription → un code à 6 chiffres y est envoyé (valable 15 min) ;
2. il saisit le code (5 essais maximum, usage unique, stocké haché) ;
3. une **nouvelle référence** est générée et affichée, l'ancienne cesse de fonctionner, et un e-mail
   d'alerte contenant la nouvelle référence est envoyé.

La réponse à l'étape 1 est la même que l'adresse soit inscrite ou non (on ne révèle pas qui est inscrit).

### Envoi des e-mails (Gmail)

Les e-mails partent de l'adresse configurée dans `backend/.env` (non versionné) :

1. Activer la validation en 2 étapes sur le compte Google.
2. Créer un **mot de passe d'application** sur https://myaccount.google.com/apppasswords.
3. Le coller dans `backend/.env` : `EMAIL_HOST_PASSWORD=xxxx xxxx xxxx xxxx`, puis relancer `runserver`.

Tant que ce mot de passe est vide, les e-mails (et donc les codes) s'affichent dans le terminal de `runserver`.

**Hero** : diaporama (`frontend/public/hero.jpeg` et `hero-atelier.jpeg`), suivi d'une section d'annonce
« L'ISEP lance son Club d'Entrepreneuriat ». Une image absente est simplement ignorée.

**Page administrateur** (`/admin`)
- Connexion par compte staff Django (token)
- Indicateurs : groupes, membres, en attente, entretien, acceptés, rejetés
- Recherche (groupe, référence, e-mail, projet, membre, département, filière) et filtre par statut
- Fiche détaillée : membres, description, engagement, changement de statut, notes internes, suppression
- Export CSV compatible Excel (une ligne par membre)

L'admin Django classique reste disponible sur `http://127.0.0.1:8010/django-admin/`.

## Mise en ligne

Voir **[DEPLOIEMENT.md](DEPLOIEMENT.md)** : Vercel (frontend) + PythonAnywhere (backend), 100 % gratuit.

## Lancer le projet en local

### 1. Backend (terminal 1)

```bash
cd backend
python -m venv .venv
# Windows : .venv\Scripts\activate   ·   Linux/Mac : source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser      # compte pour la page /admin
python manage.py runserver 8010       # http://127.0.0.1:8010
```

### 2. Frontend (terminal 2)

```bash
cd frontend
npm install
npm run dev                           # http://localhost:5173
```

Le serveur Vite redirige automatiquement `/api` vers Django.

### Tests backend

```bash
cd backend
python manage.py test inscriptions
```

## API

| Méthode | URL | Accès | Rôle |
| --- | --- | --- | --- |
| POST | `/api/inscriptions/` | public | Créer une inscription (groupe + membres) |
| GET | `/api/infos/` | public | Date limite + inscriptions ouvertes ou non (compte à rebours) |
| POST | `/api/suivi/` | public | Suivi d'un dossier : `{reference, nom_groupe}` (les deux doivent correspondre) |
| POST | `/api/recuperation/demande/` | public | `{email}` : envoie un code de vérification |
| POST | `/api/recuperation/verification/` | public | `{email, code}` : génère une nouvelle référence |
| POST | `/api/admin/connexion/` | public | Obtenir un token (compte staff) |
| POST | `/api/admin/deconnexion/` | staff | Révoquer le token |
| GET | `/api/admin/inscriptions/?q=&statut=` | staff | Liste filtrée |
| GET / PATCH / DELETE | `/api/admin/inscriptions/<id>/` | staff | Détail, statut + notes, suppression |
| GET | `/api/admin/inscriptions/stats/` | staff | Indicateurs |
| GET | `/api/admin/inscriptions/export/` | staff | Export CSV |

Exemple de corps pour `POST /api/inscriptions/` :

```json
{
  "nom_groupe": "Les Bâtisseurs",
  "nom_projet": "AgriCollect",
  "email": "awa.diop@gmail.com",
  "description_projet": "Plateforme qui relie les producteurs locaux aux acheteurs…",
  "engagement": true,
  "membres": [
    { "nom": "Diop", "prenom": "Awa", "departement": "Informatique & Numérique", "metier": "Développeuse web" }
  ]
}
```

## Structure

```
backend/
  config/            réglages Django, URLs racine
  inscriptions/      modèles Inscription + Membre, API, admin Django, tests
frontend/
  public/            logo CIAT, image hero
  src/components/    Navbar, Hero, AboutClub, FormulaireInscription, Footer
  src/pages/         Accueil, Admin
  src/lib/api.js     client de l'API
```
