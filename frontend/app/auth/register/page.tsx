'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Code2, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
    const { register } = useAuth();
    const router = useRouter();
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
        setLoading(true);
        try {
            await register(form.name, form.email, form.password);
            toast.success('Account created! Welcome to DevMarket 🎉');
            router.push('/marketplace');
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Registration failed');
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
                    <p className="text-gray-400 mt-1 text-sm">Free forever. Start selling in minutes.</p>
                </div>

                <div className="glass p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                            <input
                                id="register-name"
                                type="text"
                                required
                                placeholder="Anmol Malviya"
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                className="input"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                            <input
                                id="register-email"
                                type="email"
                                required
                                placeholder="you@example.com"
                                value={form.email}
                                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                className="input"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Password <span className="text-gray-500 font-normal">(min. 8 characters)</span>
                            </label>
                            <div className="relative">
                                <input
                                    id="register-password"
                                    type={showPw ? 'text' : 'password'}
                                    required
                                    minLength={8}
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                    className="input pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(!showPw)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                >
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {/* Password strength bar */}
                            <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{
                                        width: `${Math.min(100, (form.password.length / 12) * 100)}%`,
                                        backgroundColor: form.password.length < 8 ? '#ef4444' : form.password.length < 12 ? '#f59e0b' : '#10b981',
                                    }}
                                />
                            </div>
                        </div>

                        <button id="register-submit" type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Create Account'}
                        </button>

                        <p className="text-center text-xs text-gray-500">
                            By signing up, you agree to our Terms of Service and Privacy Policy.
                        </p>
                    </form>

                    <p className="text-center text-sm text-gray-500 mt-6">
                        Already have an account?{' '}
                        <Link href="/auth/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
