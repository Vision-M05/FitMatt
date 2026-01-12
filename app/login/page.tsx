'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Try sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (signInError) {
            // If fails, try sign up (Simplified for MVP)
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: email.split('@')[0] }
                }
            });

            if (signUpError) {
                setError(signInError.message);
            } else {
                // Check if email confirmation is required (default supabase setting)
                // For now assume auto-confirm or notified
                router.push('/');
                router.refresh();
            }
        } else {
            router.push('/');
            router.refresh();
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-slate-900 mb-2">Bienvenue</h1>
                    <p className="text-slate-500">Connectez-vous pour accéder à vos programmes</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-900 uppercase mb-1">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-indigo-500 font-bold"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-900 uppercase mb-1">Mot de passe</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-indigo-500 font-bold"
                        />
                    </div>

                    {error && <div className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-lg">{error}</div>}

                    <button
                        disabled={loading}
                        className="w-full py-4 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-[0.98]"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <>C'est parti <ArrowRight size={18} /></>}
                    </button>
                </form>
                <div className="mt-4 text-center text-xs text-slate-400">
                    Pas de compte ? Saisissez vos infos, ça en créera un automatiquement.
                </div>
            </div>
        </div>
    );
}
