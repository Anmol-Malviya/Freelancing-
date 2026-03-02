'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Code2, Loader2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
    const { requestOtp, verifyOtp } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<1 | 2>(1);

    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await requestOtp(email);
            toast.success('Verification code sent to your email');
            setStep(2);
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to send code');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await verifyOtp(email, otp);
            toast.success('Welcome back!');
            router.push('/marketplace');
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Invalid verification code');
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
                    <h1 className="text-2xl font-bold text-white">Sign in to DevMarket</h1>
                    <p className="text-gray-400 mt-1 text-sm">
                        {step === 1 ? 'Enter your email to verify your identity' : `We sent a code to ${email}`}
                    </p>
                </div>

                <div className="glass p-8">
                    {step === 1 ? (
                        <form onSubmit={handleRequestOtp} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="input"
                                />
                            </div>
                            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Send Verification Code'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">6-Digit Code</label>
                                <input
                                    type="text"
                                    required
                                    maxLength={6}
                                    placeholder="123456"
                                    value={otp}
                                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                                    className="input text-center tracking-[0.5em] text-lg font-mono"
                                />
                            </div>
                            <button type="submit" disabled={loading || otp.length !== 6} className="btn-primary w-full justify-center py-3">
                                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Sign In'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="w-full text-sm text-gray-400 hover:text-white mt-4"
                            >
                                Use a different email
                            </button>
                        </form>
                    )}

                    <p className="text-center text-sm text-gray-500 mt-6">
                        Don't have an account?{' '}
                        <Link href="/auth/register" className="text-brand-400 hover:text-brand-300 font-medium">
                            Create one free
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
