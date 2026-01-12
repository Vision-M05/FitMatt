import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const exerciseSchema = z.object({
    name: z.string().describe("Nom de l'exercice"),
    equip: z.string().describe("Équipement"),
    sets: z.number().describe("Nombre de séries optimisé"),
    reps: z.string().describe("Répétitions"),
    tempo: z.string().optional().describe("Tempo"),
    rest: z.number().describe("Temps de repos optimisé en secondes"),
    note: z.string().optional().describe("Note ou indication superset"),
    isBonus: z.boolean().optional().default(false)
});

const optimizedSessionSchema = z.object({
    name: z.string().describe("Nom de la séance express"),
    type: z.enum(['Upper', 'Lower', 'Full', 'Cardio', 'Other']),
    exercises: z.array(exerciseSchema),
    estimatedDuration: z.number().describe("Durée estimée en minutes"),
    optimizationNotes: z.string().describe("Résumé des optimisations appliquées")
});

export async function POST(req: Request) {
    try {
        const { session } = await req.json();

        if (!session || !session.exercises) {
            return Response.json({ error: 'Session data is required' }, { status: 400 });
        }

        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!apiKey) {
            return Response.json({ error: 'API Key missing' }, { status: 500 });
        }

        const sessionJson = JSON.stringify(session, null, 2);

        const result = await generateObject({
            model: google('gemini-2.5-flash-lite'),
            schema: optimizedSessionSchema,
            messages: [
                {
                    role: 'system',
                    content: `Tu es un coach sportif expert. Optimise cette séance pour qu'elle dure MAXIMUM 55-60 minutes.

RÈGLES D'OPTIMISATION:
1. GARDE les exercices composés essentiels (squats, développés, rowing, tirages)
2. COMBINE en supersets quand possible (ex: pec + dos = note "Superset avec...")
3. RÉDUIS les repos: 90s→60s, 60s→45s, 45s→30s
4. RÉDUIS les séries: 5→4, 4→3 pour les exercices d'isolation
5. SUPPRIME les exercices bonus/circuits (isBonus: true)
6. LIMITE à 6-8 exercices max
7. QUALITÉ > QUANTITÉ

Retourne une version express optimisée de la séance.`
                },
                {
                    role: 'user',
                    content: `Optimise cette séance pour qu'elle dure moins d'une heure:\n\n${sessionJson}`
                }
            ],
        });

        return Response.json(result.object);
    } catch (error: any) {
        console.error('Optimization Error:', error.message);
        return Response.json({ error: 'Failed to optimize session', details: error.message }, { status: 500 });
    }
}
