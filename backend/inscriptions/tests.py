import re
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from .genre import estimer_genre
from .models import CandidaturePoste, CodeVerification, Inscription, Membre

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


@override_settings(DATE_LIMITE_INSCRIPTION="2099-12-31T23:59:59+00:00")
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

    def test_minimum_un_membre(self):
        # 0 membre échoue
        r_vide = self.client.post("/api/inscriptions/", {**PAYLOAD, "membres": []}, format="json")
        self.assertEqual(r_vide.status_code, 400)
        self.assertIn("membres", r_vide.data)
        # 1 seul membre (candidat individuel) est désormais accepté
        r_solo = self.client.post("/api/inscriptions/", {**PAYLOAD, "membres": PAYLOAD["membres"][:1]}, format="json")
        self.assertEqual(r_solo.status_code, 201, r_solo.data)
        # 3 membres fonctionnent également
        r_equipe = self.client.post(
            "/api/inscriptions/",
            {**PAYLOAD, "nom_groupe": "Équipe Complète"},
            format="json",
        )
        self.assertEqual(r_equipe.status_code, 201, r_equipe.data)

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

    def test_admin_fermer_et_rouvrir_inscriptions(self):
        # Un anonyme ne peut pas modifier les paramètres
        self.assertEqual(
            self.client.patch("/api/admin/parametres/", {"inscriptions_ouvertes": False}, format="json").status_code,
            401,
        )

        # Connexion admin
        get_user_model().objects.create_user("admin_params", password="motdepasse-test", is_staff=True)
        tok = self.client.post("/api/admin/connexion/", {"username": "admin_params", "password": "motdepasse-test"}).data["token"]
        auth = {"HTTP_AUTHORIZATION": f"Token {tok}"}

        # Par défaut, la plateforme est réouverte
        self.assertTrue(self.client.get("/api/infos/").data["inscriptions_ouvertes"])

        # L'admin ferme les inscriptions en 1 clic
        r_ferme = self.client.patch("/api/admin/parametres/", {"inscriptions_ouvertes": False}, format="json", **auth)
        self.assertEqual(r_ferme.status_code, 200)
        self.assertFalse(r_ferme.data["inscriptions_ouvertes"])
        self.assertFalse(self.client.get("/api/infos/").data["inscriptions_ouvertes"])

        # Le dépôt public est bloqué (403)
        r_bloque = self.client.post("/api/inscriptions/", PAYLOAD, format="json")
        self.assertEqual(r_bloque.status_code, 403)
        self.assertEqual(Inscription.objects.count(), 0)

        # L'admin réouvre les inscriptions
        r_ouvert = self.client.patch("/api/admin/parametres/", {"inscriptions_ouvertes": True}, format="json", **auth)
        self.assertEqual(r_ouvert.status_code, 200)
        self.assertTrue(r_ouvert.data["inscriptions_ouvertes"])
        r_ok = self.client.post("/api/inscriptions/", PAYLOAD, format="json")
        self.assertEqual(r_ok.status_code, 201)

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


@override_settings(DATE_LIMITE_INSCRIPTION="2099-12-31T23:59:59+00:00")
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

    def test_reinitialiser_acceptations(self):
        ins = self._inscrire("Groupe Reinit", "reinit@exemple.sn", Inscription.Statut.ACCEPTE)
        ins.acceptation_envoyee_le = timezone.now()
        ins.save()
        self.assertEqual(Inscription.objects.filter(acceptation_envoyee_le__isnull=False).count(), 1)
        r = self.client.post("/api/admin/inscriptions/reinitialiser-acceptations/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["reinitialises"], 1)
        self.assertEqual(Inscription.objects.filter(acceptation_envoyee_le__isnull=False).count(), 0)

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


@override_settings(DATE_LIMITE_CANDIDATURES="2099-12-31T23:59:59+00:00")
class CandidaturePosteTests(APITestCase):
    def test_candidatures_closes_apres_la_date_limite(self):
        with override_settings(DATE_LIMITE_CANDIDATURES="2020-01-01T00:00:00+00:00"):
            infos = self.client.get("/api/infos/").data
            self.assertFalse(infos["candidatures_ouvertes"])
            r = self.client.post("/api/candidatures/", {"nom": "Diop"}, format="json")
            self.assertEqual(r.status_code, 403)
            self.assertEqual(r.data["code"], "candidatures_closes")
            r = self.client.post("/api/candidatures/video/autorisation/",
                                 {"nom_fichier": "v.mp4", "type": "video/mp4", "taille": 1000}, format="json")
            self.assertEqual(r.status_code, 403)
        self.assertTrue(self.client.get("/api/infos/").data["candidatures_ouvertes"])

    def setUp(self):
        cache.clear()
        self.admin = get_user_model().objects.create_superuser("admin_elections", "admin@ciat.sn", "secret123")
        r = self.client.post("/api/admin/connexion/", {"username": "admin_elections", "password": "secret123"}, format="json")
        self.token = r.data["token"]
        self.auth_headers = {"HTTP_AUTHORIZATION": f"Token {self.token}"}

    def _creer_image(self):
        import io
        from PIL import Image
        from django.core.files.uploadedfile import SimpleUploadedFile
        f = io.BytesIO()
        im = Image.new("RGB", (100, 100), color="blue")
        im.save(f, "jpeg")
        f.seek(0)
        return SimpleUploadedFile("photo.jpg", f.read(), content_type="image/jpeg")

    def test_liste_postes_disponibles(self):
        r = self.client.get("/api/candidatures/postes/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 13)
        codes = [p["code"] for p in r.data]
        self.assertIn("PRESIDENT", codes)
        self.assertIn("CHEF_CELLULE_TIC", codes)
        self.assertIn("CHEF_CELLULE_AUTOMOBILE", codes)
        self.assertIn("CHEF_CELLULE_FEMMES", codes)

    def test_candidature_sans_photo_echoue(self):
        payload = {
            "poste": "PRESIDENT",
            "nom": "Sall",
            "prenom": "Mamadou",
            "email": "mamadou.sall@isep.sn",
            "telephone": "771234567",
            "departement": "TIC",
            "metier": "Développement Backend",
            "profession_de_foi": "Je souhaite porter la vision du club pour dynamiser les projets étudiants.",
        }
        r = self.client.post("/api/candidatures/", payload, format="multipart")
        self.assertEqual(r.status_code, 400)
        self.assertIn("photo", r.data)

    def test_candidature_valide_avec_photo(self):
        payload = {
            "poste": "PRESIDENT",
            "nom": "Sall",
            "prenom": "Mamadou",
            "email": "mamadou.sall@isep.sn",
            "telephone": "771234567",
            "departement": "TIC",
            "metier": "Développement Backend",
            "profession_de_foi": "Je souhaite porter la vision du club pour dynamiser les projets étudiants.",
            "photo": self._creer_image(),
            "lien_video": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        }
        r = self.client.post("/api/candidatures/", payload, format="multipart")
        self.assertEqual(r.status_code, 201, r.data)
        from .models import CandidaturePoste
        c = CandidaturePoste.objects.get(email="mamadou.sall@isep.sn")
        self.assertEqual(c.poste, "PRESIDENT")
        self.assertEqual(c.statut, CandidaturePoste.Statut.EN_ATTENTE)

    def test_email_unique_par_candidat(self):
        payload = {
            "poste": "PRESIDENT",
            "nom": "Sall",
            "prenom": "Mamadou",
            "email": "mamadou.sall@isep.sn",
            "telephone": "771234567",
            "departement": "TIC",
            "metier": "Développement Backend",
            "profession_de_foi": "Je souhaite porter la vision du club pour dynamiser les projets étudiants.",
            "photo": self._creer_image(),
        }
        r1 = self.client.post("/api/candidatures/", payload, format="multipart")
        self.assertEqual(r1.status_code, 201)

        # Deuxième tentative avec le même e-mail pour un autre poste
        payload2 = {
            **payload,
            "poste": "VICE_PRESIDENT",
            "photo": self._creer_image(),
        }
        r2 = self.client.post("/api/candidatures/", payload2, format="multipart")
        self.assertEqual(r2.status_code, 400)
        self.assertIn("email", r2.data)

    def test_backoffice_changer_statut_candidature(self):
        from .models import CandidaturePoste
        c = CandidaturePoste.objects.create(
            poste="CHEF_CELLULE_TIC",
            nom="Diop",
            prenom="Awa",
            email="awa.diop@isep.sn",
            telephone="781234567",
            departement="TIC",
            metier="Développement Frontend",
            profession_de_foi="Dynamiser les hackathons et l'IoT au sein de la cellule.",
            photo=self._creer_image(),
        )

        # Consultation en admin
        r = self.client.get("/api/admin/candidatures/", **self.auth_headers)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 1)

        # Validation de la candidature pour le vote
        r_valide = self.client.post(
            f"/api/admin/candidatures/{c.id}/changer-statut/",
            {"statut": "VALIDE", "notes_admin": "Dossier complet, excellente vidéo."},
            format="json",
            **self.auth_headers,
        )
        self.assertEqual(r_valide.status_code, 200)
        c.refresh_from_db()
        self.assertEqual(c.statut, "VALIDE")
        self.assertEqual(c.notes_admin, "Dossier complet, excellente vidéo.")

    def test_backoffice_supprimer_candidature(self):
        from .models import CandidaturePoste
        c = CandidaturePoste.objects.create(
            poste="TRESORIER",
            nom="Ndiaye",
            prenom="Cheikh",
            email="cheikh.ndiaye@isep.sn",
            telephone="770001122",
            departement="TIC",
            metier="Cybersécurité",
            profession_de_foi="Garantir une gestion financière transparente du club.",
            photo=self._creer_image(),
        )

        # Un utilisateur anonyme ne peut pas supprimer
        r_anon = self.client.delete(f"/api/admin/candidatures/{c.id}/")
        self.assertEqual(r_anon.status_code, 401)
        self.assertTrue(CandidaturePoste.objects.filter(pk=c.pk).exists())

        # Un administrateur authentifié peut supprimer
        r_del = self.client.delete(f"/api/admin/candidatures/{c.id}/", **self.auth_headers)
        self.assertEqual(r_del.status_code, 204)
        self.assertFalse(CandidaturePoste.objects.filter(pk=c.pk).exists())

    @override_settings(DEBUG=False)
    def test_media_servi_en_production_debug_false(self):
        from .models import CandidaturePoste
        c = CandidaturePoste.objects.create(
            poste="PRESIDENT",
            nom="Sene",
            prenom="Pape Alioune",
            email="pape.media@isep.sn",
            telephone="775045567",
            departement="TIC",
            metier="Analyse de Performance Digitale",
            profession_de_foi="Porter les projets étudiants du CIAT vers l'excellence.",
            photo=self._creer_image(),
        )
        r = None
        try:
            r = self.client.get(c.photo.url)
            self.assertEqual(r.status_code, 200)
            contenu = b"".join(r.streaming_content)
            self.assertGreater(len(contenu), 0)
        finally:
            if r is not None:
                r.close()
            if c.photo:
                c.photo.delete(save=False)

    def test_backoffice_supprimer_video_candidature(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        from .models import CandidaturePoste

        video = SimpleUploadedFile("campagne.mp4", b"fake-mp4-data", content_type="video/mp4")
        c = CandidaturePoste.objects.create(
            poste="RESPONSABLE_COMMUNICATION",
            nom="Fall",
            prenom="Moussa",
            email="moussa.video@isep.sn",
            telephone="778889900",
            departement="TIC",
            metier="Développement Frontend",
            profession_de_foi="Donner une forte visibilité digitale aux projets des étudiants.",
            photo=self._creer_image(),
            lien_video="https://youtu.be/campagne",
            fichier_video=video,
        )
        try:
            # Un anonyme ne peut pas supprimer la vidéo
            r_anon = self.client.delete(f"/api/admin/candidatures/{c.id}/supprimer-video/")
            self.assertEqual(r_anon.status_code, 401)

            # L'admin supprime la vidéo tout en conservant la candidature
            r_ok = self.client.delete(f"/api/admin/candidatures/{c.id}/supprimer-video/", **self.auth_headers)
            self.assertEqual(r_ok.status_code, 200)
            c.refresh_from_db()
            self.assertFalse(bool(c.fichier_video))
            self.assertEqual(c.lien_video, "")
            self.assertTrue(CandidaturePoste.objects.filter(pk=c.pk).exists())
        finally:
            if c.photo:
                c.photo.delete(save=False)
            if c.fichier_video:
                c.fichier_video.delete(save=False)

    def test_telephone_unique_et_anti_typo_email(self):
        # 1. Faute de frappe typique @gamil.com bloquée immédiatement
        r_typo = self.client.post("/api/candidatures/", {
            "poste": "RESPONSABLE_COMMUNICATION",
            "nom": "Fall",
            "prenom": "Adji",
            "email": "adjifall@gamil.com",
            "telephone": "789109712",
            "departement": "Automobile",
            "metier": "Technicien Supérieur en Carrosserie et Peinture Automobile",
            "profession_de_foi": "Je souhaite dynamiser la cellule et les projets automobiles.",
            "photo": self._creer_image(),
        }, format="multipart")
        self.assertEqual(r_typo.status_code, 400)
        self.assertIn("email", r_typo.data)
        self.assertIn("gmail.com", str(r_typo.data["email"][0]))

        # 2. Candidature valide avec le bon e-mail
        r_ok = self.client.post("/api/candidatures/", {
            "poste": "CHEF_CELLULE_AUTOMOBILE",
            "nom": "Fall",
            "prenom": "Adji",
            "email": "adjifall@gmail.com",
            "telephone": "78 910 97 12",
            "departement": "Automobile",
            "metier": "Technicien Supérieur en Carrosserie et Peinture Automobile",
            "profession_de_foi": "Je souhaite dynamiser la cellule et les projets automobiles.",
            "photo": self._creer_image(),
        }, format="multipart")
        self.assertEqual(r_ok.status_code, 201, r_ok.data)

        # 3. Deuxième candidature sur un autre poste avec un autre e-mail MAIS le même téléphone (+221...)
        r_dup_tel = self.client.post("/api/candidatures/", {
            "poste": "RESPONSABLE_COMMUNICATION",
            "nom": "Fall",
            "prenom": "Adji",
            "email": "adji.autre@isep.sn",
            "telephone": "+221 789109712",
            "departement": "Automobile",
            "metier": "Technicien Supérieur en Carrosserie et Peinture Automobile",
            "profession_de_foi": "Je souhaite aussi porter la communication du club.",
            "photo": self._creer_image(),
        }, format="multipart")
        self.assertEqual(r_dup_tel.status_code, 400)
        self.assertIn("telephone", r_dup_tel.data)

        # 4. Variante Gmail (points / +tag) bloquée même avec un téléphone différent
        r_dup_gmail = self.client.post("/api/candidatures/", {
            "poste": "TRESORIER",
            "nom": "Fall",
            "prenom": "Adji",
            "email": "adji.fall+2@gmail.com",
            "telephone": "770009988",
            "departement": "Automobile",
            "metier": "Technicien Supérieur en Carrosserie et Peinture Automobile",
            "profession_de_foi": "Je souhaite aussi candidater comme trésorière du club.",
            "photo": self._creer_image(),
        }, format="multipart")
        self.assertEqual(r_dup_gmail.status_code, 400)
        self.assertIn("email", r_dup_gmail.data)


class DiffusionWhatsAppTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.admin = get_user_model().objects.create_superuser("admin_wa", "adminwa@ciat.sn", "secret123")
        r = self.client.post("/api/admin/connexion/", {"username": "admin_wa", "password": "secret123"}, format="json")
        self.auth_headers = {"HTTP_AUTHORIZATION": f"Token {r.data['token']}"}

    def _creer_image(self):
        import io
        from PIL import Image
        from django.core.files.uploadedfile import SimpleUploadedFile
        f = io.BytesIO()
        Image.new("RGB", (50, 50), color="brown").save(f, "jpeg")
        f.seek(0)
        return SimpleUploadedFile("photo.jpg", f.read(), content_type="image/jpeg")

    def test_diffusion_whatsapp_sans_aucun_doublon(self):
        from .models import CandidaturePoste, EnvoiDiffusion

        # 1. Deux groupes dont le 1er est accepté (chef Awa), le 2nd rejeté (ne doit pas recevoir)
        ins1 = Inscription.objects.create(
            nom_groupe="Les Pionniers",
            nom_projet="EcoSol",
            email="awa.diop@gmail.com",
            description_projet="Solution solaire innovante pour l'agriculture.",
            engagement=True,
            statut=Inscription.Statut.ACCEPTE,
        )
        Membre.objects.create(inscription=ins1, nom="Diop", prenom="Awa", departement="TIC", metier="Développement Backend")

        ins_rejet = Inscription.objects.create(
            nom_groupe="Rejetés",
            nom_projet="Autre",
            email="rejet@exemple.sn",
            description_projet="Projet non retenu.",
            engagement=True,
            statut=Inscription.Statut.REJETE,
        )
        Membre.objects.create(inscription=ins_rejet, nom="Rejet", prenom="Test", departement="TIC", metier="Développement Backend")

        # 2. Candidats aux élections :
        # - Awa postule aussi aux élections avec une variante Gmail (points/+tag) -> doublon, 1 seul envoi !
        # - Adji a deux candidatures (une @gmail.com valide, une faute @gamil.com + même tel) -> 1 seul envoi sur @gmail.com !
        c_awa = CandidaturePoste.objects.create(
            poste="PRESIDENT",
            nom="Diop",
            prenom="Awa",
            email="awadiop+vote@gmail.com",
            telephone="771112233",
            departement="TIC",
            metier="Développement Backend",
            profession_de_foi="Porter le club avec ambition.",
            photo=self._creer_image(),
        )
        c_adji_ok = CandidaturePoste.objects.create(
            poste="CHEF_CELLULE_AUTOMOBILE",
            nom="Fall",
            prenom="Adji",
            email="adjifall@gmail.com",
            telephone="789109712",
            departement="Automobile",
            metier="Technicien Supérieur en Carrosserie et Peinture Automobile",
            profession_de_foi="Dynamiser la cellule automobile.",
            photo=self._creer_image(),
        )
        c_adji_typo = CandidaturePoste.objects.create(
            poste="RESPONSABLE_COMMUNICATION",
            nom="Fall",
            prenom="Adji",
            email="adjifall@gamil.com",
            telephone="789109712",
            departement="Automobile",
            metier="Technicien Supérieur en Carrosserie et Peinture Automobile",
            profession_de_foi="Dynamiser la communication.",
            photo=self._creer_image(),
        )

        try:
            # Anonyme refusé
            self.assertEqual(self.client.get("/api/admin/diffusion-whatsapp/").status_code, 401)

            # Stats admin : exactement 2 destinataires uniques (Awa + Adji), rejeté et typo exclus
            r_stats = self.client.get("/api/admin/diffusion-whatsapp/", **self.auth_headers)
            self.assertEqual(r_stats.status_code, 200)
            self.assertEqual(r_stats.data["total_uniques"], 2)
            self.assertEqual(r_stats.data["restants"], 2)

            # Aperçu HTML avec le lien exact
            import html as html_lib
            lien = "https://chat.whatsapp.com/B9fvO74CedrJwrstzSCkWj?s=sw&p=i&iam=2"
            r_apercu = self.client.post("/api/admin/diffusion-whatsapp/apercu/", {"lien_whatsapp": lien}, format="json", **self.auth_headers)
            self.assertEqual(r_apercu.status_code, 200)
            self.assertIn(lien, html_lib.unescape(r_apercu.data["html"]))

            # Envoi effectif -> exactement 2 e-mails envoyés
            mail.outbox.clear()
            r_envoi = self.client.post("/api/admin/diffusion-whatsapp/", {"lien_whatsapp": lien, "limite": 10}, format="json", **self.auth_headers)
            self.assertEqual(r_envoi.status_code, 200)
            self.assertEqual(len(r_envoi.data["envoyes"]), 2)
            self.assertEqual(r_envoi.data["restants"], 0)
            self.assertEqual(len(mail.outbox), 2)
            destinataires_reels = {m.to[0] for m in mail.outbox}
            self.assertEqual(destinataires_reels, {"awa.diop@gmail.com", "adjifall@gmail.com"})
            self.assertIn(lien, mail.outbox[0].body)
            self.assertEqual(EnvoiDiffusion.objects.filter(canal="WHATSAPP").count(), 2)

            # Deuxième clic sur Envoyer -> 0 nouvel e-mail envoyé (anti-doublon garanti)
            mail.outbox.clear()
            r_re_envoi = self.client.post("/api/admin/diffusion-whatsapp/", {"lien_whatsapp": lien, "limite": 10}, format="json", **self.auth_headers)
            self.assertEqual(r_re_envoi.status_code, 200)
            self.assertEqual(len(r_re_envoi.data["envoyes"]), 0)
            self.assertEqual(len(mail.outbox), 0)
        finally:
            for obj in (c_awa, c_adji_ok, c_adji_typo):
                if obj.photo:
                    obj.photo.delete(save=False)


class DiffusionAppelCandidaturesTests(APITestCase):
    """Diffusion de l'appel à candidatures avec l'affiche à TOUS les e-mails de la plateforme (y compris rejetés)."""

    def setUp(self):
        cache.clear()
        self.admin = get_user_model().objects.create_superuser("admin_diff", "admindiff@ciat.sn", "secret123")
        r = self.client.post("/api/admin/connexion/", {"username": "admin_diff", "password": "secret123"}, format="json")
        self.auth_headers = {"HTTP_AUTHORIZATION": f"Token {r.data['token']}"}

    def _creer_image(self):
        import io
        from PIL import Image
        from django.core.files.uploadedfile import SimpleUploadedFile
        f = io.BytesIO()
        Image.new("RGB", (50, 50), color="brown").save(f, "jpeg")
        f.seek(0)
        return SimpleUploadedFile("photo.jpg", f.read(), content_type="image/jpeg")

    def test_diffusion_appel_candidatures_a_tous_sans_doublon(self):
        from django.core.management import call_command
        from .models import CandidaturePoste, EnvoiDiffusion

        # 1. Groupe accepté + Groupe rejeté (doit être inclus comme demandé explicitement)
        ins1 = Inscription.objects.create(
            nom_groupe="Groupe Vert",
            nom_projet="AgroBio",
            email="vert.chef@gmail.com",
            description_projet="Description projet",
            engagement=True,
            statut=Inscription.Statut.ACCEPTE,
        )
        Membre.objects.create(inscription=ins1, nom="Sow", prenom="Moussa", departement="TIC", metier="Développement Backend")

        ins_rejet = Inscription.objects.create(
            nom_groupe="Groupe Non Retenu",
            nom_projet="Projet Test",
            email="nonretenu@exemple.sn",
            description_projet="Description",
            engagement=True,
            statut=Inscription.Statut.REJETE,
        )
        Membre.objects.create(inscription=ins_rejet, nom="Ba", prenom="Amadou", departement="TIC", metier="Développement Backend")

        # 2. Candidat avec faute de frappe corrigée et candidat avec doublon
        c_candidat = CandidaturePoste.objects.create(
            poste="PRESIDENT",
            nom="Diallo",
            prenom="Mariama",
            email="mariama.diallo@gamil.com",  # Coquille corrigée automatiquement en @gmail.com
            telephone="771234567",
            departement="TIC",
            metier="Développement Frontend",
            profession_de_foi="Porter la voix des étudiants.",
            photo=self._creer_image(),
        )

        try:
            # Vérification de l'aperçu API
            r_ap = self.client.get("/api/admin/diffusion-elections/apercu/", **self.auth_headers)
            self.assertEqual(r_ap.status_code, 200)
            self.assertIn("club-entrepreneuriat-ciat.vercel.app/elections", r_ap.data["html"])
            self.assertIn("13 postes sont à pourvoir", r_ap.data["html"])

            # Vérification des statistiques de diffusion via API
            r_get = self.client.get("/api/admin/diffusion-elections/", **self.auth_headers)
            self.assertEqual(r_get.status_code, 200)
            # 3 destinataires uniques attendus : vert.chef@gmail.com, nonretenu@exemple.sn, mariama.diallo@gmail.com
            self.assertEqual(r_get.data["total_uniques"], 3)
            self.assertEqual(r_get.data["restants"], 3)

            # Test de la commande de management Django
            mail.outbox.clear()
            call_command("diffuser_appel_candidatures", limite=2)
            self.assertEqual(len(mail.outbox), 2)
            self.assertEqual(EnvoiDiffusion.objects.filter(canal="ELECTIONS_APPEL").count(), 2)

            # Deuxième passage pour terminer le restant
            call_command("diffuser_appel_candidatures")
            self.assertEqual(len(mail.outbox), 3)
            self.assertEqual(EnvoiDiffusion.objects.filter(canal="ELECTIONS_APPEL").count(), 3)

            # Troisième passage -> 0 envoi (anti-doublon garanti)
            mail.outbox.clear()
            call_command("diffuser_appel_candidatures")
            self.assertEqual(len(mail.outbox), 0)  # Aucun nouvel e-mail envoyé car déjà tous notifiés

            # Vérification du contenu
            from .emails import _message_appel_candidatures
            m = _message_appel_candidatures("test@isep.sn", "Bonjour Mariama,")
            self.assertIn("club-entrepreneuriat-ciat.vercel.app/elections", m.body)
            self.assertIn("13 postes sont à pourvoir", m.body)
            self.assertIn("lundi à 23h59", m.body)
        finally:
            if c_candidat.photo:
                c_candidat.photo.delete(save=False)



R2_TEST = dict(R2_ACCOUNT_ID="0123456789abcdef0123456789abcdef", R2_ACCESS_KEY_ID="AKIATEST",
               R2_SECRET_ACCESS_KEY="secret-test", R2_BUCKET="ciat-videos", R2_VIDEO_TAILLE_MAX_MO=100)


@override_settings(DATE_LIMITE_CANDIDATURES="2099-12-31T23:59:59+00:00")
class VideoR2Tests(APITestCase):
    """Envoi direct des vidéos de campagne du navigateur vers Cloudflare R2."""

    def setUp(self):
        cache.clear()
        get_user_model().objects.create_superuser("admin_r2", "r2@ciat.sn", "secret123")
        r = self.client.post("/api/admin/connexion/", {"username": "admin_r2", "password": "secret123"}, format="json")
        self.auth = {"HTTP_AUTHORIZATION": f"Token {r.data['token']}"}

    def _photo(self):
        import io as _io
        from PIL import Image
        from django.core.files.uploadedfile import SimpleUploadedFile
        f = _io.BytesIO()
        Image.new("RGB", (60, 60), color="red").save(f, "jpeg")
        return SimpleUploadedFile("photo.jpg", f.getvalue(), content_type="image/jpeg")

    def _payload(self, i=1, **extra):
        return {"poste": "PRESIDENT", "nom": "Sarr", "prenom": f"Awa{i}", "email": f"awa{i}.sarr@isep.sn",
                "telephone": f"77100000{i}", "departement": "TIC", "metier": "Développement Backend",
                "profession_de_foi": "Je veux structurer le club et accompagner chaque projet étudiant.",
                "photo": self._photo(), **extra}

    def _autorisation(self, taille=10_000_000, type_mime="video/mp4"):
        return self.client.post("/api/candidatures/video/autorisation/",
                                {"nom_fichier": "campagne.mp4", "type": type_mime, "taille": taille}, format="json")

    def test_sans_r2_ancien_mode_et_503(self):
        with self.settings(R2_ACCOUNT_ID=""):
            self.assertFalse(self.client.get("/api/infos/").data["video_envoi_direct"])
            self.assertEqual(self._autorisation().status_code, 503)

    def test_autorisation_url_signee_liee_au_type_et_a_la_taille(self):
        from urllib.parse import parse_qs, urlsplit
        with self.settings(**R2_TEST):
            infos = self.client.get("/api/infos/").data
            self.assertTrue(infos["video_envoi_direct"])
            self.assertEqual(infos["video_taille_max_mo"], 100)
            r = self._autorisation(taille=52_428_800)
            self.assertEqual(r.status_code, 200, r.data)
            u = urlsplit(r.data["url"])
            self.assertEqual(u.netloc, "0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com")
            self.assertTrue(u.path.startswith("/ciat-videos/candidatures/videos/"))
            q = parse_qs(u.query)
            self.assertEqual(q["X-Amz-SignedHeaders"], ["content-length;content-type;host"])
            self.assertEqual(q["X-Amz-Expires"], ["1800"])
            self.assertEqual(r.data["entetes"], {"Content-Type": "video/mp4"})

    def test_autorisation_refuse_format_et_taille(self):
        with self.settings(**R2_TEST):
            self.assertEqual(self._autorisation(type_mime="application/pdf").status_code, 400)
            self.assertEqual(self._autorisation(taille=101 * 1024 * 1024).status_code, 400)
            self.assertEqual(self._autorisation(taille=0).status_code, 400)

    def test_candidature_avec_video_r2_serveur_sans_acces_reseau(self):
        """Cas PythonAnywhere gratuit : R2 injoignable depuis le serveur, la candidature passe."""
        from unittest import mock
        with self.settings(**R2_TEST), mock.patch("inscriptions.stockage_r2.verifier_objet", return_value=("injoignable", None)):
            jeton = self._autorisation().data["jeton"]
            r = self.client.post("/api/candidatures/", self._payload(video_jeton=jeton), format="multipart")
            self.assertEqual(r.status_code, 201, r.data)
            c = CandidaturePoste.objects.get()
            self.assertTrue(c.video_r2_cle.startswith("candidatures/videos/"))
            self.assertFalse(c.fichier_video)
            # Le même jeton ne peut pas servir à une 2e candidature
            r2 = self.client.post("/api/candidatures/", self._payload(2, video_jeton=jeton), format="multipart")
            self.assertEqual(r2.status_code, 400)

    def test_video_absente_ou_trop_grosse_refusee_si_r2_joignable(self):
        from unittest import mock
        with self.settings(**R2_TEST):
            jeton = self._autorisation().data["jeton"]
            with mock.patch("inscriptions.stockage_r2.verifier_objet", return_value=("absent", None)):
                r = self.client.post("/api/candidatures/", self._payload(video_jeton=jeton), format="multipart")
                self.assertEqual(r.status_code, 400)
            with mock.patch("inscriptions.stockage_r2.verifier_objet", return_value=("ok", 200 * 1024 * 1024)):
                r = self.client.post("/api/candidatures/", self._payload(video_jeton=jeton), format="multipart")
                self.assertEqual(r.status_code, 400)
            self.assertFalse(CandidaturePoste.objects.exists())

    def test_jeton_falsifie_refuse(self):
        from django.core import signing
        with self.settings(**R2_TEST):
            faux = signing.dumps({"cle": "candidatures/videos/pirate.mp4", "taille": 1}, salt="autre-sel")
            r = self.client.post("/api/candidatures/", self._payload(video_jeton=faux), format="multipart")
            self.assertEqual(r.status_code, 400)
            self.assertIn("video_jeton", r.data)

    def test_envoi_par_le_serveur_bloque_quand_r2_configure(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        with self.settings(**R2_TEST):
            video = SimpleUploadedFile("c.mp4", b"x" * 100, content_type="video/mp4")
            r = self.client.post("/api/candidatures/", self._payload(fichier_video=video), format="multipart")
            self.assertEqual(r.status_code, 400)
            self.assertIn("fichier_video", r.data)

    def test_admin_lecture_et_suppression_par_le_navigateur(self):
        from unittest import mock
        with self.settings(**R2_TEST), mock.patch("inscriptions.stockage_r2.verifier_objet", return_value=("injoignable", None)):
            jeton = self._autorisation().data["jeton"]
            self.client.post("/api/candidatures/", self._payload(video_jeton=jeton), format="multipart")
            c = CandidaturePoste.objects.get()
            liste = self.client.get("/api/admin/candidatures/", **self.auth).data
            fiche = liste[0] if isinstance(liste, list) else liste["results"][0]
            self.assertIn("X-Amz-Signature=", fiche["video_url"])
            self.assertIn("X-Amz-Expires=43200", fiche["video_url"])
            # Serveur sans accès à R2 : il renvoie une URL DELETE signée pour le navigateur de l'admin
            with mock.patch("inscriptions.stockage_r2.supprimer_objet", return_value=False):
                r = self.client.delete(f"/api/admin/candidatures/{c.id}/supprimer-video/", **self.auth)
            self.assertIn("X-Amz-Signature=", r.data["r2_suppression_url"])
            c.refresh_from_db()
            self.assertEqual(c.video_r2_cle, "")
            # Serveur avec accès à R2 : il supprime lui-même, rien à faire côté navigateur
            c.video_r2_cle = "candidatures/videos/x.mp4"
            c.save()
            with mock.patch("inscriptions.stockage_r2.supprimer_objet", return_value=True):
                r = self.client.delete(f"/api/admin/candidatures/{c.id}/", **self.auth)
            self.assertEqual(r.status_code, 204)  # supprimée par le serveur : rien à faire côté navigateur
            self.assertFalse(CandidaturePoste.objects.exists())
