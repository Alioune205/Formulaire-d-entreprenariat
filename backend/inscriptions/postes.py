"""Définition des 13 postes de gouvernance et de chefs de cellules du Club d'Entrepreneuriat CIAT."""

POSTES_CATALOGUE = [
    # --- Bureau Exécutif (8 postes) ---
    {
        "code": "PRESIDENT",
        "titre": "Président(e)",
        "categorie": "Bureau Exécutif",
        "description": "Direction générale, vision stratégique et représentation officielle du club.",
        "missions": [
            "Représenter le club auprès de la direction du CIAT, de l'ISEP et des partenaires extérieurs.",
            "Définir les orientations stratégiques et le plan d'action annuel de la cohorte.",
            "Coordonner les membres du Bureau et présider les assemblées générales.",
            "Veiller au respect de la charte et des valeurs du club."
        ],
        "profil": "Leadership naturel, excellente communication orale, vision fédératrice et sens des responsabilités."
    },
    {
        "code": "VICE_PRESIDENT",
        "titre": "Vice-Président(e)",
        "categorie": "Bureau Exécutif",
        "description": "Coordination générale des pôles et suppléance de la présidence.",
        "missions": [
            "Assister la présidence dans le pilotage opérationnel des activités.",
            "Assurer la liaison et la synergie entre les 5 cellules thématiques.",
            "Superviser les commissions de travail et assurer l'intérim en cas d'absence.",
            "Garantir le suivi des résolutions prises en réunion."
        ],
        "profil": "Capacité d'écoute, sens de la coordination, diplomatie et rigueur d'exécution."
    },
    {
        "code": "SECRETAIRE_GENERAL",
        "titre": "Secrétaire Général(e)",
        "categorie": "Bureau Exécutif",
        "description": "Gestion administrative, comptes-rendus officiels et suivi des membres.",
        "missions": [
            "Rédiger les procès-verbaux des assemblées et réunions de bureau.",
            "Gérer les archives, le registre officiel des membres et les correspondances.",
            "Organiser les convocations aux réunions et le calendrier associatif.",
            "Assurer la conformité administrative du club."
        ],
        "profil": "Rigueur irréprochable, excellente expression écrite, méthode et confidentialité."
    },
    {
        "code": "TRESORIER",
        "titre": "Trésorier(ère)",
        "categorie": "Bureau Exécutif",
        "description": "Gestion financière, budgets, cotisations et transparence des comptes.",
        "missions": [
            "Élaborer le budget prévisionnel annuel et les budgets d'événements.",
            "Gérer la caisse, les comptes et les flux financiers du club.",
            "Présenter les bilans financiers périodiques lors des assemblées.",
            "Garantir la transparence et la bonne utilisation des fonds alloués."
        ],
        "profil": "Intégrité exemplaire, compétences en gestion comptable, sens du détail et rigueur."
    },
    {
        "code": "RESPONSABLE_COMMUNICATION",
        "titre": "Responsable Communication",
        "categorie": "Bureau Exécutif",
        "description": "Visibilité médiatique, réseaux sociaux, graphisme et valorisation des projets.",
        "missions": [
            "Piloter la stratégie de communication digitale (LinkedIn, WhatsApp, Instagram, etc.).",
            "Créer les supports visuels, affiches, teasers et contenus de promotion.",
            "Valoriser les avancées des projets de la cohorte auprès de la communauté ISEP.",
            "Gérer les relations avec les médias étudiants et la presse."
        ],
        "profil": "Créativité graphique, maîtrise des réseaux sociaux et du storytelling, dynamisme."
    },
    {
        "code": "RESPONSABLE_EVENEMENTIEL",
        "titre": "Responsable Événementiel",
        "categorie": "Bureau Exécutif",
        "description": "Organisation des journées d'innovation, hackathons, pitchs et salons.",
        "missions": [
            "Planifier et organiser les grands événements phares du club.",
            "Gérer la logistique, les réservations de salles (Amphi, FabLab) et le matériel.",
            "Coordonner les équipes d'accueil, d'animation et de protocole lors des cérémonies.",
            "Veiller au respect du timing et à la réussite globale des manifestations."
        ],
        "profil": "Sens poussé de l'organisation, résistance au stress, proactivité et esprit d'équipe."
    },
    {
        "code": "RESPONSABLE_PARTENARIAT",
        "titre": "Responsable Partenariats",
        "categorie": "Bureau Exécutif",
        "description": "Relations entreprises, levée de fonds, sponsors et réseau professionnel.",
        "missions": [
            "Identifier et démarcher des entreprises partenaires, incubateurs et bailleurs.",
            "Négocier des accords de sponsoring, de stages et d'accompagnement pour les membres.",
            "Maintenir un carnet d'adresses actif avec l'écosystème entrepreneurial sénégalais.",
            "Organiser les rencontres networking avec des mentors et professionnels invités."
        ],
        "profil": "Aisance relationnelle, force de persuasion, esprit d'entreprise et négociation."
    },
    {
        "code": "RESPONSABLE_PEDAGOGIE",
        "titre": "Responsable Pédagogie & Formation",
        "categorie": "Bureau Exécutif",
        "description": "Montée en compétences, mentorat technique et ateliers de formation.",
        "missions": [
            "Identifier les besoins en formation des groupes de la cohorte.",
            "Organiser des masterclasses, bootcamps et ateliers méthodologiques (Business Model, pitch, tech).",
            "Mettre en place le programme de mentorat entre pairs et avec les tuteurs du CIAT.",
            "Évaluer la progression des compétences des membres du club."
        ],
        "profil": "Pédagogue, passion pour la transmission du savoir, esprit d'analyse et sens de l'écoute."
    },

    # --- Cellules Thématiques (5 postes) ---
    {
        "code": "CHEF_CELLULE_TIC",
        "titre": "Chef de Cellule TIC",
        "categorie": "Cellules Thématiques",
        "description": "Pilotage des projets numériques, développement logiciel, IA, IoT et cloud.",
        "missions": [
            "Animer la communauté des étudiants développeurs et techniciens réseaux de l'ISEP.",
            "Accompagner techniquement les projets du club intégrant des briques web, mobiles ou IoT.",
            "Organiser des hackathons de code et des ateliers de prototypage numérique au CIAT.",
            "Veiller à l'adoption des bonnes pratiques de développement et d'architecture."
        ],
        "profil": "Compétences techniques solides en TIC, passion pour l'innovation numérique et leadership."
    },
    {
        "code": "CHEF_CELLULE_AUTOMOBILE",
        "titre": "Chef de Cellule Automobile",
        "categorie": "Cellules Thématiques",
        "description": "Pilotage des projets de mobilité durable, mécanique avancée et diagnostic.",
        "missions": [
            "Mobiliser et fédérer les étudiants de la filière automobile autour de projets concrets.",
            "Coordonner l'utilisation des équipements de l'Atelier Automobile du CIAT.",
            "Encadrer les projets axés sur la reconversion électrique, le diagnostic et la sécurité.",
            "Garantir le respect strict des normes de sécurité au sein des ateliers techniques."
        ],
        "profil": "Maîtrise technique automobile, rigueur pratique, leadership en atelier et esprit sécurité."
    },
    {
        "code": "CHEF_CELLULE_ENERGIE",
        "titre": "Chef de Cellule Énergie",
        "categorie": "Cellules Thématiques",
        "description": "Transition énergétique, énergie solaire, biomasse et efficacité énergétique.",
        "missions": [
            "Encadrer les projets portant sur les énergies renouvelables et les solutions solaires.",
            "Sensibiliser les membres aux technologies vertes et à la sobriété énergétique.",
            "Organiser des visites de sites énergétiques et des ateliers de dimensionnement solaire.",
            "Créer des synergies avec les projets agro-industriels et automobiles du club."
        ],
        "profil": "Sensibilité environnementale, connaissances en électrotechnique/solaire et force de proposition."
    },
    {
        "code": "CHEF_CELLULE_SANTE",
        "titre": "Chef de Cellule Santé",
        "categorie": "Cellules Thématiques",
        "description": "E-santé, dispositifs biomédicaux, prévention et santé communautaire.",
        "missions": [
            "Coordonner les projets de santé numérique, télémédecine et objets connectés médicaux.",
            "Favoriser la pluridisciplinarité (TIC, électronique) au service des enjeux de santé.",
            "Veiller au respect de la déontologie, de la protection des données médicales et de l'éthique.",
            "Organiser des échanges avec des professionnels de santé et acteurs hospitaliers."
        ],
        "profil": "Intérêt marqué pour l'innovation médicale, rigueur scientifique et sens de l'impact social."
    },
    {
        "code": "CHEF_CELLULE_FEMMES",
        "titre": "Chef de Cellule Femmes & Entrepreneuriat",
        "categorie": "Cellules Thématiques",
        "description": "Promotion du leadership féminin, inclusion et soutien aux porteuses de projets.",
        "missions": [
            "Encourager et accompagner les étudiantes de l'ISEP à candidater et créer des startups.",
            "Organiser des panels inspirants, sessions de mentorat féminin et ateliers de prise de parole.",
            "Lutter contre les stéréotypes dans les filières techniques et valoriser les réussites féminines.",
            "Créer un réseau d'entraide et de sororité au sein de l'écosystème CIAT."
        ],
        "profil": "Engagement fort pour l'inclusion, leadership inspirant, dynamisme et sens du plaidoyer."
    },
]
