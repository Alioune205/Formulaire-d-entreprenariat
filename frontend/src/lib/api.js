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

export async function api(chemin, { method = 'GET', body, auth = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) headers.Authorization = `Token ${tokenAdmin.lire()}`;

  const res = await fetch(`${BASE}/api${chemin}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ErreurApi(res.status, data);
  return data;
}

export async function telechargerCsv(params = '') {
  const res = await fetch(`${BASE}/api/admin/inscriptions/export/${params}`, {
    headers: { Authorization: `Token ${tokenAdmin.lire()}` },
  });
  if (!res.ok) throw new ErreurApi(res.status, null);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inscriptions-club-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
