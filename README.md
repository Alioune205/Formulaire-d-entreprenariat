# 🚀 Plateforme du Club d'Entrepreneuriat

> Solution clé en main développée pour le recrutement, la sélection et l'accompagnement des étudiants entrepreneurs.
> Comprend une **Landing Page vitrine**, un **Formulaire d'inscription interactif** et un **Back-Office d'administration sécurisé avec export CSV**.

---

## 👥 Répartition des Tâches (Équipe de 3)

Pour maximiser l'efficacité et valoriser le travail devant le professeur :

| Rôle | Responsable | Périmètre & Fichiers |
| :--- | :--- | :--- |
| **Membre 1 : Landing Page & Branding** | Étudiant 1 | Design vitrine, arguments d'impact, FAQ, identité visuelle.<br>`src/components/Hero.tsx`, `AboutClub.tsx`, `Navbar.tsx`, `FAQ.tsx`, `Footer.tsx` |
| **Membre 2 : Formulaire & Parcours Candidat** | Étudiant 2 | Expérience utilisateur, champs du formulaire (filières, compétences, pitch d'idées), validations et messages de succès.<br>`src/components/ApplicationForm.tsx`, `src/app/api/apply/route.ts` |
| **Membre 3 : Back-Office & Déploiement** | Étudiant 3 | Tableau de bord admin, traitement des statuts (Entretien/Accepté/Rejeté), export CSV, sécurité et déploiement Vercel.<br>`src/app/admin/page.tsx`, `src/app/api/admin/`, `src/lib/storage.ts` |

---

## ⚡ Démarrage Rapide en Local

### 1. Prérequis
- Node.js (version 18+ ou 20+)

### 2. Lancement du serveur de développement
```bash
npm install
npm run dev
```

L'application est accessible sur :
- **Landing page & Formulaire public** : [http://localhost:3000](http://localhost:3000)
- **Back-Office d'administration** : [http://localhost:3000/admin](http://localhost:3000/admin)
  - Mot de passe par défaut : `admin2026`

---

## 🌐 Déploiement Gratuit en 2 Minutes (Vercel)

Pour respecter la consigne de déploiement aujourd'hui :

1. **Pousser le code sur GitHub :**
   ```bash
   git add .
   git commit -m "feat: solution complete landing page, formulaire et back office"
   git push origin main
   ```

2. **Connecter à Vercel (100% gratuit) :**
   - Rendez-vous sur [vercel.com](https://vercel.com) et connectez-vous avec GitHub.
   - Cliquez sur **"Add New..."** > **"Project"**.
   - Sélectionnez votre dépôt `Formulaire-d-entreprenariat`.
   - Dans la section **Environment Variables**, ajoutez :
     - `ADMIN_PASSWORD` = `votre_mot_de_passe_secret` (ex: `club2026`)
   - Cliquez sur **"Deploy"**.
   - 🎉 En moins de 60 secondes, votre site est en ligne avec une URL HTTPS sécurisée (ex: `https://formulaire-d-entreprenariat.vercel.app`) !

---

## 📊 Fonctionnalités du Back-Office

- 📈 **KPIs en temps réel** : Total candidatures, en attente, convoqués en entretien, acceptés, rejetés, porteurs d'idées.
- 🔍 **Recherche instantanée** : Par nom, email, filière, compétence ou nom de projet.
- 🗂️ **Filtres multicritères** : Filtrer par statut ou isoler les porteurs de projet.
- 📝 **Dossier candidat complet** : Modal avec pitch du projet, compétences, motivation et disponibilité.
- 🔄 **Changement de statut & Notes internes** : Sauvegarder les délibérations du jury.
- 📥 **Export CSV / Excel** : Téléchargement en un clic de l'ensemble de la base avec encodage UTF-8.
