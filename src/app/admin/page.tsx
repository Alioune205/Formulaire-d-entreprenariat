'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  LogOut,
  Search,
  Filter,
  Download,
  RefreshCw,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  Phone,
  Mail,
  GraduationCap,
  Briefcase,
  Trash2,
  Lock,
  Loader2
} from 'lucide-react';
import { Candidate, ApplicationStatus } from '@/lib/types';

export default function AdminPage() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Dashboard states
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    interview: 0,
    accepted: 0,
    rejected: 0,
    withProjects: 0,
  });
  const [loadingData, setLoadingData] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [projectOnlyFilter, setProjectOnlyFilter] = useState(false);

  // Modal detail
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [editingNotes, setEditingNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Restore auth token on client mount
  useEffect(() => {
    const saved = sessionStorage.getItem('admin_token');
    if (saved) {
      setAuthToken(saved);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setAuthLoading(true);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Mot de passe invalide');
      }

      sessionStorage.setItem('admin_token', data.token);
      setAuthToken(data.token);
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Échec de connexion');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_token');
    setAuthToken(null);
    setPasswordInput('');
  };

  const fetchCandidates = useCallback(async () => {
    if (!authToken) return;
    setLoadingData(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);
      if (projectOnlyFilter) params.set('hasProject', 'YES');

      const res = await fetch(`/api/admin/candidates?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.status === 401) {
        handleLogout();
        return;
      }

      const data = await res.json();
      setCandidates(data.candidates || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Fetch candidates error:', err);
    } finally {
      setLoadingData(false);
    }
  }, [authToken, statusFilter, searchQuery, projectOnlyFilter]);

  useEffect(() => {
    if (authToken) {
      fetchCandidates();
    }
  }, [authToken, fetchCandidates]);

  const handleStatusChange = async (id: string, newStatus: ApplicationStatus) => {
    if (!authToken) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch('/api/admin/candidates', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          id,
          status: newStatus,
          adminNotes: editingNotes,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedCandidate(data.candidate);
        fetchCandidates();
      }
    } catch (err) {
      console.error('Update status error:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!authToken) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement cette candidature ?')) {
      return;
    }

    try {
      const res = await fetch('/api/admin/candidates', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setSelectedCandidate(null);
        fetchCandidates();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const exportToCSV = () => {
    if (candidates.length === 0) {
      alert('Aucune donnée à exporter.');
      return;
    }

    const headers = [
      'ID',
      'Date de soumission',
      'Nom Complet',
      'Email',
      'Téléphone',
      'Niveau',
      'Filière',
      'Porteur de Projet',
      'Nom du Projet',
      'Pitch du Projet',
      'Compétences',
      'Disponibilité',
      'Statut',
      'Notes Admin'
    ];

    const rows = candidates.map((c) => [
      `"${c.id}"`,
      `"${new Date(c.createdAt).toLocaleDateString('fr-FR')}"`,
      `"${c.fullName.replace(/"/g, '""')}"`,
      `"${c.email}"`,
      `"${c.phone}"`,
      `"${c.studyLevel}"`,
      `"${c.fieldOfStudy.replace(/"/g, '""')}"`,
      `"${c.hasProject === 'YES' ? 'OUI' : 'NON'}"`,
      `"${(c.projectName || '').replace(/"/g, '""')}"`,
      `"${(c.projectPitch || '').replace(/"/g, '""')}"`,
      `"${c.skills.join(', ')}"`,
      `"${c.availability}"`,
      `"${c.status}"`,
      `"${(c.adminNotes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `candidatures_club_entrepreneuriat_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openCandidateModal = (c: Candidate) => {
    setSelectedCandidate(c);
    setEditingNotes(c.adminNotes || '');
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle className="w-3 h-3" /> Retenu / Accepté
          </span>
        );
      case 'INTERVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <Calendar className="w-3 h-3" /> En Entretien
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
            <XCircle className="w-3 h-3" /> Non Retenu
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            <Clock className="w-3 h-3" /> En Attente
          </span>
        );
    }
  };

  // 1. Unauthenticated Login Screen
  if (!authToken) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-600/30">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Back-Office Admin
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Club d’Entrepreneuriat • Espace de Gestion
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {loginError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {loginError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-2 tracking-wider">
                Mot de passe d’accès
              </label>
              <input
                type="password"
                required
                placeholder="Entrez le mot de passe admin"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
              <p className="text-[11px] text-slate-400 mt-2">
                Mot de passe par défaut pour le test : <code className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-600 font-bold">admin2026</code>
              </p>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {authLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Connexion...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> Accéder au tableau de bord
                </>
              )}
            </button>

            <div className="pt-4 text-center">
              <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600">
                <ArrowLeft className="w-3.5 h-3.5" /> Retour au site public
              </Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 2. Authenticated Dashboard Screen
  return (
    <div className="min-h-screen bg-slate-100">
      
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-slate-500 hover:text-slate-900 transition-colors p-1.5 rounded-lg hover:bg-slate-100">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
              BO
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">
                Administration des Candidatures
              </h1>
              <p className="text-xs text-slate-400">Club d&apos;Entrepreneuriat</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={exportToCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Exporter CSV
            </button>
            <button
              onClick={fetchCandidates}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              title="Rafraîchir"
            >
              <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Dossiers</div>
            <div className="text-2xl font-black text-slate-900 mt-2">{stats.total}</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-amber-500 uppercase tracking-wider">En Attente</div>
            <div className="text-2xl font-black text-amber-600 mt-2">{stats.pending}</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-blue-500 uppercase tracking-wider">Entretiens</div>
            <div className="text-2xl font-black text-blue-600 mt-2">{stats.interview}</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Acceptés</div>
            <div className="text-2xl font-black text-emerald-600 mt-2">{stats.accepted}</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-rose-500 uppercase tracking-wider">Rejetés</div>
            <div className="text-2xl font-black text-rose-600 mt-2">{stats.rejected}</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Porteurs Idées</div>
            <div className="text-2xl font-black text-indigo-600 mt-2">{stats.withProjects}</div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par nom, email, filière, compétence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Statut :
            </span>
            {['ALL', 'PENDING', 'INTERVIEW', 'ACCEPTED', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === st
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? 'Tous' : st === 'PENDING' ? 'En Attente' : st === 'INTERVIEW' ? 'Entretien' : st === 'ACCEPTED' ? 'Acceptés' : 'Rejetés'}
              </button>
            ))}

            <button
              onClick={() => setProjectOnlyFilter(!projectOnlyFilter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                projectOnlyFilter
                  ? 'bg-purple-100 text-purple-800 border-purple-300'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              💡 Avec projet ({stats.withProjects})
            </button>
          </div>

        </div>

        {/* Candidate List Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">
              Candidatures reçues ({candidates.length})
            </h3>
            <span className="text-xs text-slate-400">
              Cliquez sur une ligne pour voir le dossier complet
            </span>
          </div>

          {loadingData ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
              Chargement des dossiers...
            </div>
          ) : candidates.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="font-medium text-slate-600">Aucune candidature trouvée</p>
              <p className="text-xs mt-1">Modifiez vos critères de recherche ou réinitialisez les filtres.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Candidat</th>
                    <th className="py-3 px-4">Formation</th>
                    <th className="py-3 px-4">Projet / Idée</th>
                    <th className="py-3 px-4">Compétences</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {candidates.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => openCandidateModal(c)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {c.fullName}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" /> {c.email}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        <span className="font-semibold text-slate-700">{c.studyLevel}</span>
                        <div className="text-slate-500">{c.fieldOfStudy}</div>
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        {c.hasProject === 'YES' ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                            💡 {c.projectName || 'Projet non nommé'}
                          </span>
                        ) : (
                          <span className="text-slate-400">Recherche équipe</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {c.skills.slice(0, 2).map((s, idx) => (
                            <span key={idx} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                              {s}
                            </span>
                          ))}
                          {c.skills.length > 2 && (
                            <span className="text-[11px] text-slate-400">+{c.skills.length - 2}</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {getStatusBadge(c.status)}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(c.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                          Détails <ChevronRight className="w-4 h-4 ml-0.5" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      {/* Candidate Dossier Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 animate-fade-in">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-mono text-slate-400 uppercase">Dossier #{selectedCandidate.id}</span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">{selectedCandidate.fullName}</h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-2">
                  <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-indigo-500" /> {selectedCandidate.email}</span>
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-indigo-500" /> {selectedCandidate.phone}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Academic & Availability */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl text-xs">
              <div>
                <span className="text-slate-400 font-semibold block mb-1">NIVEAU & FILIÈRE</span>
                <span className="font-bold text-slate-800 text-sm">{selectedCandidate.studyLevel}</span> — {selectedCandidate.fieldOfStudy}
              </div>
              <div>
                <span className="text-slate-400 font-semibold block mb-1">DISPONIBILITÉ</span>
                <span className="font-bold text-slate-800 text-sm">{selectedCandidate.availability}</span>
              </div>
            </div>

            {/* Project Details */}
            {selectedCandidate.hasProject === 'YES' && (
              <div className="border border-purple-200 bg-purple-50/50 p-4 rounded-2xl">
                <span className="text-xs font-bold uppercase text-purple-700 flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Projet de Startup : {selectedCandidate.projectName || 'Projet'}
                </span>
                <p className="text-sm text-slate-700 leading-relaxed italic">
                  &ldquo;{selectedCandidate.projectPitch || 'Aucun pitch renseigné.'}&rdquo;
                </p>
              </div>
            )}

            {/* Skills */}
            <div>
              <span className="text-xs font-bold uppercase text-slate-500 block mb-2">Compétences sélectionnées</span>
              <div className="flex flex-wrap gap-2">
                {selectedCandidate.skills.map((s, idx) => (
                  <span key={idx} className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs px-2.5 py-1 rounded-lg font-semibold">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Motivation */}
            <div>
              <span className="text-xs font-bold uppercase text-slate-500 block mb-2">Motivation du candidat</span>
              <div className="bg-slate-50 p-4 rounded-2xl text-sm text-slate-700 leading-relaxed border border-slate-200">
                {selectedCandidate.motivation}
              </div>
            </div>

            {/* Admin Status & Notes */}
            <div className="border-t border-slate-100 pt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-2">
                  Changer le statut du dossier
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    disabled={updatingStatus}
                    onClick={() => handleStatusChange(selectedCandidate.id, 'PENDING')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      selectedCandidate.status === 'PENDING'
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    En Attente
                  </button>
                  <button
                    disabled={updatingStatus}
                    onClick={() => handleStatusChange(selectedCandidate.id, 'INTERVIEW')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      selectedCandidate.status === 'INTERVIEW'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    Entretien
                  </button>
                  <button
                    disabled={updatingStatus}
                    onClick={() => handleStatusChange(selectedCandidate.id, 'ACCEPTED')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      selectedCandidate.status === 'ACCEPTED'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                    }`}
                  >
                    Accepter
                  </button>
                  <button
                    disabled={updatingStatus}
                    onClick={() => handleStatusChange(selectedCandidate.id, 'REJECTED')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      selectedCandidate.status === 'REJECTED'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                    }`}
                  >
                    Refuser
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Notes internes du comité de sélection
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex : Convoqué pour le jury de sélection du vendredi..."
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  onClick={() => handleStatusChange(selectedCandidate.id, selectedCandidate.status)}
                  className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  Sauvegarder les notes
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => handleDelete(selectedCandidate.id)}
                className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-800 font-semibold p-2 rounded-lg hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Supprimer ce dossier
              </button>

              <button
                onClick={() => setSelectedCandidate(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
