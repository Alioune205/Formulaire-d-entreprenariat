import { NextRequest, NextResponse } from 'next/server';
import { addCandidate } from '@/lib/storage';
import { ApplicationInput } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      fullName,
      email,
      phone,
      studyLevel,
      fieldOfStudy,
      hasProject,
      projectName,
      projectPitch,
      skills,
      motivation,
      availability,
    } = body;

    // Strict validation
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 3) {
      return NextResponse.json({ error: 'Le nom complet doit comporter au moins 3 caractères.' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: 'Une adresse email valide est requise.' }, { status: 400 });
    }

    if (!phone || typeof phone !== 'string' || phone.trim().length < 6) {
      return NextResponse.json({ error: 'Un numéro de téléphone ou WhatsApp valide est requis.' }, { status: 400 });
    }

    if (!studyLevel || !fieldOfStudy) {
      return NextResponse.json({ error: 'Le niveau et la filière d’études sont requis.' }, { status: 400 });
    }

    if (!motivation || typeof motivation !== 'string' || motivation.trim().length < 15) {
      return NextResponse.json({ error: 'Veuillez rédiger quelques phrases sur votre motivation (au moins 15 caractères).' }, { status: 400 });
    }

    const applicationData: ApplicationInput = {
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      studyLevel: studyLevel.trim(),
      fieldOfStudy: fieldOfStudy.trim(),
      hasProject: hasProject === 'YES' ? 'YES' : 'NO',
      projectName: projectName ? projectName.trim() : undefined,
      projectPitch: projectPitch ? projectPitch.trim() : undefined,
      skills: Array.isArray(skills) ? skills : [],
      motivation: motivation.trim(),
      availability: availability || '2-5h/semaine',
    };

    const created = addCandidate(applicationData);

    return NextResponse.json({
      success: true,
      message: 'Votre candidature a été enregistrée avec succès ! Notre équipe vous recontactera rapidement.',
      candidateId: created.id,
    }, { status: 201 });

  } catch (error) {
    console.error('API apply error:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue lors de l’enregistrement.' }, { status: 500 });
  }
}

