import { NextRequest, NextResponse } from 'next/server';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin2026';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json({ error: 'Mot de passe requis.' }, { status: 400 });
    }

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Mot de passe incorrect.' }, { status: 401 });
    }

    // Simple robust token response for client session state
    return NextResponse.json({
      success: true,
      token: 'admin-authorized-token-2026',
      message: 'Authentification réussie.'
    });
  } catch {
    return NextResponse.json({ error: 'Erreur d’authentification.' }, { status: 500 });
  }
}

