"""Estimation du genre à partir du prénom, pour les STATISTIQUES du back-office uniquement.

Ce n'est qu'une estimation : un prénom inconnu ou mixte donne "" (non déterminé).
Une correction saisie par un admin (Membre.genre) est toujours prioritaire.
"""
import unicodedata

FILLE, GARCON = "F", "H"

# Premiers mots qui fixent le genre d'un prénom composé (« Ndèye Fatou », « Pape Alioune »…).
PREFIXES_FILLES = {"ndeye", "ndey", "sokhna", "adja", "adjaratou", "yaye", "yaay", "mareme", "ndella"}
PREFIXES_GARCONS = {"pape", "pap", "serigne", "el", "elhadji", "elhadj", "hadji", "baye", "mor", "cheikh",
                    "cheikhou", "mouhamadou", "mohamadou", "mamadou", "abdou", "abdoul"}
# Mots qui ne décident pas : on regarde le mot suivant (« Mame Diarra » / « Mame Cheikh »).
NEUTRES = {"mame", "maam", "mam", "ndiaye", "seydi"}

FILLES = set("""
aida aissa aissatou aicha awa adama_f aminata amina amy anta astou arame aram assiétou assietou
astou ami bineta binta bintou coumba codou daba dieynaba djeneba diarra dior diouma diama diatou
fatou fatoumata fatima fama fanta fary guedda gnagna hawa haby khady khadija khadidiatou kine
kiné khoudia khady lala lalla mariama marieme maimouna maty marietou mbene mbayang ngone ngoné
nafi nafissatou ndack nogaye oumou oumy ramatoulaye rama rokhaya rokhy salimata safietou sadio_f
seynabou sophie sokhna soda sira souadou tabara thioro yacine yande yandé yaye yassine
penda rougui ramata selbé selbe maguette_f absa adji adjara agnes anna anne aïda awentou
bousso chimere coura dibor fambaye fatim fatime gnilane hapsatou houleye kadiatou khoury
mame_diarra mbossé mbosse mously ndiabou ndioba nene oulimata sagar sala soukeye
sokhna tening thiané thiane yama yaram zeynab zeinab zahra zara ndeye
marie mariam maria fatimata aminta ramou rokia rokiatou nabou nafy dieynaba aissata
claire julie sarah laura camille emma chloe léa lea manon pauline marine charlotte
caroline audrey christine nathalie isabelle sandrine celine céline valerie valérie sylvie
catherine sophie mélanie melanie emilie émilie jessica vanessa stéphanie stephanie aurelie
aurélie amandine elodie élodie anaïs anais clara ines inès jade lina louise alice agathe
grace grâce esther ruth rebecca rachel sara deborah déborah ange angele angèle josephine
joséphine bernadette marthe martine helene hélène odile therese thérèse rose victoire
""".split())

GARCONS = set("""
abdou abdoulaye abdourahmane abdoul abdel abdallah abass abbas aboubacar aboubakry adama
ahmed ahmadou alassane alioune aliou alpha amadou amath ameth amar ansou arona assane
babacar bamba bassirou birame biram bocar boubacar boubacary cheikh cheikhou daouda djibril
dame demba diaw djiby doudou el elhadji fallou fodé fode gora habib ibrahima ibou idrissa
ismaila ismaïla issa jean kalidou khadim khalifa lamine lat latyr malick mamadou mame_cheikh
mansour makhtar mbaye massamba matar modou moussa mouhamed mouhamadou mohamed mohammed
moustapha mor ndiaga nfally ngagne omar oumar ousmane ousseynou pape pathé pathe saliou
samba sambou seydou seydina serigne sidy sidi souleymane souleye talla thierno tidiane
yankhoba yaya yassine sadio maguette seyni youssou youssouf yves zakaria baye birane cherif chérif el_hadji falilou
gallo ibrahim insa khalil lansana madiop makhan mamour masse médoune medoune malamine
massaer mbagnick modou_lo moctar mokhtar momar ndongo nfaly ngor papa racine sadibou
salif seckou sékou sekou sileymane thiam tafsir waly wally yacouba ass aziz abdoulahi
assane alain antoine arnaud benjamin bernard bruno christian christophe daniel david denis
didier dominique eric éric etienne étienne fabrice francois françois frederic frédéric
gabriel georges gerard gérard guillaume henri hugo jacques jerome jérôme joseph julien kevin
laurent louis luc lucas marc martin mathieu matthieu maxime michel nicolas olivier pascal
patrick paul philippe pierre quentin raphael raphaël rene rené richard robert romain samuel
sebastien sébastien serge simon stephane stéphane thierry thomas vincent william yann
""".split())


def _normaliser(texte):
    sans_accents = unicodedata.normalize("NFKD", texte).encode("ascii", "ignore").decode()
    return sans_accents.lower().replace("-", " ").replace("'", " ")


def _sans_accents(mots):
    return {_normaliser(m).replace("_f", "") for m in mots if "_" not in m or m.endswith("_f")}


_FILLES = _sans_accents(FILLES)
_GARCONS = _sans_accents(GARCONS) - _FILLES  # un prénom présent dans les deux listes reste indéterminé
_MIXTES = _sans_accents(FILLES) & _sans_accents(GARCONS)


def estimer_genre(prenom):
    """Renvoie "F", "H" ou "" (non déterminé) d'après le prénom."""
    mots = [m for m in _normaliser(prenom or "").split() if m]
    for mot in mots:
        if mot in PREFIXES_FILLES:
            return FILLE
        if mot in PREFIXES_GARCONS:
            return GARCON
        if mot in NEUTRES or mot in _MIXTES:
            continue  # on regarde le mot suivant
        if mot in _FILLES:
            return FILLE
        if mot in _GARCONS:
            return GARCON
        return ""  # premier mot significatif inconnu : on ne devine pas
    return ""


def genre_effectif(membre):
    """Correction de l'admin si elle existe, sinon estimation par le prénom."""
    return membre.genre or estimer_genre(membre.prenom)
