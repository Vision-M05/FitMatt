import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

export const maxDuration = 60;

const exerciseSchema = z.object({
    name: z.string().describe("Nom de l'exercice"),
    equip: z.string().describe("Équipement (ex: Haltères, Machine, Barre)"),
    sets: z.number().describe("Nombre de séries"),
    reps: z.string().describe("Nombre de répétitions (ex: '10', '12-15', 'MAX')"),
    tempo: z.string().optional().describe("Tempo (ex: '2010') ou 'Rapide'"),
    rest: z.number().describe("Temps de repos en secondes"),
    note: z.string().optional().describe("Conseil technique ou note d'intensité"),
    isBonus: z.boolean().optional().default(false)
});

const sessionSchema = z.object({
    id: z.string().describe("ID unique court (ex: 's1')"),
    name: z.string().describe("Nom de la séance (ex: 'Upper A', 'Legs')"),
    type: z.enum(['Upper', 'Lower', 'Full', 'Cardio', 'Other']).describe("Type de séance"),
    exercises: z.array(exerciseSchema)
});

const programSchema = z.object({
    title: z.string().describe("Titre du cycle ou du programme"),
    description: z.string().describe("Brève description de l'objectif"),
    sessions: z.array(sessionSchema)
});

// Allow streaming responses up to 30 seconds
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { prompt, image } = await req.json();

        if (!prompt && !image) {
            return new Response('Prompt or image is required', { status: 400 });
        }

        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!apiKey) {
            console.error('CRITICAL: GOOGLE_GENERATIVE_AI_API_KEY is missing in environment variables.');
            return Response.json({ error: 'Server misconfiguration: API Key missing' }, { status: 500 });
        }
        console.log('API Key Status:', apiKey ? 'Present' : 'Missing', 'Length:', apiKey?.length);

        const messages: any[] = [
            {
                role: 'system',
                content: `Tu es un coach sportif expert. Convertis l'input (texte ou image de programme) en JSON strict.
                RÈGLES:
                1. Extrais exercices, séries, reps, repos.
                2. Défaut repos: 90s (force), 60s (hypertrophie).
                3. Défaut tempo: "2010".
                4. Sois concis.`
            }
        ];

        const userContent: any[] = [];
        if (prompt) userContent.push({ type: 'text', text: prompt });
        if (image) {
            // Setup for generative-ai SDK or Vercel AI SDK Core if supported
            // The google provider expects image parts in specific format or base64
            // For @ai-sdk/google, we can pass base64 directly in messages if using 'generateContent', 
            // but generateObject is newer. It supports the standard 'user' message with content array.

            // Note: Data URL might need stripping for some providers, but usually the SDK handles the parts.
            // We'll pass the base64 string directly if it's not a URL.
            // The client sends full data URL.
            userContent.push({ type: 'image', image: image });
        }

        messages.push({ role: 'user', content: userContent });

        const result = await generateObject({
            model: google('gemini-2.5-flash-lite'), // Switching to Pro for better availability
            schema: programSchema,
            messages: messages,
        });

        return Response.json(result.object);
    } catch (error: any) {
        console.error('AI Generation Error Full:', error);
        console.error('Error Message:', error.message);
        console.error('Error Details:', JSON.stringify(error, null, 2));

        let msg = 'Failed to generate program';
        if (error.message?.includes('400')) msg = "Bad Request - Check Image Format";
        if (error.message?.includes('413')) msg = "Payload Too Large - Image too big";

        return Response.json({ error: msg, details: error.message }, { status: 500 });
    }
}
