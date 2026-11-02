'use client';

import React, { useState } from 'react';
import { Send, CheckCircle2, AlertCircle, Loader2, Sparkles, Lightbulb, User, GraduationCap, Clock } from 'lucide-react';
import { ApplicationInput } from '@/lib/types';

const STUDY_LEVELS = [
  'Licence 1',
  'Licence 2',
  'Licence 3',
  'Master 1',
  'Master 2',
  'Cycle Ingénieur',
  'Doctorat / Autre'
];

const SKILL_OPTIONS = [
  'Développement Web / Mobile',
  'UI/UX & Design Graphique',
  'Marketing Digital & Growth',
  'Finance & Business Plan',
  'Vente & Négociation',
  'Gestion de Projet / No-Code',
  'Création de Contenu & Vidéo',
  'Intelligence Artificielle & Data',
  'Autre compétence'
];

const AVAILABILITY_OPTIONS = [
  '2 à 4 heures / semaine',
  '5 à 8 heures / semaine',
  'Plus de 8 heures / semaine'
];

export default function ApplicationForm() {
  const [formData, setFormData] = useState<ApplicationInput>({
    fullName: '',
    email: '',
    phone: '',
    studyLevel: 'Licence 2',
    fieldOfStudy: '',
    hasProject: 'NO',
    projectName: '',
    projectPitch: '',
    skills: [],
    motivation: '',
    availability: '2 à 4 heures / semaine',
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ candidateId: string; message: string } | null>(null);

  const toggleSkill = (skill: string) => {
    setFormData((prev) => {
      const exists = prev.skills.includes(skill);
      return {
        ...prev,
        skills: exists ? prev.skills.filter((s) => s !== skill) : [...prev.skills, skill],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation checks
    if (!formData.fullName.trim() || formData.fullName.length < 3) {
      setErrorMessage('Veuillez renseigner votre nom complet (au moins 3 caractères).');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setErrorMessage('Veuillez renseigner une adresse email valide.');
      return;
    }
    if (!formData.phone.trim() || formData.phone.length < 6) {
      setErrorMessage('Veuillez renseigner un numéro de téléphone ou WhatsApp.');
      return;
    }
    if (!formData.fieldOfStudy.trim()) {
      setErrorMessage('Veuillez préciser votre filière ou spécialité.');
      return;
    }
    if (formData.skills.length === 0) {
      setErrorMessage('Veuillez sélectionner au moins une compétence clé.');
      return;
    }
    if (!formData.motivation.trim() || formData.motivation.length < 15) {
      setErrorMessage('Veuillez rédiger une brève motivation (au moins 15 caractères).');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l’envoi de la candidature.');
      }

      setSuccessResult({
        candidateId: data.candidateId,
        message: data.message,
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Une erreur inattendue est survenue.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      studyLevel: 'Licence 2',
      fieldOfStudy: '',
      hasProject: 'NO',
      projectName: '',
      projectPitch: '',
      skills: [],
      motivation: '',
      availability: '2 à 4 heures / semaine',
    });
    setSuccessResult(null);
    setErrorMessage(null);
  };

  return (
    <section id="formulaire" className="py-20 bg-slate-50 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Candidature Officielle
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Formulaire d’inscription au Club
          </h2>
          <p className="mt-3 text-slate-600 text-base sm:text-lg">
            Remplis ce dossier en moins de 3 minutes. Les places pour la cohorte d’incubation sont limitées.
          </p>
        </div>

        {/* Success View */}
        {successResult ? (
          <div className="bg-white rounded-3xl border border-emerald-200 p-8 sm:p-12 shadow-xl text-center max-w-2xl mx-auto animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              Félicitations, candidature enregistrée !
            </h3>
            <p className="text-slate-600 text-base mb-6 leading-relaxed">
              {successResult.message}
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono text-slate-500 mb-8 inline-block">
              Numéro de dossier : <span className="text-indigo-600 font-bold">{successResult.candidateId}</span>
            </div>
            <div>
              <button
                onClick={resetForm}
                className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-colors shadow-sm"
              >
                Soumettre une autre candidature
              </button>
            </div>
          </div>
        ) : (
          /* Form View */
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden">
            
            {/* Banner top */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-6 sm:p-8 text-white">
              <h3 className="text-xl sm:text-2xl font-bold">Dossier de sélection • Cohorte 2026</h3>
              <p className="text-indigo-200 text-sm mt-1">
                Tous les champs marqués d&apos;un astérisque (<span className="text-amber-300 font-bold">*</span>) sont obligatoires.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-8">
              
              {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-3 text-sm">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Bloc 1: Infos personnelles */}
              <div>
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm uppercase tracking-wider mb-4">
                  <User className="w-4 h-4" /> 1. Informations Personnelles
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Nom et Prénom <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex : Fatou Ndiaye"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Email (Universitaire ou Personnel) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="votre.email@etudiant.sn"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Numéro de Téléphone / WhatsApp <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+221 77 000 00 00"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Bloc 2: Formation */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm uppercase tracking-wider mb-4">
                  <GraduationCap className="w-4 h-4" /> 2. Parcours Académique
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Niveau d’études actuel <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.studyLevel}
                      onChange={(e) => setFormData({ ...formData, studyLevel: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    >
                      {STUDY_LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Filière / Département <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex : Génie Logiciel, Gestion d'Entreprise, Droit..."
                      value={formData.fieldOfStudy}
                      onChange={(e) => setFormData({ ...formData, fieldOfStudy: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Bloc 3: Projet */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm uppercase tracking-wider mb-4">
                  <Lightbulb className="w-4 h-4" /> 3. Avez-vous une idée de projet ou startup ?
                </div>
                <div className="flex items-center gap-6 mb-4">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="hasProject"
                      value="YES"
                      checked={formData.hasProject === 'YES'}
                      onChange={() => setFormData({ ...formData, hasProject: 'YES' })}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Oui, j’ai une idée / projet</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="hasProject"
                      value="NO"
                      checked={formData.hasProject === 'NO'}
                      onChange={() => setFormData({ ...formData, hasProject: 'NO', projectName: '', projectPitch: '' })}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Non, je souhaite rejoindre une équipe</span>
                  </label>
                </div>

                {formData.hasProject === 'YES' && (
                  <div className="space-y-4 bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 mt-3 animate-fade-in">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Nom ou nom de code du projet
                      </label>
                      <input
                        type="text"
                        placeholder="Ex : PayCampus, BioSante, AgriCollect..."
                        value={formData.projectName || ''}
                        onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Pitch rapide du problème et de la solution (2-4 phrases)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Quel problème résolvez-vous et pour qui ?"
                        value={formData.projectPitch || ''}
                        onChange={(e) => setFormData({ ...formData, projectPitch: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Bloc 4: Compétences */}
              <div className="pt-4 border-t border-slate-100">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Vos domaines de prédilection / Compétences clés <span className="text-rose-500">*</span>
                </label>
                <p className="text-xs text-slate-500 mb-3">
                  Cliquez sur vos points forts (vous pouvez en choisir plusieurs).
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {SKILL_OPTIONS.map((skill) => {
                    const isSelected = formData.skills.includes(skill);
                    return (
                      <button
                        type="button"
                        key={skill}
                        onClick={() => toggleSkill(skill)}
                        className={`text-xs sm:text-sm px-3.5 py-2 rounded-xl font-medium border transition-all ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {skill}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bloc 5: Motivation & Disponibilité */}
              <div className="pt-4 border-t border-slate-100 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Pourquoi souhaitez-vous rejoindre le Club d’Entrepreneuriat ? <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Parlez-nous de vos objectifs, ce que vous attendez du club et ce que vous pouvez apporter..."
                    value={formData.motivation}
                    onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm uppercase tracking-wider mb-2">
                    <Clock className="w-4 h-4" /> Disponibilité hebdomadaire estimée
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {AVAILABILITY_OPTIONS.map((avail) => (
                      <label
                        key={avail}
                        className={`border rounded-xl p-3.5 flex items-center gap-3 cursor-pointer transition-all ${
                          formData.availability === avail
                            ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-medium'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="availability"
                          value={avail}
                          checked={formData.availability === avail}
                          onChange={() => setFormData({ ...formData, availability: avail })}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-xs sm:text-sm">{avail}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-slate-500">
                  En soumettant ce formulaire, vous acceptez d&apos;être contacté(e) pour les entretiens de sélection.
                </p>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/25 active:scale-95 disabled:opacity-70 disabled:pointer-events-none transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Envoyer ma candidature
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        )}

      </div>
    </section>
  );
}

