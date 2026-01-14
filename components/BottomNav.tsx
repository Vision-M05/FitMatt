'use client';

import React from 'react';
import { Dumbbell, BarChart3, Target, User, Gift, Notebook } from 'lucide-react';
import feedback from '@/utils/haptics';

export type TabType = 'workout' | 'program' | 'stats' | 'challenges' | 'profile';

interface BottomNavProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
    hasSpinAvailable?: boolean;
}

const tabs: { id: TabType; icon: typeof Dumbbell; label: string }[] = [
    { id: 'workout', icon: Dumbbell, label: 'Workout' },
    { id: 'program', icon: Notebook, label: 'Cycle' },
    { id: 'stats', icon: BarChart3, label: 'Stats' },
    { id: 'challenges', icon: Target, label: 'Défis' },
    { id: 'profile', icon: User, label: 'Profil' },
];

export default function BottomNav({ activeTab, onTabChange, hasSpinAvailable }: BottomNavProps) {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-700 safe-area-inset-bottom">
            <div className="max-w-md mx-auto flex justify-around items-center py-2 px-2">
                {tabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => { feedback.tap(); onTabChange(tab.id); }}
                            className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[44px] px-3 py-1.5 rounded-2xl transition-all duration-300 ${isActive
                                ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white scale-105 shadow-lg shadow-indigo-200 dark:shadow-indigo-900'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 active:bg-slate-100 dark:active:bg-slate-800'
                                }`}
                        >
                            <div className="relative">
                                <Icon size={20} className={isActive ? 'animate-bounce-in' : ''} />
                                {tab.id === 'challenges' && hasSpinAvailable && (
                                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                                )}
                            </div>
                            <span className={`text-[9px] font-bold transition-all ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
