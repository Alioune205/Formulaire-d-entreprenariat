// Départements et filières (métiers) de l'ISEP Amadou Trawaré.
// ⚠ Garder synchronisé avec backend/inscriptions/serializers.py (FILIERES).
export const FILIERES = {
  TIC: [
    'Administration des Bases de Données',
    'Analyse de Performance Digitale',
    'Administration Systèmes, Sécurité et Cloud',
    'Réseaux, Sécurité et Internet des Objets (IoT)',
    'Développement Backend',
    'Développement Frontend',
  ],
  Automobile: [
    'Technicien Supérieur en Électromécanique Automobile',
    'Technicien Supérieur en Électricité et Électronique Automobile',
    'Technicien Supérieur en Carrosserie et Peinture Automobile',
    'Technicien Supérieur en Froid et Climatisation',
  ],
};

export const LIBELLES_DEPARTEMENTS = {
  TIC: 'TIC — Technologies de l’Information et de la Communication',
  Automobile: 'Automobile — Métiers de l’Automobile',
};

export const MAX_MEMBRES = 6;
