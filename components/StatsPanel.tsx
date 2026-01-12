'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Flame, Calendar, BarChart3, X, Clock, Dumbbell, Target } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';

interface WorkoutLog {
    id: string;
    session_name: string;
    duration_minutes: number;
    completed_at: string;
}

interface StatsData {
    totalWorkouts: number;
    totalMinutes: number;
    currentStreak: number;
    longestStreak: number;
    recentWorkouts: WorkoutLog[];
}

interface Badge {
    id: string;
    name: string;
    icon: string;
    description: string;
    unlocked: boolean;
    unlockedAt?: string;
}

interface StatsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
}

export default function StatsPanel({ isOpen, onClose, user }: StatsPanelProps) {
    const [stats, setStats] = useState<StatsData>({
        totalWorkouts: 0,
        totalMinutes: 0,
        currentStreak: 0,
        longestStreak: 0,
        recentWorkouts: []
    });
    const [badges, setBadges] = useState<Badge[]>([]);
    const [activeTab, setActiveTab] = useState<'stats' | 'history' | 'badges'>('stats');
    const supabase = createClient();

    useEffect(() => {
        if (isOpen && user) {
            fetchStats();
            calculateBadges();
        }
    }, [isOpen, user]);

    const fetchStats = async () => {
        if (!user) return;

        // Fetch workout logs
        const { data: logs } = await supabase
            .from('workout_logs')
            .select('*')
            .eq('user_id', user.id)
            .order('completed_at', { ascending: false })
            .limit(20);

        if (logs && logs.length > 0) {
            const totalWorkouts = logs.length;
            const totalMinutes = logs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0);

            // Calculate streak
            const streak = calculateStreak(logs);

            setStats({
                totalWorkouts,
                totalMinutes,
                currentStreak: streak.current,
                longestStreak: streak.longest,
                recentWorkouts: logs.slice(0, 10)
            });
        }
    };

    const calculateStreak = (logs: WorkoutLog[]) => {
        if (logs.length === 0) return { current: 0, longest: 0 };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sortedDates = logs
            .map(log => {
                const d = new Date(log.completed_at);
                d.setHours(0, 0, 0, 0);
                return d.getTime();
            })
            .filter((date, index, arr) => arr.indexOf(date) === index)
            .sort((a, b) => b - a);

        let current = 0;
        let longest = 0;
        let temp = 1;

        // Check if today or yesterday has workout
        const lastWorkout = sortedDates[0];
        const daysSinceLastWorkout = Math.floor((today.getTime() - lastWorkout) / (24 * 60 * 60 * 1000));

        if (daysSinceLastWorkout <= 1) {
            current = 1;
            for (let i = 1; i < sortedDates.length; i++) {
                const diff = (sortedDates[i - 1] - sortedDates[i]) / (24 * 60 * 60 * 1000);
                if (diff <= 2) {
                    current++;
                } else {
                    break;
                }
            }
        }

        // Calculate longest streak
        for (let i = 1; i < sortedDates.length; i++) {
            const diff = (sortedDates[i - 1] - sortedDates[i]) / (24 * 60 * 60 * 1000);
            if (diff <= 2) {
                temp++;
                longest = Math.max(longest, temp);
            } else {
                temp = 1;
            }
        }
        longest = Math.max(longest, current, temp);

        return { current, longest };
    };

    const calculateBadges = () => {
        const allBadges: Badge[] = [
            { id: 'first_workout', name: 'Première Séance', icon: '🎯', description: 'Terminer ta première séance', unlocked: stats.totalWorkouts >= 1 },
            { id: 'streak_3', name: '3 Jours', icon: '🔥', description: '3 jours consécutifs', unlocked: stats.currentStreak >= 3 || stats.longestStreak >= 3 },
            { id: 'streak_7', name: 'Semaine Parfaite', icon: '⚡', description: '7 jours consécutifs', unlocked: stats.currentStreak >= 7 || stats.longestStreak >= 7 },
            { id: 'streak_30', name: 'Machine', icon: '🏆', description: '30 jours consécutifs', unlocked: stats.longestStreak >= 30 },
            { id: 'workouts_10', name: '10 Séances', icon: '💪', description: 'Compléter 10 séances', unlocked: stats.totalWorkouts >= 10 },
            { id: 'workouts_50', name: 'Guerrier', icon: '🥇', description: 'Compléter 50 séances', unlocked: stats.totalWorkouts >= 50 },
            { id: 'hours_10', name: '10 Heures', icon: '⏱️', description: '10 heures d\'entraînement', unlocked: stats.totalMinutes >= 600 },
        ];
        setBadges(allBadges);
    };

    useEffect(() => {
        calculateBadges();
    }, [stats]);

    if (!isOpen) return null;

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-t-3xl max-h-[85vh] overflow-hidden animate-slide-up">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Statistiques</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-700">
                    {[
                        { id: 'stats', label: 'Stats', icon: BarChart3 },
                        { id: 'history', label: 'Historique', icon: Calendar },
                        { id: 'badges', label: 'Badges', icon: Trophy },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as typeof activeTab)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 font-bold text-sm transition-colors ${activeTab === tab.id
                                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                                    : 'text-slate-400'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto max-h-[60vh]">
                    {activeTab === 'stats' && (
                        <div className="space-y-4">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-4 text-white">
                                    <Dumbbell className="mb-2 opacity-80" size={24} />
                                    <div className="text-3xl font-black">{stats.totalWorkouts}</div>
                                    <div className="text-sm opacity-80">Séances</div>
                                </div>
                                <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-4 text-white">
                                    <Flame className="mb-2 opacity-80" size={24} />
                                    <div className="text-3xl font-black">{stats.currentStreak}</div>
                                    <div className="text-sm opacity-80">Streak Actuel</div>
                                </div>
                                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white">
                                    <Clock className="mb-2 opacity-80" size={24} />
                                    <div className="text-3xl font-black">{Math.round(stats.totalMinutes / 60)}h</div>
                                    <div className="text-sm opacity-80">Total</div>
                                </div>
                                <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-4 text-white">
                                    <Target className="mb-2 opacity-80" size={24} />
                                    <div className="text-3xl font-black">{stats.longestStreak}</div>
                                    <div className="text-sm opacity-80">Record Streak</div>
                                </div>
                            </div>

                            {/* Progress Message */}
                            <div className="bg-slate-100 dark:bg-slate-700 rounded-xl p-4 text-center">
                                <p className="text-slate-600 dark:text-slate-300 text-sm">
                                    {stats.currentStreak >= 7
                                        ? "🔥 Incroyable ! Tu es en feu !"
                                        : stats.currentStreak >= 3
                                            ? "💪 Super ! Continue comme ça !"
                                            : stats.totalWorkouts > 0
                                                ? "🚀 Bon début ! Construis ta régularité."
                                                : "🎯 Termine ta première séance pour commencer !"}
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="space-y-2">
                            {stats.recentWorkouts.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    <Calendar size={48} className="mx-auto mb-2 opacity-50" />
                                    <p>Aucune séance enregistrée</p>
                                </div>
                            ) : (
                                stats.recentWorkouts.map(log => (
                                    <div key={log.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-700 rounded-xl p-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                                                <Dumbbell size={18} className="text-indigo-600 dark:text-indigo-400" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 dark:text-white text-sm">{log.session_name}</div>
                                                <div className="text-xs text-slate-400">{formatDate(log.completed_at)}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-slate-700 dark:text-slate-300">{log.duration_minutes} min</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'badges' && (
                        <div className="grid grid-cols-3 gap-3">
                            {badges.map(badge => (
                                <div
                                    key={badge.id}
                                    className={`rounded-2xl p-4 text-center transition-all ${badge.unlocked
                                            ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-400 opacity-50'
                                        }`}
                                >
                                    <div className="text-3xl mb-1">{badge.icon}</div>
                                    <div className="text-xs font-bold">{badge.name}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
