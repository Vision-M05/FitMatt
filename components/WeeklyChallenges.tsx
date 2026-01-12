'use client';

import React, { useState, useEffect } from 'react';
import { X, Target, Trophy, Flame, Dumbbell, Clock, Check, Star } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';

interface Challenge {
    id: string;
    title: string;
    description: string;
    icon: string;
    target: number;
    current: number;
    unit: string;
    reward: string;
    completed: boolean;
}

interface WeeklyChallengesProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
}

const CHALLENGE_TEMPLATES = [
    { id: 'sessions', title: 'Régularité', description: 'Termine {target} séances cette semaine', icon: '🏋️', unit: 'séances', min: 3, max: 5, reward: '+100 XP' },
    { id: 'minutes', title: 'Endurance', description: 'Accumule {target} minutes d\'entraînement', icon: '⏱️', unit: 'min', min: 90, max: 180, reward: 'Badge Marathonien' },
    { id: 'streak', title: 'Streak Fire', description: 'Maintiens un streak de {target} jours', icon: '🔥', unit: 'jours', min: 3, max: 7, reward: 'Bouclier Streak' },
    { id: 'early', title: 'Lève-tôt', description: 'Entraîne-toi avant 9h {target} fois', icon: '🌅', unit: 'fois', min: 2, max: 4, reward: '+50 XP' },
    { id: 'complete', title: 'Perfectionniste', description: 'Complète 100% des exercices {target} fois', icon: '✨', unit: 'fois', min: 2, max: 5, reward: 'Badge Perfectionniste' },
];

export default function WeeklyChallenges({ isOpen, onClose, user }: WeeklyChallengesProps) {
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        if (isOpen) {
            loadOrGenerateChallenges();
        }
    }, [isOpen]);

    const loadOrGenerateChallenges = async () => {
        setLoading(true);

        // Check if we have challenges saved this week
        const weekStart = getWeekStart();
        const saved = localStorage.getItem(`velox_challenges_${weekStart}`);

        if (saved) {
            setChallenges(JSON.parse(saved));
            await updateProgress(JSON.parse(saved));
        } else {
            const newChallenges = generateChallenges();
            setChallenges(newChallenges);
            localStorage.setItem(`velox_challenges_${weekStart}`, JSON.stringify(newChallenges));
        }

        setLoading(false);
    };

    const getWeekStart = () => {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(now.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday.toISOString().split('T')[0];
    };

    const generateChallenges = (): Challenge[] => {
        // Pick 3 random challenges
        const shuffled = [...CHALLENGE_TEMPLATES].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, 3);

        return selected.map(template => {
            const target = Math.floor(Math.random() * (template.max - template.min + 1)) + template.min;
            return {
                id: template.id,
                title: template.title,
                description: template.description.replace('{target}', target.toString()),
                icon: template.icon,
                target,
                current: 0,
                unit: template.unit,
                reward: template.reward,
                completed: false,
            };
        });
    };

    const updateProgress = async (currentChallenges: Challenge[]) => {
        if (!user) return;

        // Get this week's workout logs
        const weekStart = getWeekStart();
        const { data: logs } = await supabase
            .from('workout_logs')
            .select('*')
            .eq('user_id', user.id)
            .gte('completed_at', weekStart);

        if (!logs) return;

        const updated = currentChallenges.map(challenge => {
            let current = 0;

            switch (challenge.id) {
                case 'sessions':
                    current = logs.length;
                    break;
                case 'minutes':
                    current = logs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0);
                    break;
                case 'streak':
                    // Simplified: count unique days
                    const uniqueDays = new Set(logs.map(log => new Date(log.completed_at).toDateString()));
                    current = uniqueDays.size;
                    break;
                default:
                    current = Math.min(logs.length, challenge.target);
            }

            return {
                ...challenge,
                current: Math.min(current, challenge.target),
                completed: current >= challenge.target,
            };
        });

        setChallenges(updated);
        localStorage.setItem(`velox_challenges_${weekStart}`, JSON.stringify(updated));
    };

    const getDaysRemaining = () => {
        const now = new Date();
        const dayOfWeek = now.getDay();
        return dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl animate-bounce-in">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-black text-white flex items-center gap-2">
                            <Target className="text-yellow-300" /> Défis de la Semaine
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full">
                            <X size={20} className="text-white" />
                        </button>
                    </div>
                    <div className="text-sm text-white/80 mt-1">
                        ⏰ {getDaysRemaining()} jours restants
                    </div>
                </div>

                {/* Challenges List */}
                <div className="p-4 space-y-3">
                    {loading ? (
                        <div className="text-center py-8 text-slate-400">
                            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                            Chargement...
                        </div>
                    ) : (
                        challenges.map(challenge => (
                            <div
                                key={challenge.id}
                                className={`rounded-2xl p-4 transition-all ${challenge.completed
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                                        : 'bg-slate-100 dark:bg-slate-700'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="text-3xl">{challenge.icon}</div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <div className="font-bold text-sm dark:text-white">
                                                {challenge.title}
                                            </div>
                                            {challenge.completed && (
                                                <div className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                                                    <Check size={12} /> Fait!
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            {challenge.description}
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="mt-2">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className={challenge.completed ? 'text-white/80' : 'text-slate-400'}>
                                                    {challenge.current}/{challenge.target} {challenge.unit}
                                                </span>
                                                <span className={`font-bold ${challenge.completed ? 'text-yellow-300' : 'text-indigo-500'}`}>
                                                    🎁 {challenge.reward}
                                                </span>
                                            </div>
                                            <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-500 ${challenge.completed
                                                            ? 'bg-yellow-300'
                                                            : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                                                        }`}
                                                    style={{ width: `${(challenge.current / challenge.target) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Motivation */}
                <div className="px-4 pb-4">
                    <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-3 text-center">
                        <div className="text-sm text-indigo-600 dark:text-indigo-400 font-bold">
                            {challenges.filter(c => c.completed).length === 3
                                ? "🏆 Bravo ! Tu as tout complété !"
                                : `💪 ${challenges.filter(c => c.completed).length}/3 défis complétés`}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
