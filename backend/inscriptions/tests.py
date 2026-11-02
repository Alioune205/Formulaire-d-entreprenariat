import re
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import CodeVerification, Inscription

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
        self.assertEqual(ins.membres.count(), 2)
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
        r = self.client.post("/api/inscriptions/", {**PAYLOAD, "membres": [mauvais]}, format="json")
        self.assertEqual(r.status_code, 400)
        inconnu = {**PAYLOAD["membres"][0], "departement": "Agriculture"}
        r = self.client.post("/api/inscriptions/", {**PAYLOAD, "membres": [inconnu]}, format="json")
        self.assertEqual(r.status_code, 400)

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
