'use client';

import React, { useState } from 'react';
import { Target, Gift, Trophy, Flame } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import WeeklyChallenges from './WeeklyChallenges';
import DailySpin from './DailySpin';

interface ChallengesPanelProps {
    user: User | null;
}

export default function ChallengesPanel({ user }: ChallengesPanelProps) {
    const [showChallenges, setShowChallenges] = useState(false);
    const [showDailySpin, setShowDailySpin] = useState(false);

    return (
        <div className="max-w-md mx-auto p-4 pb-24">
            {/* Header */}
            <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white">Gamification</h2>
                <p className="text-slate-500 text-sm">Défis, récompenses et progression</p>
            </div>

            {/* Main Actions */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Daily Spin */}
                <button
                    onClick={() => setShowDailySpin(true)}
                    className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-3xl p-6 text-white text-center hover:scale-105 transition-all shadow-xl animate-pulse-glow"
                >
                    <div className="text-4xl mb-2">🎰</div>
                    <div className="font-black">Daily Spin</div>
                    <div className="text-xs opacity-80">Tourne la roue !</div>
                </button>

                {/* Weekly Challenges */}
                <button
                    onClick={() => setShowChallenges(true)}
                    className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl p-6 text-white text-center hover:scale-105 transition-all shadow-xl"
                >
                    <div className="text-4xl mb-2">⚔️</div>
                    <div className="font-black">Défis Hebdo</div>
                    <div className="text-xs opacity-80">3 objectifs</div>
                </button>
            </div>

            {/* Badges Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 mb-4">
                <div className="flex items-center gap-2 mb-4">
                    <Trophy size={18} className="text-yellow-500" />
                    <h3 className="font-bold text-slate-800 dark:text-white">Mes Badges</h3>
                </div>

                <div className="grid grid-cols-4 gap-2">
                    {['🎯', '🔥', '💪', '⚡', '🏆', '⭐', '🥇', '🎁'].map((emoji, i) => (
                        <div
                            key={i}
                            className={`aspect-square rounded-xl flex items-center justify-center text-2xl ${i < 3
                                    ? 'bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg'
                                    : 'bg-slate-100 dark:bg-slate-700 opacity-40'
                                }`}
                        >
                            {emoji}
                        </div>
                    ))}
                </div>
                <div className="text-center text-xs text-slate-400 mt-3">
                    3/8 badges débloqués
                </div>
            </div>

            {/* Streak Card */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Flame size={32} />
                        <div>
                            <div className="text-2xl font-black">0</div>
                            <div className="text-xs opacity-80">jours de streak</div>
                        </div>
                    </div>
                    <div className="text-right text-xs opacity-80">
                        Record: 0 jours
                    </div>
                </div>
            </div>

            {/* Modals */}
            <DailySpin
                isOpen={showDailySpin}
                onClose={() => setShowDailySpin(false)}
                onReward={(r) => console.log('Reward:', r)}
            />

            <WeeklyChallenges
                isOpen={showChallenges}
                onClose={() => setShowChallenges(false)}
                user={user}
            />
        </div>
    );
}
