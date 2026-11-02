import { NextRequest, NextResponse } from 'next/server';
import { getCandidates, updateCandidateStatus, deleteCandidate } from '@/lib/storage';
import { ApplicationStatus } from '@/lib/types';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin2026';

function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  // Accepts either the session token or direct admin password
  return token === 'admin-authorized-token-2026' || token === ADMIN_PASSWORD;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get('status');
  const search = searchParams.get('search')?.toLowerCase().trim() || '';
  const hasProjectFilter = searchParams.get('hasProject');

  let candidates = getCandidates();

  // Compute KPI statistics on the raw list
  const stats = {
    total: candidates.length,
    pending: candidates.filter((c) => c.status === 'PENDING').length,
    interview: candidates.filter((c) => c.status === 'INTERVIEW').length,
    accepted: candidates.filter((c) => c.status === 'ACCEPTED').length,
    rejected: candidates.filter((c) => c.status === 'REJECTED').length,
    withProjects: candidates.filter((c) => c.hasProject === 'YES').length,
  };

  // Filter by status
  if (statusFilter && statusFilter !== 'ALL') {
    candidates = candidates.filter((c) => c.status === statusFilter);
  }

  // Filter by hasProject
  if (hasProjectFilter && (hasProjectFilter === 'YES' || hasProjectFilter === 'NO')) {
    candidates = candidates.filter((c) => c.hasProject === hasProjectFilter);
  }

  // Filter by search query
  if (search) {
    candidates = candidates.filter((c) => {
      const matchName = c.fullName.toLowerCase().includes(search);
      const matchEmail = c.email.toLowerCase().includes(search);
      const matchPhone = c.phone.toLowerCase().includes(search);
      const matchField = c.fieldOfStudy.toLowerCase().includes(search);
      const matchProject = c.projectName?.toLowerCase().includes(search) || false;
      const matchSkills = c.skills.some((s) => s.toLowerCase().includes(search));
      return matchName || matchEmail || matchPhone || matchField || matchProject || matchSkills;
    });
  }

  return NextResponse.json({
    stats,
    candidates,
  });
}

export async function PATCH(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 401 });
  }

  try {
    const { id, status, adminNotes } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'Identifiant et statut requis.' }, { status: 400 });
    }

    const validStatuses: ApplicationStatus[] = ['PENDING', 'INTERVIEW', 'ACCEPTED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 });
    }

    const updated = updateCandidateStatus(id, status, adminNotes);
    if (!updated) {
      return NextResponse.json({ error: 'Candidature non trouvée.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, candidate: updated });
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 401 });
  }

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Identifiant requis.' }, { status: 400 });
    }

    const deleted = deleteCandidate(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Candidature non trouvée.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Candidature supprimée.' });
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la suppression.' }, { status: 500 });
  }
}

