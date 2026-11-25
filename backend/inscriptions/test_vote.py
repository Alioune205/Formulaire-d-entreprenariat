from unittest import mock

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .models import CandidaturePoste, CompteurVoix, Emargement, Inscription, Membre

OUVERT = {"VOTE_DEBUT": "2000-01-01T00:00:00+00:00", "VOTE_FIN": "2099-12-31T23:59:59+00:00"}
CLOS = {"VOTE_DEBUT": "2000-01-01T00:00:00+00:00", "VOTE_FIN": "2000-01-02T00:00:00+00:00"}
AVANT = {"VOTE_DEBUT": "2099-01-01T00:00:00+00:00", "VOTE_FIN": "2099-12-31T23:59:59+00:00"}


def candidat(poste, prenom, nom, email, statut=CandidaturePoste.Statut.VALIDE):
    return CandidaturePoste.objects.create(
        poste=poste, prenom=prenom, nom=nom, email=email, telephone="770000000", departement="TIC",
        metier="Dev", profession_de_foi="x" * 40, photo="candidatures/photos/x.jpg", statut=statut,
    )


@override_settings(**OUVERT, THROTTLE_DISABLED=True)
class VoteTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        groupe = Inscription.objects.create(nom_groupe="G1", nom_projet="P1", description_projet="d")
        Membre.objects.create(inscription=groupe, prenom="Awa", nom="Ndiaye", departement="TIC", metier="Dev")
        Membre.objects.create(inscription=groupe, prenom="Mamadou Lamine", nom="Fall", departement="TIC", metier="Dev")
        rejete = Inscription.objects.create(nom_groupe="G2", nom_projet="P2", description_projet="d",
                                            statut=Inscription.Statut.REJETE)
        Membre.objects.create(inscription=rejete, prenom="Ousmane", nom="Diop", departement="TIC", metier="Dev")
        self.p1 = candidat("PRESIDENT", "Fatou", "Sow", "fatou@ex.com")
        self.p2 = candidat("PRESIDENT", "Ibou", "Ba", "ibou@ex.com", CandidaturePoste.Statut.EN_ATTENTE)
        self.t1 = candidat("TRESORIER", "Khady", "Gueye", "khady@ex.com")
        candidat("SECRETAIRE_GENERAL", "Rejet", "Rejet", "rejet@ex.com", CandidaturePoste.Statut.REJETE)

    def demander(self, email, prenom, nom):
        with mock.patch("inscriptions.models.secrets.randbelow", return_value=123456):
            return self.client.post("/api/vote/demande/", {"email": email, "prenom": prenom, "nom": nom}, format="json")

    def session(self, email, prenom, nom):
        r = self.demander(email, prenom, nom)
        self.assertEqual(r.status_code, 200, r.data)
        r = self.client.post("/api/vote/verification/", {"email": email, "code": "123456"}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        return r.data["jeton"]

    def test_bulletin_exclut_rejetes_et_vacants(self):
        r = self.client.get("/api/vote/bulletin/")
        codes = [p["code"] for p in r.data["postes"]]
        self.assertEqual(codes, ["PRESIDENT", "TRESORIER"])
        self.assertTrue(r.data["postes"][1]["candidat_unique"])
        self.assertEqual(r.data["vote_etat"], "ouvert")

    def test_parcours_complet_et_secret(self):
        jeton = self.session("awa@ex.com", "  awa ", "NDIAYE")
        r = self.client.post("/api/vote/voter/", {"jeton": jeton, "choix": {
            "PRESIDENT": str(self.p1.id), "TRESORIER": "POUR"}}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertRegex(r.data["recu"], r"^V-[A-Z0-9]{4}-[A-Z0-9]{4}$")
        self.assertEqual(Emargement.objects.count(), 1)
        self.assertEqual(CompteurVoix.objects.get(cle=f"PRESIDENT:CANDIDAT:{self.p1.id}").voix, 1)
        self.assertEqual(CompteurVoix.objects.get(cle=f"TRESORIER:POUR:{self.t1.id}").voix, 1)
        # Le jeton ne permet pas de revoter
        r = self.client.post("/api/vote/voter/", {"jeton": jeton, "choix": {}}, format="json")
        self.assertEqual(r.status_code, 409)
        # Ni le même membre avec une autre adresse, ni la même adresse
        self.assertEqual(self.demander("autre@ex.com", "Awa", "Ndiaye").status_code, 409)
        self.assertEqual(self.demander("a.wa@ex.com", "Mamadou Lamine", "Fall").status_code, 200)
        self.assertEqual(self.demander("awa@ex.com", "Mamadou Lamine", "Fall").status_code, 409)

    def test_gmail_points_meme_adresse(self):
        jeton = self.session("awa.ndiaye@gmail.com", "Awa", "Ndiaye")
        self.client.post("/api/vote/voter/", {"jeton": jeton, "choix": {}}, format="json")
        self.assertEqual(self.demander("awandiaye@gmail.com", "Mamadou Lamine", "Fall").status_code, 409)

    def test_nom_ordre_et_accents(self):
        self.assertEqual(self.demander("x@ex.com", "Fall", "Mamadou-Lamine").status_code, 200)

    def test_non_inscrit_et_groupe_rejete(self):
        self.assertEqual(self.demander("x@ex.com", "Inconnu", "Total").status_code, 404)
        self.assertEqual(self.demander("y@ex.com", "Ousmane", "Diop").status_code, 404)

    def test_candidat_vote_avec_son_email(self):
        self.assertEqual(self.demander("autre@ex.com", "Khady", "Gueye").status_code, 404)
        jeton = self.session("khady@ex.com", "Khady", "Gueye")
        r = self.client.post("/api/vote/voter/", {"jeton": jeton, "choix": {"PRESIDENT": "BLANC"}}, format="json")
        self.assertEqual(r.status_code, 201)
        # Poste oublié = blanc
        self.assertEqual(CompteurVoix.objects.get(cle="TRESORIER:BLANC:").voix, 1)

    def test_choix_invalide_et_code_faux(self):
        self.assertEqual(self.demander("awa@ex.com", "Awa", "Ndiaye").status_code, 200)
        r = self.client.post("/api/vote/verification/", {"email": "awa@ex.com", "code": "000000"}, format="json")
        self.assertEqual(r.status_code, 400)
        r = self.client.post("/api/vote/verification/", {"email": "awa@ex.com", "code": "123456"}, format="json")
        jeton = r.data["jeton"]
        for mauvais in ({"PRESIDENT": "POUR"}, {"TRESORIER": str(self.p1.id)}, {"PRESIDENT": "999"}):
            r = self.client.post("/api/vote/voter/", {"jeton": jeton, "choix": mauvais}, format="json")
            self.assertEqual(r.status_code, 400)
        self.assertEqual(Emargement.objects.count(), 0)
        r = self.client.post("/api/vote/voter/", {"jeton": "faux", "choix": {}}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_vote_ferme(self):
        with override_settings(**AVANT):
            self.assertEqual(self.demander("awa@ex.com", "Awa", "Ndiaye").status_code, 403)
        with override_settings(**CLOS):
            self.assertEqual(self.demander("awa@ex.com", "Awa", "Ndiaye").status_code, 403)

    def test_resultats_admin_uniquement_apres_cloture(self):
        for email, prenom, nom, choix in [
            ("awa@ex.com", "Awa", "Ndiaye", {"PRESIDENT": str(self.p1.id), "TRESORIER": "POUR"}),
            ("m@ex.com", "Mamadou Lamine", "Fall", {"PRESIDENT": str(self.p1.id), "TRESORIER": "CONTRE"}),
        ]:
            jeton = self.session(email, prenom, nom)
            self.client.post("/api/vote/voter/", {"jeton": jeton, "choix": choix}, format="json")

        self.assertEqual(self.client.get("/api/admin/vote/").status_code, 401)
        admin = User.objects.create_superuser("admin", "a@ex.com", "x")
        self.client.force_authenticate(admin)
        r = self.client.get("/api/admin/vote/")
        self.assertEqual(r.data["votants"], 2)
        self.assertIsNone(r.data["resultats"])
        with override_settings(**CLOS):
            r = self.client.get("/api/admin/vote/")
        pres, tres = r.data["resultats"]
        self.assertEqual(pres["candidats"][0]["id"], self.p1.id)
        self.assertTrue(pres["candidats"][0]["elu"])
        self.assertFalse(tres["candidats"][0]["elu"])  # 1 pour, 1 contre
        r = self.client.get("/api/admin/vote/emargement/")
        self.assertEqual(len(r.data), 2)
        self.assertNotIn("choix", r.data[0])


@override_settings(THROTTLE_DISABLED=True)
class HorairesVoteTests(TestCase):
    URL = "/api/admin/vote/horaires/"

    def setUp(self):
        self.admin = APIClient()
        self.admin.force_authenticate(User.objects.create_user("commission", password="x", is_staff=True))

    @override_settings(**AVANT)
    def test_avant_ouverture_on_peut_tout_modifier_avec_motif(self):
        self.assertIn(APIClient().post(self.URL, {}, format="json").status_code, (401, 403))
        r = self.admin.post(self.URL, {"fin": "2099-12-31T20:00:00"}, format="json")
        self.assertEqual(r.status_code, 400)  # motif manquant
        r = self.admin.post(self.URL, {"debut": "2099-01-02T08:00:00", "fin": "2099-12-31T20:00:00",
                                       "motif": "Décision de la commission"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertTrue(r.json()["vote_fin"].startswith("2099-12-31T20:00:00"))
        self.assertEqual(len(r.json()["journal"]), 1)
        publiques = APIClient().get("/api/vote/bulletin/").json()
        self.assertTrue(publiques["vote_debut"].startswith("2099-01-02T08:00:00"))

    @override_settings(**OUVERT)
    def test_pendant_le_vote_on_prolonge_mais_ouverture_figee(self):
        r = self.admin.post(self.URL, {"debut": "2001-01-01T00:00:00", "motif": "Essai ouverture"}, format="json")
        self.assertEqual(r.status_code, 400)
        r = self.admin.post(self.URL, {"fin": "2099-12-31T23:59:59+00:00", "motif": "Prolongation commission"},
                            format="json")
        self.assertEqual(r.status_code, 200, r.content)
        r = self.admin.post(self.URL, {"clore_maintenant": True, "motif": "Clôture anticipée"}, format="json")
        self.assertEqual(r.json()["vote_etat"], "clos")
        r = self.admin.post(self.URL, {"fin": "2099-12-31T23:59:59", "motif": "Réouverture"}, format="json")
        self.assertEqual(r.status_code, 409)

    @override_settings(**CLOS)
    def test_vote_clos_verrouille(self):
        r = self.admin.post(self.URL, {"fin": "2099-12-31T23:59:59", "motif": "Réouverture"}, format="json")
        self.assertEqual(r.status_code, 409)
