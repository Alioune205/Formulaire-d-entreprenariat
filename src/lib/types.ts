export type ApplicationStatus = 'PENDING' | 'INTERVIEW' | 'ACCEPTED' | 'REJECTED';

export interface Candidate {
  id: string;
  createdAt: string;
  fullName: string;
  email: string;
  phone: string;
  studyLevel: string; // e.g. L1, L2, L3, M1, M2, Ingénieur
  fieldOfStudy: string; // Informatique, Gestion, Commerce, etc.
  hasProject: 'YES' | 'NO';
  projectName?: string;
  projectPitch?: string;
  skills: string[]; // Dev, Design, Marketing, Finance, etc.
  motivation: string;
  availability: string; // 2-4h/semaine, 5-10h/semaine, etc.
  status: ApplicationStatus;
  adminNotes?: string;
}

export interface ApplicationInput {
  fullName: string;
  email: string;
  phone: string;
  studyLevel: string;
  fieldOfStudy: string;
  hasProject: 'YES' | 'NO';
  projectName?: string;
  projectPitch?: string;
  skills: string[];
  motivation: string;
  availability: string;
}

