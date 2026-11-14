import re
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APITestCase

from .genre import estimer_genre
from .models import CodeVerification, Inscription, Membre

PAYLOAD = {
    "nom_groupe": "Les Bâtisseurs",
    "nom_projet": "AgriCollect",
    "email": "Awa.Diop@Exemple.sn",
    "description_projet": "Plateforme qui relie les producteurs locaux aux acheteurs de Thiès.",
    "engagement": True,
    "membres": [
        {"nom": "Diop", "prenom": "Awa", "departement": "TIC", "metier": "Développement Backend"},
        {"nom": "Fall", "prenom": "Moussa", "departement": "Automobile",
         "metier": "Technicien Supérieur en Électromécanique Automobile"},
        {"nom": "Ndiaye", "prenom": "Fatou", "departement": "TIC",
         "metier": "Réseaux, Sécurité et Internet des Objets (IoT)"},
    ],
}


class InscriptionTests(APITestCase):
    def setUp(self):
        cache.clear()  # remet à zéro les limites de requêtes entre les tests

    def test_inscription_publique(self):
        r = self.client.post("/api/inscriptions/", PAYLOAD, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertRegex(r.data["reference"], r"^CIAT-\d{4}-[A-Z2-9]{6}$")
        ins = Inscription.objects.get()
        self.assertEqual(ins.membres.count(), 3)
        self.assertEqual(ins.email, "awa.diop@exemple.sn")  # normalisé en minuscules
        # E-mail de confirmation contenant la référence
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(r.data["reference"], mail.outbox[0].body)

    def test_email_obligatoire_et_valide(self):
        sans = {k: v for k, v in PAYLOAD.items() if k != "email"}
        self.assertEqual(self.client.post("/api/inscriptions/", sans, format="json").status_code, 400)
        r = self.client.post("/api/inscriptions/", {**PAYLOAD, "email": "pas-un-mail"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("email", r.data)

    def test_engagement_obligatoire(self):
        r = self.client.post("/api/inscriptions/", {**PAYLOAD, "engagement": False}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("engagement", r.data)

    def test_au_moins_un_membre(self):
        r = self.client.post("/api/inscriptions/", {**PAYLOAD, "membres": []}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_maximum_six_membres(self):
        sept = [PAYLOAD["membres"][0]] * 7
        r = self.client.post("/api/inscriptions/", {**PAYLOAD, "membres": sept}, format="json")
        self.assertEqual(r.status_code, 400)
        r = self.client.post("/api/inscriptions/", {**PAYLOAD, "membres": sept[:6]}, format="json")
        self.assertEqual(r.status_code, 201, r.data)

    def test_filiere_coherente_avec_departement(self):
        mauvais = {**PAYLOAD["membres"][0], "departement": "Automobile"}  # filière TIC
        r = self.client.post("/api/inscriptions/",
                             {**PAYLOAD, "membres": [mauvais, *PAYLOAD["membres"][1:]]}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("metier", r.data["membres"][0])
        inconnu = {**PAYLOAD["membres"][0], "departement": "Agriculture"}
        r = self.client.post("/api/inscriptions/",
                             {**PAYLOAD, "membres": [inconnu, *PAYLOAD["membres"][1:]]}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("departement", r.data["membres"][0])

    def test_minimum_trois_membres(self):
        for n in (0, 1, 2):
            r = self.client.post("/api/inscriptions/", {**PAYLOAD, "membres": PAYLOAD["membres"][:n]}, format="json")
            self.assertEqual(r.status_code, 400, n)
            self.assertIn("membres", r.data)
        r = self.client.post("/api/inscriptions/", PAYLOAD, format="json")
        self.assertEqual(r.status_code, 201, r.data)

    def test_nom_groupe_unique(self):
        self.client.post("/api/inscriptions/", PAYLOAD, format="json")
        r = self.client.post("/api/inscriptions/", {**PAYLOAD, "nom_groupe": "les bâtisseurs"}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_admin_protege(self):
        self.assertEqual(self.client.get("/api/admin/inscriptions/").status_code, 401)

    def test_admin_flux_complet(self):
        get_user_model().objects.create_user("admin", password="motdepasse-test", is_staff=True)
        self.client.post("/api/inscriptions/", PAYLOAD, format="json")
        r = self.client.post("/api/admin/connexion/", {"username": "admin", "password": "motdepasse-test"})
        self.assertEqual(r.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {r.data['token']}")

        liste = self.client.get("/api/admin/inscriptions/?q=awa").data
        self.assertEqual(len(liste), 1)
        pk = liste[0]["id"]
        r = self.client.patch(f"/api/admin/inscriptions/{pk}/", {"statut": "ACCEPTE"}, format="json")
        self.assertEqual(r.data["statut"], "ACCEPTE")
        self.assertEqual(self.client.get("/api/admin/inscriptions/stats/").data["accepte"], 1)
        csv = self.client.get("/api/admin/inscriptions/export/")
        self.assertIn("AgriCollect", csv.content.decode("utf-8"))

    def test_suivi_dossier(self):
        ref = self.client.post("/api/inscriptions/", PAYLOAD, format="json").data["reference"]
        r = self.client.post("/api/suivi/", {"reference": ref.lower(), "nom_groupe": "les bâtisseurs"}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["statut"], "EN_ATTENTE")
        self.assertNotIn("notes_admin", r.data)

    def test_suivi_mauvais_nom_groupe(self):
        ref = self.client.post("/api/inscriptions/", PAYLOAD, format="json").data["reference"]
        r = self.client.post("/api/suivi/", {"reference": ref, "nom_groupe": "Autre"}, format="json")
        self.assertEqual(r.status_code, 404)
        r = self.client.post("/api/suivi/", {"reference": "n'importe quoi", "nom_groupe": "x"}, format="json")
        self.assertEqual(r.status_code, 404)

    def test_infos_publiques(self):
        r = self.client.get("/api/infos/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("date_limite", r.data)

    def test_inscriptions_closes_apres_date_limite(self):
        with self.settings(DATE_LIMITE_INSCRIPTION="2000-01-01T00:00:00+00:00"):
            r = self.client.post("/api/inscriptions/", PAYLOAD, format="json")
            self.assertEqual(r.status_code, 403)
            self.assertFalse(self.client.get("/api/infos/").data["inscriptions_ouvertes"])
        self.assertEqual(Inscription.objects.count(), 0)

    # --- Récupération de la référence par e-mail ---

    def _demander_code(self, email="awa.diop@exemple.sn"):
        mail.outbox.clear()
        r = self.client.post("/api/recuperation/demande/", {"email": email}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        return re.search(r"\b(\d{6})\b", mail.outbox[0].body).group(1) if mail.outbox else None

    def test_recuperation_complete(self):
        ancienne = self.client.post("/api/inscriptions/", PAYLOAD, format="json").data["reference"]
        code = self._demander_code("AWA.DIOP@exemple.sn ")  # casse et espaces tolérés
        self.assertIsNotNone(code)
        self.assertFalse(CodeVerification.objects.filter(code_hache=code).exists())  # jamais en clair

        r = self.client.post("/api/recuperation/verification/",
                             {"email": "awa.diop@exemple.sn", "code": code}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        nouvelle = r.data["dossiers"][0]["reference"]
        self.assertNotEqual(nouvelle, ancienne)

        suivi = lambda ref: self.client.post(  # noqa: E731
            "/api/suivi/", {"reference": ref, "nom_groupe": PAYLOAD["nom_groupe"]}, format="json")
        self.assertEqual(suivi(ancienne).status_code, 404)  # l'ancienne ne marche plus
        self.assertEqual(suivi(nouvelle).status_code, 200)
        self.assertIn(nouvelle, mail.outbox[-1].body)  # e-mail d'alerte avec la nouvelle référence

        # Le code est à usage unique
        r = self.client.post("/api/recuperation/verification/",
                             {"email": "awa.diop@exemple.sn", "code": code}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_recuperation_email_inconnu_meme_reponse(self):
        self.client.post("/api/inscriptions/", PAYLOAD, format="json")
        connu = self.client.post("/api/recuperation/demande/", {"email": "awa.diop@exemple.sn"}, format="json")
        mail.outbox.clear()
        inconnu = self.client.post("/api/recuperation/demande/", {"email": "personne@exemple.sn"}, format="json")
        self.assertEqual(inconnu.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)  # aucun e-mail envoyé
        # Même message, pour ne pas révéler si l'adresse est inscrite
        self.assertEqual(connu.data["message"].replace("awa.diop@exemple.sn", "X"),
                         inconnu.data["message"].replace("personne@exemple.sn", "X"))

    def test_recuperation_tentatives_limitees(self):
        self.client.post("/api/inscriptions/", PAYLOAD, format="json")
        code = self._demander_code()
        faux = "000000" if code != "000000" else "111111"
        for _ in range(CodeVerification.MAX_TENTATIVES):
            r = self.client.post("/api/recuperation/verification/",
                                 {"email": "awa.diop@exemple.sn", "code": faux}, format="json")
            self.assertEqual(r.status_code, 400)
        # Même le bon code est refusé après 5 échecs
        r = self.client.post("/api/recuperation/verification/",
                             {"email": "awa.diop@exemple.sn", "code": code}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_recuperation_code_expire(self):
        self.client.post("/api/inscriptions/", PAYLOAD, format="json")
        code = self._demander_code()
        CodeVerification.objects.update(expire_le=timezone.now() - timedelta(seconds=1))
        r = self.client.post("/api/recuperation/verification/",
                             {"email": "awa.diop@exemple.sn", "code": code}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_nouveau_code_invalide_le_precedent(self):
        self.client.post("/api/inscriptions/", PAYLOAD, format="json")
        premier = self._demander_code()
        second = self._demander_code()
        if premier != second:
            r = self.client.post("/api/recuperation/verification/",
                                 {"email": "awa.diop@exemple.sn", "code": premier}, format="json")
            self.assertEqual(r.status_code, 400)
        r = self.client.post("/api/recuperation/verification/",
                             {"email": "awa.diop@exemple.sn", "code": second}, format="json")
        self.assertEqual(r.status_code, 200)

    def test_quota_codes_par_email(self):
        self.client.post("/api/inscriptions/", PAYLOAD, format="json")
        for _ in range(CodeVerification.MAX_CODES_PAR_HEURE):
            self.assertIsNotNone(self._demander_code())
        # Au-delà : même réponse 200, mais aucun e-mail envoyé
        self.assertIsNone(self._demander_code())

    def test_meme_ip_plusieurs_groupes(self):
        """Wi-Fi de l'ISEP : beaucoup de groupes depuis la même IP ne doivent pas être bloqués."""
        for i in range(30):
            data = {**PAYLOAD, "nom_groupe": f"Groupe {i}", "email": f"g{i}@exemple.sn"}
            r = self.client.post("/api/inscriptions/", data, format="json")
            self.assertEqual(r.status_code, 201, (i, r.data))

    def test_non_staff_refuse(self):
        get_user_model().objects.create_user("etudiant", password="motdepasse-test")
        r = self.client.post("/api/admin/connexion/", {"username": "etudiant", "password": "motdepasse-test"})
        self.assertEqual(r.status_code, 401)


class BackOfficeTests(APITestCase):
    """Récapitulatif, genre estimé par le prénom, e-mails de félicitations."""

    def setUp(self):
        cache.clear()
        get_user_model().objects.create_user("admin", password="motdepasse-test", is_staff=True)
        token = self.client.post("/api/admin/connexion/", {"username": "admin", "password": "motdepasse-test"}).data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    def _inscrire(self, nom, email, statut=None):
        self.client.post("/api/inscriptions/", {**PAYLOAD, "nom_groupe": nom, "email": email}, format="json")
        ins = Inscription.objects.get(nom_groupe=nom)
        if statut:
            ins.statut = statut
            ins.save()
        return ins

    def test_estimation_genre(self):
        self.assertEqual(estimer_genre("Pape Alioune"), "H")
        self.assertEqual(estimer_genre("Ndèye Fatou"), "F")
        self.assertEqual(estimer_genre("Mame Diarra"), "F")
        self.assertEqual(estimer_genre("Mame Cheikh"), "H")
        self.assertEqual(estimer_genre("Adama"), "")  # prénom mixte : à vérifier
        self.assertEqual(estimer_genre("Xyzabc"), "")  # inconnu : à vérifier

    def test_formulaire_public_ignore_le_genre(self):
        membres = [{**m, "genre": "F"} for m in PAYLOAD["membres"]]
        r = self.client.post("/api/inscriptions/", {**PAYLOAD, "membres": membres}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertFalse(Membre.objects.exclude(genre="").exists())

    def test_recap_et_correction_du_genre(self):
        ins = self._inscrire("G1", "g1@exemple.sn")  # Awa (F), Moussa (H), Fatou (F)
        recap = self.client.get("/api/admin/inscriptions/recap/").data
        self.assertEqual((recap["genre"]["filles"], recap["genre"]["garcons"]), (2, 1))
        self.assertEqual(recap["groupes"], 1)
        self.assertEqual(recap["groupes_mixtes"], 1)  # TIC + Automobile
        tic = next(d for d in recap["departements"] if d["departement"] == "TIC")
        self.assertEqual(tic["total"], 2)
        apd = next(f for f in recap["filieres"] if f["filiere"] == "Analyse de Performance Digitale")
        self.assertEqual(apd["total"], 0)  # les filières vides apparaissent aussi

        # Un admin corrige Moussa -> Fille : la correction l'emporte sur l'estimation
        moussa = ins.membres.get(prenom="Moussa")
        r = self.client.patch(f"/api/admin/membres/{moussa.pk}/", {"genre": "F"}, format="json")
        self.assertEqual(r.data["genre_effectif"], "F")
        self.assertEqual(self.client.get("/api/admin/inscriptions/recap/").data["genre"]["filles"], 3)

        # Filtre par statut
        self.assertEqual(self.client.get("/api/admin/inscriptions/recap/?statut=ACCEPTE").data["groupes"], 0)

    def test_email_acceptation_individuel_et_apercu(self):
        ins = self._inscrire("G2", "g2@exemple.sn")
        mail.outbox.clear()
        r = self.client.post(f"/api/admin/inscriptions/{ins.pk}/envoyer-acceptation/")
        self.assertEqual(r.status_code, 400)  # pas encore accepté
        ins.statut = Inscription.Statut.ACCEPTE
        ins.save()
        apercu = self.client.get(f"/api/admin/inscriptions/{ins.pk}/apercu-acceptation/").data
        self.assertIn("est retenu", apercu["sujet"])
        self.assertIn("Awa Diop", apercu["html"])  # personnalisé avec le chef de projet
        self.assertNotIn("cid:logo-ciat", apercu["html"])
        self.assertEqual(len(mail.outbox), 0)  # l'aperçu n'envoie rien
        r = self.client.post(f"/api/admin/inscriptions/{ins.pk}/envoyer-acceptation/")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertIsNotNone(r.data["acceptation_envoyee_le"])
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Mercredi 18 novembre 2026", mail.outbox[0].body)
        self.assertIn("13h00", mail.outbox[0].body)
        self.assertIn("Amphi", mail.outbox[0].body)

    def test_envoi_groupe_par_lots_sans_doublon(self):
        for i in range(5):
            self._inscrire(f"Groupe {i}", f"g{i}@exemple.sn", Inscription.Statut.ACCEPTE)
        self._inscrire("En attente", "attente@exemple.sn")  # non accepté : exclu
        mail.outbox.clear()
        r = self.client.post("/api/admin/inscriptions/envoyer-acceptations/", {"limite": 3}, format="json")
        self.assertEqual((len(r.data["envoyes"]), r.data["restants"]), (3, 2))
        r = self.client.post("/api/admin/inscriptions/envoyer-acceptations/", {"limite": 3}, format="json")
        self.assertEqual((len(r.data["envoyes"]), r.data["restants"]), (2, 0))
        r = self.client.post("/api/admin/inscriptions/envoyer-acceptations/", {"limite": 3}, format="json")
        self.assertEqual(len(r.data["envoyes"]), 0)  # relancer ne renvoie rien
        self.assertEqual(len(mail.outbox), 5)
        self.assertEqual(sorted(m.to[0] for m in mail.outbox), [f"g{i}@exemple.sn" for i in range(5)])

    def test_modele_email_sans_envoi(self):
        mail.outbox.clear()
        r = self.client.get("/api/admin/inscriptions/modele-acceptation/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("Awa Diop", r.data["html"])
        self.assertIn("Mercredi 18 novembre 2026", r.data["html"])
        self.assertIn("13h00", r.data["html"])
        self.assertIn("Amphi", r.data["html"])
        self.assertIn("ISEP Amadou Trawaré", r.data["html"])
        self.assertEqual(len(mail.outbox), 0)

    def test_liste_membres_a_verifier(self):
        ins = self._inscrire("G3", "g3@exemple.sn")
        fatou = ins.membres.get(prenom="Fatou")
        fatou.prenom = "Xyzabc"  # prénom inconnu
        fatou.save()
        r = self.client.get("/api/admin/membres/?a_verifier=1")
        self.assertEqual([m["prenom"] for m in r.data], ["Xyzabc"])
        self.assertEqual(r.data[0]["nom_groupe"], "G3")
        self.client.patch(f"/api/admin/membres/{fatou.pk}/", {"genre": "F"}, format="json")
        self.assertEqual(self.client.get("/api/admin/membres/?a_verifier=1").data, [])
        recap = self.client.get("/api/admin/inscriptions/recap/").data["genre"]
        self.assertEqual(recap["pct_filles_identifies"] + recap["pct_garcons_identifies"], 100)

    def test_accepter_tous_sans_toucher_aux_rejetes_ni_envoyer(self):
        self._inscrire("Groupe A", "a@exemple.sn")
        self._inscrire("Groupe B", "b@exemple.sn", Inscription.Statut.ENTRETIEN)
        self._inscrire("Groupe C", "c@exemple.sn", Inscription.Statut.REJETE)
        mail.outbox.clear()
        r = self.client.post("/api/admin/inscriptions/accepter-tous/")
        self.assertEqual(r.data["acceptes"], 2)
        self.assertEqual(Inscription.objects.get(nom_groupe="Groupe C").statut, "REJETE")
        self.assertEqual(len(mail.outbox), 0)  # accepter n'envoie rien
        self.assertEqual(self.client.get("/api/admin/inscriptions/recap/").data["acceptation"]["a_envoyer"], 2)

    def test_envoyer_a_tous_accepte_puis_envoie(self):
        self._inscrire("Groupe P", "p@exemple.sn")  # en attente
        self._inscrire("Groupe E", "e@exemple.sn", Inscription.Statut.ENTRETIEN)
        self._inscrire("Groupe R", "r@exemple.sn", Inscription.Statut.REJETE)
        self.assertEqual(self.client.get("/api/admin/inscriptions/recap/").data["acceptation"]["eligibles"], 2)
        mail.outbox.clear()
        r = self.client.post("/api/admin/inscriptions/envoyer-acceptations/", {"limite": 10, "accepter": True}, format="json")
        self.assertEqual((len(r.data["envoyes"]), r.data["restants"]), (2, 0))
        self.assertEqual(sorted(m.to[0] for m in mail.outbox), ["e@exemple.sn", "p@exemple.sn"])
        self.assertEqual(Inscription.objects.get(nom_groupe="Groupe R").statut, "REJETE")
        self.assertNotIn("Suivre mon dossier", mail.outbox[0].alternatives[0][0])
        self.assertIn("Félicitations", mail.outbox[0].subject)

    def test_email_acceptation_sans_emoji(self):
        html = self.client.get("/api/admin/inscriptions/modele-acceptation/").data["html"]
        import re
        self.assertIsNone(re.search("[🌀-🫿☀-➿]", html))

    def test_routes_back_office_protegees(self):
        self.client.credentials()
        self.assertEqual(self.client.get("/api/admin/inscriptions/recap/").status_code, 401)
        self.assertEqual(self.client.post("/api/admin/inscriptions/envoyer-acceptations/").status_code, 401)
        self.assertEqual(self.client.get("/api/admin/inscriptions/modele-email/").status_code, 401)

    def test_personnalisation_modele_email(self):
        # 1. Lecture du modèle existant
        r = self.client.get("/api/admin/inscriptions/modele-email/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("Mercredi 18 novembre 2026", r.data["date_rencontre"])

        # 2. Modification directe
        r = self.client.patch("/api/admin/inscriptions/modele-email/", {
            "date_rencontre": "Vendredi 20 novembre 2026 à 15h00",
            "lieu_rencontre": "Salle B12 (CIAT)",
        }, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["date_rencontre"], "Vendredi 20 novembre 2026 à 15h00")

        # 3. Aperçu en direct sans sauvegarder
        apercu = self.client.post("/api/admin/inscriptions/modele-email/apercu/", {
            "date_rencontre": "Jeudi 19 novembre 2026",
            "lieu_rencontre": "Salle Informatique",
        }, format="json")
        self.assertEqual(apercu.status_code, 200)
        self.assertIn("Jeudi 19 novembre 2026", apercu.data["html"])
        self.assertIn("Salle Informatique", apercu.data["html"])

        # 4. Envoi avec le modèle personnalisé sauvegardé
        ins = self._inscrire("Groupe Custom", "custom@exemple.sn", Inscription.Statut.ACCEPTE)
        mail.outbox.clear()
        r = self.client.post(f"/api/admin/inscriptions/{ins.pk}/envoyer-acceptation/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("Vendredi 20 novembre 2026 à 15h00", mail.outbox[0].body)
        self.assertIn("Salle B12 (CIAT)", mail.outbox[0].body)

        # 5. Réinitialisation aux valeurs par défaut
        r = self.client.post("/api/admin/inscriptions/modele-email/reinitialiser/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("Mercredi 18 novembre 2026", r.data["date_rencontre"])
