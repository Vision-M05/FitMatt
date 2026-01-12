'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight, Dumbbell, Mail, Lock, UserPlus, LogIn } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        if (isSignUp) {
            // Sign Up
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: email.split('@')[0] }
                }
            });

            if (signUpError) {
                setError(signUpError.message);
            } else {
                setSuccess("Compte créé ! Vérifiez votre email pour confirmer.");
                // Some Supabase projects have auto-confirm, so try redirecting
                setTimeout(() => {
                    router.push('/');
                    router.refresh();
                }, 1500);
            }
        } else {
            // Sign In
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) {
                if (signInError.message.includes('Invalid login')) {
                    setError("Email ou mot de passe incorrect");
                } else {
                    setError(signInError.message);
                }
            } else {
                router.push('/');
                router.refresh();
            }
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-500/30">
                            <Dumbbell size={32} />
                        </div>
                    </div>
                    <h1 className="text-4xl font-black text-white mb-2">
                        VE<span className="text-indigo-400">LOX</span>
                    </h1>
                    <p className="text-slate-400">Ton coach personnel alimenté par l'IA</p>
                </div>

                {/* Card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl">
                    {/* Toggle */}
                    <div className="flex gap-2 p-1 bg-slate-800/50 rounded-xl mb-6">
                        <button
                            type="button"
                            onClick={() => { setIsSignUp(false); setError(null); }}
                            className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${!isSignUp ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            <LogIn size={16} /> Connexion
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsSignUp(true); setError(null); }}
                            className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${isSignUp ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            <UserPlus size={16} /> Inscription
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-300 uppercase mb-2 flex items-center gap-2">
                                <Mail size={12} /> Email
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="ton@email.com"
                                className="w-full p-4 rounded-xl bg-slate-800/50 border border-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white font-medium placeholder:text-slate-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-300 uppercase mb-2 flex items-center gap-2">
                                <Lock size={12} /> Mot de passe
                            </label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full p-4 rounded-xl bg-slate-800/50 border border-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white font-medium placeholder:text-slate-500 transition-all"
                            />
                        </div>

                        {error && (
                            <div className="text-red-400 text-sm font-bold bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-2">
                                ⚠️ {error}
                            </div>
                        )}

                        {success && (
                            <div className="text-green-400 text-sm font-bold bg-green-500/10 border border-green-500/20 p-3 rounded-xl flex items-center gap-2">
                                ✅ {success}
                            </div>
                        )}

                        <button
                            disabled={loading}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-indigo-500/30 active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" />
                            ) : (
                                <>
                                    {isSignUp ? "Créer mon compte" : "Se connecter"}
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* SEPARATEUR */}
                    <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-slate-700"></div>
                        <span className="text-xs text-slate-500 font-medium">ou</span>
                        <div className="flex-1 h-px bg-slate-700"></div>
                    </div>

                    {/* GOOGLE LOGIN */}
                    <button
                        type="button"
                        onClick={async () => {
                            setLoading(true);
                            const { error } = await supabase.auth.signInWithOAuth({
                                provider: 'google',
                                options: {
                                    redirectTo: `${window.location.origin}/`
                                }
                            });
                            if (error) {
                                setError(error.message);
                                setLoading(false);
                            }
                        }}
                        disabled={loading}
                        className="w-full py-4 rounded-xl bg-white text-slate-900 font-bold flex items-center justify-center gap-3 hover:bg-slate-100 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continuer avec Google
                    </button>

                    {isSignUp && (
                        <p className="mt-4 text-center text-xs text-slate-400">
                            Un email de confirmation sera envoyé pour activer votre compte.
                        </p>
                    )}
                </div>

                <p className="mt-6 text-center text-xs text-slate-500">
                    En continuant, vous acceptez nos conditions d'utilisation.
                </p>
            </div>
        </div>
    );
}
