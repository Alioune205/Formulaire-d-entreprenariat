import fs from 'fs';
import path from 'path';
import { Candidate, ApplicationInput, ApplicationStatus } from './types';

// Detect environment storage path (serverless friendly)
const isVercel = process.env.VERCEL === '1';
const DATA_DIR = isVercel ? '/tmp' : path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'candidates.json');

const INITIAL_DEMO_CANDIDATES: Candidate[] = [
  {
    id: 'cand-001',
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    fullName: 'Amina Diop',
    email: 'amina.diop@univ.sn',
    phone: '+221 77 123 45 67',
    studyLevel: 'Licence 3',
    fieldOfStudy: 'Génie Logiciel & Informatique',
    hasProject: 'YES',
    projectName: 'AgriTech Connect',
    projectPitch: 'Plateforme mobile reliant directement les agriculteurs locaux aux grossistes urbains pour éliminer les intermédiaires spéculatifs.',
    skills: ['Développement Web/Mobile', 'UI/UX Design'],
    motivation: 'Passionnée par l’impact social et l’entrepreneuriat numérique, je cherche à structurer mon projet et trouver des co-fondateurs complémentaires.',
    availability: '5-10h/semaine',
    status: 'INTERVIEW',
    adminNotes: 'Profil très prometteur. Pitch solide, convoquée pour entretien vendredi.'
  },
  {
    id: 'cand-002',
    createdAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
    fullName: 'Mamadou Ba',
    email: 'mamadou.ba@univ.sn',
    phone: '+221 78 456 78 90',
    studyLevel: 'Master 1',
    fieldOfStudy: 'Finance d’Entreprise & Gestion',
    hasProject: 'NO',
    skills: ['Finance & Business Plan', 'Gestion de Projet'],
    motivation: 'Je souhaite apporter mes compétences en modélisation financière aux porteurs de projets du club tout en apprenant la méthodologie Lean Startup.',
    availability: 'Plus de 10h/semaine',
    status: 'ACCEPTED',
    adminNotes: 'Excellent profil financier, idéal pour le pôle Trésorerie & Accompagnement.'
  },
  {
    id: 'cand-003',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    fullName: 'Fatou Ndiaye',
    email: 'fatou.ndiaye@univ.sn',
    phone: '+221 76 987 65 43',
    studyLevel: 'Licence 2',
    fieldOfStudy: 'Marketing Digital & Communication',
    hasProject: 'NO',
    skills: ['Marketing Digital', 'Création de Contenu / Vidéo'],
    motivation: 'Curieuse d’apprendre comment lancer des marques émergentes et animer la communication des événements du club.',
    availability: '2-5h/semaine',
    status: 'PENDING',
    adminNotes: ''
  }
];

function ensureStorage(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_DEMO_CANDIDATES, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Error ensuring storage:', err);
  }
}

export function getCandidates(): Candidate[] {
  ensureStorage();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading candidates file:', err);
    return INITIAL_DEMO_CANDIDATES;
  }
}

export function saveCandidates(candidates: Candidate[]): void {
  ensureStorage();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(candidates, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing candidates file:', err);
  }
}

export function addCandidate(input: ApplicationInput): Candidate {
  const candidates = getCandidates();
  const newCandidate: Candidate = {
    id: `cand-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    createdAt: new Date().toISOString(),
    ...input,
    status: 'PENDING',
    adminNotes: ''
  };

  candidates.unshift(newCandidate);
  saveCandidates(candidates);
  return newCandidate;
}

export function updateCandidateStatus(id: string, status: ApplicationStatus, adminNotes?: string): Candidate | null {
  const candidates = getCandidates();
  const index = candidates.findIndex((c) => c.id === id);
  if (index === -1) return null;

  candidates[index].status = status;
  if (typeof adminNotes === 'string') {
    candidates[index].adminNotes = adminNotes;
  }

  saveCandidates(candidates);
  return candidates[index];
}

export function deleteCandidate(id: string): boolean {
  const candidates = getCandidates();
  const filtered = candidates.filter((c) => c.id !== id);
  if (filtered.length === candidates.length) return false;

  saveCandidates(filtered);
  return true;
}

