'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Code2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
    const { register, loginWithGoogle } = useAuth();
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await register(name, email, password);
            toast.success('Account verified! Welcome to DevMarket 🎉');
            router.push('/marketplace');
        } catch (err: any) {
            toast.error(err?.message || err?.response?.data?.detail || 'Failed to register account');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            await loginWithGoogle();
            toast.success('Account verified! Welcome back 🎉');
            router.push('/marketplace');
        } catch (err: any) {
            toast.error(err?.message || 'Google Sign-In failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md animate-slide-up">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600/20 border border-brand-500/20 mb-4">
                        <Code2 size={28} className="text-brand-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Create your account</h1>
                    <p className="text-gray-400 mt-1 text-sm">
                        Free forever. Start selling in minutes.
                    </p>
                </div>

                <div className="glass p-8">
                    <form onSubmit={handleRegister} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                            <input
                                type="text"
                                required
                                placeholder="Anmol Malviya"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="input"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                            <input
                                type="email"
                                required
                                placeholder="you@example.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="input"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="input"
                            />
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Create Account'}
                        </button>

                        <p className="text-center text-xs text-gray-500 mt-4">
                            By signing up, you agree to our Terms of Service and Privacy Policy.
                        </p>
                    </form>

                    <div className="relative mt-8 mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-700/50"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 text-gray-500 bg-[#0f1115]">Or continue with</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full flex justify-center items-center py-3 px-4 rounded-xl border border-gray-700/50 bg-[#16181d]/80 text-white hover:bg-white/5 transition-all outline-none focus:ring-2 focus:ring-brand-500/50 disabled:opacity-50"
                    >
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Google
                    </button>

                    <p className="text-center text-sm text-gray-500 mt-6">
                        Already have an account?{' '}
                        <Link href="/auth/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
