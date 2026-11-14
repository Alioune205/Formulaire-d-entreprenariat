"""Calcul du récapitulatif (statistiques) affiché dans le back-office."""
from collections import Counter

from django.utils import timezone

from .genre import genre_effectif
from .models import Inscription, Membre
from .serializers import FILIERES

GENRES = {Membre.Genre.FILLE: "filles", Membre.Genre.GARCON: "garcons", "": "non_renseigne"}
# "non_renseigne" = prénom non reconnu par l'estimation et pas encore corrigé par un admin.


def _compteur_genre():
    return {"total": 0, "filles": 0, "garcons": 0, "non_renseigne": 0}


def _ajouter(c, membre):
    c["total"] += 1
    c[GENRES.get(genre_effectif(membre), "non_renseigne")] += 1


def _pct(n, total):
    return round(100 * n / total, 1) if total else 0.0


def calculer_recap(statut=None):
    qs = Inscription.objects.prefetch_related("membres")
    if statut:
        qs = qs.filter(statut=statut)
    inscriptions = list(qs)
    membres = [m for ins in inscriptions for m in ins.membres.all()]

    # Genre
    genre = _compteur_genre()
    for m in membres:
        _ajouter(genre, m)

    # Départements et filières (toutes les filières connues apparaissent, même à zéro)
    departements = {d: _compteur_genre() for d in FILIERES}
    filieres = {(d, f): _compteur_genre() for d, liste in FILIERES.items() for f in liste}
    for m in membres:
        _ajouter(departements.setdefault(m.departement or "Autre", _compteur_genre()), m)
        _ajouter(filieres.setdefault((m.departement or "Autre", m.metier or "Non précisée"), _compteur_genre()), m)

    total_membres = len(membres)
    total_groupes = len(inscriptions)

    # Groupes
    tailles = Counter(len(ins.membres.all()) for ins in inscriptions)
    mixtes = sum(1 for ins in inscriptions if len({m.departement for m in ins.membres.all()}) > 1)
    avec_fille = sum(1 for ins in inscriptions if any(genre_effectif(m) == Membre.Genre.FILLE for m in ins.membres.all()))
    chefs_filles = sum(
        1 for ins in inscriptions
        if (chef := min(ins.membres.all(), key=lambda m: m.id, default=None)) and genre_effectif(chef) == Membre.Genre.FILLE
    )

    # Inscriptions par jour (heure de Dakar)
    par_jour = Counter(timezone.localtime(ins.cree_le).date().isoformat() for ins in inscriptions)

    # Tous statuts confondus (indépendant du filtre) + suivi des e-mails d'acceptation
    tous = Inscription.objects.all()
    acceptes = tous.filter(statut=Inscription.Statut.ACCEPTE)

    return {
        "filtre_statut": statut or "",
        "groupes": total_groupes,
        "membres": total_membres,
        "moyenne_membres": round(total_membres / total_groupes, 1) if total_groupes else 0,
        "genre_corriges": sum(1 for m in membres if m.genre),
        "genre": {**genre, "pct_filles": _pct(genre["filles"], total_membres),
                  "pct_garcons": _pct(genre["garcons"], total_membres),
                  "pct_non_renseigne": _pct(genre["non_renseigne"], total_membres),
                  # Parmi les membres dont le genre est connu : filles + garçons = 100 %
                  "identifies": genre["filles"] + genre["garcons"],
                  "pct_filles_identifies": _pct(genre["filles"], genre["filles"] + genre["garcons"]),
                  "pct_garcons_identifies": _pct(genre["garcons"], genre["filles"] + genre["garcons"])},
        "departements": [
            {"departement": d, **c, "pct": _pct(c["total"], total_membres)} for d, c in departements.items()
        ],
        "filieres": sorted(
            ({"departement": d, "filiere": f, **c, "pct": _pct(c["total"], total_membres)}
             for (d, f), c in filieres.items()),
            key=lambda x: (x["departement"], -x["total"], x["filiere"]),
        ),
        "tailles_groupes": [{"taille": t, "groupes": n} for t, n in sorted(tailles.items())],
        "groupes_mixtes": mixtes,
        "groupes_avec_fille": avec_fille,
        "chefs_de_projet_filles": chefs_filles,
        "par_jour": [{"jour": j, "groupes": n} for j, n in sorted(par_jour.items())],
        "statuts": {s.value: tous.filter(statut=s.value).count() for s in Inscription.Statut},
        "acceptation": {
            "acceptes": tous.filter(statut=Inscription.Statut.ACCEPTE).count(),
            "envoyes": tous.exclude(acceptation_envoyee_le=None).count(),
            "a_envoyer": tous.exclude(statut=Inscription.Statut.REJETE)
                             .filter(acceptation_envoyee_le=None).exclude(email="").count(),
            # Groupes non rejetés sans adresse e-mail (inscrits avant l'ajout du champ) : non joignables
            "sans_email": tous.exclude(statut=Inscription.Statut.REJETE).filter(email="").count(),
            # Groupes qui recevront l'e-mail avec « Envoyer à tous les groupes » (rejetés exclus)
            "eligibles": tous.exclude(statut=Inscription.Statut.REJETE)
                             .filter(acceptation_envoyee_le=None).exclude(email="").count(),
            "non_acceptes": tous.filter(statut=Inscription.Statut.EN_ATTENTE).count(),
        },
    }
