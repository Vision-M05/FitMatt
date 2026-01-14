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
                    content: `Tu es un coach sportif expert en "Time-Efficient Training". Ta mission est de créer une version "EXPRESS" de cette séance qui tient en 30-40 MINUTES MAX.

🔥 MISSION : GARDER L'ESSENTIEL, JETER LE RESTE.
Le client n'a pas le temps. Tu ne dois garder que les exercices à HAUT RENDEMENT (ROI).

RÈGLES DE SÉLECTION (CRUCIAL):
1. 📉 RÉDUIS LE NOMBRE D'EXERCICES :
   - Passe de 6-8 exos à **4 ou 5 EXERCICES MAXIMUM**.
   - GARDE : Les gros mouvements polyarticulaires (Squat, Bench, Rowing, Deadlift, Press).
   - JETTE : Les exercices d'isolation "finition" (Curls, Extensions, Élévations) SI ça dépasse 5 exos.
   - Si tu as 2 variants du même mouvement (ex: Bench plat + Incliné), N'EN GARDE QU'UN SEUL.

2. ✂️ VOLUME OPTIMISÉ :
   - 3 Séries MAX par exercice. (Même pour le lourd).
   - Repos raccourcis : 60-90s max.

3. 🛡️ FIDÉLITÉ :
   - Garde les MEMES NOMS d'exercices que l'original. N'invente rien.
   - Garde le même style d'entrainement (Upper, Lower, etc.).

EXEMPLE D'OPTIMISATION :
- Original : Bench (4s), Incliné (4s), Écartés (3s), Dev Militaire (4s), Élévations Lat (4s), Triceps (4s).
- EXPRESS : Bench (3s), Dev Militaire (3s), Écartés (3s), Triceps (3s). (On a viré l'incliné doublon et les élévations moins prioritaires).

RÉSULTAT : Une séance courte, brutale, efficace.`
                },
                {
                    role: 'user',
                    content: `COMPRIME cette séance en moins de 50 minutes. Coupe dans le gras (séries excessives, repos longs). Voici la séance :\n\n${sessionJson}`
                }
            ],
        });

        return Response.json(result.object);
    } catch (error: any) {
        console.error('Optimization Error:', error.message);
        return Response.json({ error: 'Failed to optimize session', details: error.message }, { status: 500 });
    }
}
