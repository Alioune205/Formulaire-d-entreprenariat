// Client minimal pour l'API Django.
const BASE = import.meta.env.VITE_API_URL ?? '';
const CLE_TOKEN = 'ciat-admin-token';

export const tokenAdmin = {
  lire: () => { try { return localStorage.getItem(CLE_TOKEN); } catch { return null; } },
  ecrire: (t) => { try { localStorage.setItem(CLE_TOKEN, t); } catch { /* ignore */ } },
  effacer: () => { try { localStorage.removeItem(CLE_TOKEN); } catch { /* ignore */ } },
};

export class ErreurApi extends Error {
  constructor(status, data) {
    super(premierMessage(data) || `Erreur ${status}`);
    this.status = status;
    this.data = data;
  }
}

// Extrait un message lisible d'une réponse d'erreur DRF.
function premierMessage(data) {
  if (!data) return null;
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return premierMessage(data[0]);
  if (data.detail) return data.detail;
  const cle = Object.keys(data)[0];
  return cle ? premierMessage(data[cle]) : null;
}

export function urlMedia(chemin) {
  if (!chemin) return '';
  if (BASE.startsWith('https://') && chemin.startsWith('http://')) {
    return `https://${chemin.slice('http://'.length)}`;
  }
  if (chemin.startsWith('http://') || chemin.startsWith('https://')) return chemin;
  return `${BASE}${chemin.startsWith('/') ? '' : '/'}${chemin}`;
}

export async function api(chemin, { method = 'GET', body, auth = false } = {}) {
  const headers = {};
  const estFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !estFormData) headers['Content-Type'] = 'application/json';
  if (auth) headers.Authorization = `Token ${tokenAdmin.lire()}`;

  const res = await fetch(`${BASE}/api${chemin}`, {
    method,
    headers,
    body: body === undefined ? undefined : estFormData ? body : JSON.stringify(body),
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ErreurApi(res.status, data);
  return data;
}

/**
 * Envoie un fichier DIRECTEMENT vers Cloudflare R2 avec l'URL pré-signée fournie par le serveur.
 * Le fichier ne passe pas par PythonAnywhere. XMLHttpRequest permet de suivre la progression.
 * Renvoie { promesse, annuler }.
 */
export function envoyerVersR2(fichier, autorisation, onProgression) {
  const xhr = new XMLHttpRequest();
  const promesse = new Promise((resolve, reject) => {
    xhr.open(autorisation.methode || 'PUT', autorisation.url);
    Object.entries(autorisation.entetes || {}).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgression) onProgression(Math.round((100 * e.loaded) / e.total));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300
      ? resolve()
      : reject(new Error(`Envoi refusé par le stockage (code ${xhr.status}).`)));
    xhr.onerror = () => reject(new Error('Connexion interrompue pendant l’envoi de la vidéo.'));
    xhr.onabort = () => reject(Object.assign(new Error('Envoi annulé.'), { annule: true }));
    xhr.send(fichier);
  });
  return { promesse, annuler: () => xhr.abort() };
}

export async function telechargerCsv(cheminOuParams = '', nomFichier = null) {
  const url = cheminOuParams.startsWith('/')
    ? `${BASE}/api${cheminOuParams}`
    : `${BASE}/api/admin/inscriptions/export/${cheminOuParams}`;
  const res = await fetch(url, {
    headers: { Authorization: `Token ${tokenAdmin.lire()}` },
  });
  if (!res.ok) throw new ErreurApi(res.status, null);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = nomFichier || `inscriptions-club-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(objectUrl);
}
