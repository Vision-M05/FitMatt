import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { duration, exercisesCompleted, currentStreak, totalWorkouts, sessionName } = await req.json();

        const prompt = `Tu es Velox, un coach sportif IA motivant et bienveillant. L'utilisateur vient de terminer une séance d'entraînement.

DONNÉES DE LA SÉANCE:
- Nom: ${sessionName}
- Durée: ${duration} minutes
- Exercices complétés: ${exercisesCompleted}
- Streak actuel: ${currentStreak} jours
- Total séances: ${totalWorkouts}

Génère UN message court (2-3 phrases max) pour:
1. Féliciter l'utilisateur de façon personnalisée
2. Mentionner une stat impressionnante si applicable (durée, streak, total)
3. Encourager pour la suite

Ton: Dynamique, motivant, avec 1-2 emojis max. Parle en français.
Évite les phrases génériques type "Bravo pour cette séance".
Sois créatif et personnel.`;

        const { text } = await generateText({
            model: google('gemini-2.0-flash-lite'),
            prompt,
        });

        return NextResponse.json({ feedback: text.trim() });
    } catch (error) {
        console.error('Feedback generation error:', error);
        return NextResponse.json({
            feedback: "💪 Séance validée ! Continue sur cette lancée !"
        });
    }
}
