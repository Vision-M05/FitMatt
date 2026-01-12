'use client';

import React, { useState, useEffect } from 'react';
import { User, Moon, Sun, LogOut, Settings, Shield, Bell, Smartphone } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import DailySpin from './DailySpin';

interface ProfilePanelProps {
    user: SupabaseUser | null;
}

export default function ProfilePanel({ user }: ProfilePanelProps) {
    const { isDark, toggleTheme } = useTheme();
    const [showDailySpin, setShowDailySpin] = useState(false);
    const supabase = createClient();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.reload();
    };

    return (
        <div className="max-w-md mx-auto p-4 pb-24">
            {/* User Card */}
            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-3xl p-6 text-white mb-6 shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                        <User size={32} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black">
                            {user?.email?.split('@')[0] || 'Athlète'}
                        </h2>
                        <p className="text-white/70 text-sm">{user?.email}</p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                    onClick={() => setShowDailySpin(true)}
                    className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl p-4 text-white flex flex-col items-center gap-2 hover:scale-105 transition-all shadow-lg"
                >
                    <span className="text-2xl">🎰</span>
                    <span className="font-bold text-sm">Daily Spin</span>
                </button>
                <button
                    onClick={toggleTheme}
                    className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 flex flex-col items-center gap-2 hover:scale-105 transition-all"
                >
                    {isDark ? <Sun size={24} className="text-yellow-500" /> : <Moon size={24} className="text-indigo-500" />}
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-300">
                        {isDark ? 'Mode Clair' : 'Mode Sombre'}
                    </span>
                </button>
            </div>

            {/* Settings List */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    <SettingItem icon={Bell} label="Notifications" value="Activées" />
                    <SettingItem icon={Shield} label="Confidentialité" value="Standard" />
                    <SettingItem icon={Smartphone} label="Version" value="V3.0" />
                </div>
            </div>

            {/* Logout */}
            <button
                onClick={handleLogout}
                className="w-full mt-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl p-4 font-bold flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
            >
                <LogOut size={18} />
                Déconnexion
            </button>

            {/* Daily Spin Modal */}
            <DailySpin
                isOpen={showDailySpin}
                onClose={() => setShowDailySpin(false)}
                onReward={(r) => console.log('Reward:', r)}
            />
        </div>
    );
}

function SettingItem({ icon: Icon, label, value }: { icon: typeof Settings; label: string; value: string }) {
    return (
        <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
                <Icon size={18} className="text-slate-400" />
                <span className="text-slate-700 dark:text-slate-300 font-bold">{label}</span>
            </div>
            <span className="text-slate-400 text-sm">{value}</span>
        </div>
    );
}
