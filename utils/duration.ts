
import { Session, Exercise } from '@/types';

export const calculateSessionDuration = (session: Session): number => {
    if (!session || !session.exercises) return 0;

    let totalSeconds = 0;

    session.exercises.forEach((exo: Exercise) => {
        const sets = exo.sets || 3;
        const reps = parseReps(exo.reps);
        const tempo = parseTempo(exo.tempo || "2010");
        const rest = exo.rest || 60;
        const setupTime = 60; // 1 min setup/transition per exercise

        // Time for one set = (Reps * Tempo) + Rest
        // Note: Rest is usually AFTER the set.
        // But for calculation: Sets * (Work + Rest) - LastRest? 
        // Let's keep it simple: Sets * (Work + Rest) + Setup

        const workTimePerSet = reps * tempo;
        const setDuration = workTimePerSet + rest;

        totalSeconds += (sets * setDuration) + setupTime;
    });

    return Math.ceil(totalSeconds / 60);
};

const parseReps = (repsString: string | number): number => {
    if (typeof repsString === 'number') return repsString;
    if (!repsString) return 10;

    // Handle "12-15" -> 13.5 -> 14
    if (repsString.includes('-')) {
        const [min, max] = repsString.split('-').map(Number);
        return Math.ceil((min + max) / 2);
    }

    return parseInt(repsString) || 10;
};

const parseTempo = (tempo: string): number => {
    if (!tempo || tempo.length !== 4) return 4; // Default 4s (e.g. 2010)

    // "30X1" -> X means explosively (~0.5s)
    let total = 0;
    for (let char of tempo) {
        if (char.toUpperCase() === 'X') {
            total += 1;
        } else {
            total += parseInt(char) || 0;
        }
    }
    return total > 0 ? total : 4;
};
