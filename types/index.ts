export interface Exercise {
    name: string;
    equip: string;
    sets: number;
    reps: string;
    tempo?: string;
    rest: number;
    note?: string;
    isBonus?: boolean;
}

export interface Session {
    id: string;
    name: string;
    type: 'Upper' | 'Lower' | 'Full' | 'Cardio' | 'Other';
    exercises: Exercise[];
}

export interface Program {
    title: string;
    description: string;
    sessions: Session[];
}

export interface UserProfile {
    id: string;
    full_name: string;
    avatar_url: string;
    fitness_level: 'beginner' | 'intermediate' | 'advanced';
}
