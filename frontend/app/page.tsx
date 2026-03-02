'use client';
import Link from 'next/link';
import {
    ArrowRight, Code2, ShoppingBag, TrendingUp, Shield,
    Zap, Users, Sparkles, CheckCircle2, CloudUpload
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const FEATURES = [
    { icon: ShoppingBag, title: 'Sell Source Code', desc: 'Upload your projects as ZIP files and start earning instantly with zero hidden fees.' },
    { icon: Users, title: 'Build Your Audience', desc: 'Follow developers, like projects, and grow your professional profile gracefully.' },
    { icon: Shield, title: 'Secure Payments', desc: 'Razorpay-powered payments with instant earnings dashboard and automated payouts.' },
    { icon: Zap, title: 'Fast Downloads', desc: 'S3-backed private file delivery with secure, time-limited signed URLs.' },
    { icon: TrendingUp, title: 'Track Earnings', desc: 'Real-time commission breakdown, withdraw anytime via UPI directly to your bank.' },
    { icon: Code2, title: 'Dev-First Platform', desc: 'Built by developers, for developers. No middlemen, no nonsense, pure logic.' },
];

const STEPS = [
    { step: '01', title: 'Upload Project', desc: 'Pack your code, write a compelling README, and upload securely.' },
    { step: '02', title: 'Set Your Price', desc: 'Decide what your work is worth. Keep up to 90% of every single sale.' },
    { step: '03', title: 'Start Earning', desc: 'Get paid instantly when other developers buy and download your code.' },
];

const STATS = [
    { value: '90%', label: 'Creator Revenue' },
    { value: 'Zero', label: 'Listing Fees' },
    { value: 'Instant', label: 'Delivery' },
    { value: '24/7', label: 'Support' },
];

export default function HomePage() {
    const { user } = useAuth() as any;

    return (
        <div className="relative min-h-screen bg-surface-900 text-white selection:bg-brand-500/30 font-sans">
            {/* Background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-600/20 blur-[120px]" />
                <div className="absolute top-[20%] right-[-10%] w-[30%] h-[40%] rounded-full bg-purple-600/20 blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px]" />
            </div>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-sm font-medium mb-8 animate-fade-in shadow-[0_0_15px_rgba(97,114,243,0.2)] backdrop-blur-md">
                    <Sparkles size={16} className="animate-pulse" />
                    <span className="tracking-wide">The Next-Gen Developer Marketplace</span>
                </div>

                <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black tracking-tight text-white leading-[1.1] animate-slide-up">
                    Monetize Your <br className="hidden sm:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-purple-400 to-brand-300">
                        Code & Creativity.
                    </span>
                </h1>

                <p className="mt-8 text-lg sm:text-2xl text-gray-400 max-w-3xl mx-auto animate-slide-up leading-relaxed">
                    DevMarket is the premium marketplace where top-tier developers sell source code, showcase projects, and build a massive following.
                </p>

                <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-5 w-full sm:w-auto animate-slide-up">
                    {user ? (
                        <>
                            <Link href="/marketplace" className="btn-primary px-8 py-4 text-lg w-full sm:w-auto group">
                                Explore Projects <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link href="/upload" className="btn-secondary px-8 py-4 text-lg w-full sm:w-auto flex items-center justify-center gap-2">
                                <CloudUpload size={20} /> Upload & Earn
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link href="/auth/register" className="btn-primary px-8 py-4 text-lg w-full sm:w-auto group shadow-[0_0_30px_rgba(97,114,243,0.3)] hover:shadow-[0_0_40px_rgba(97,114,243,0.5)]">
                                Start Selling for Free <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link href="/marketplace" className="btn-secondary px-8 py-4 text-lg w-full sm:w-auto flex items-center justify-center gap-2 group">
                                Browse Projects
                            </Link>
                        </>
                    )}
                </div>

                {/* Hero Stats */}
                <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 max-w-4xl mx-auto w-full border-t border-white/5 pt-12 animate-slide-up">
                    {STATS.map(({ value, label }) => (
                        <div key={label} className="flex flex-col items-center justify-center p-4">
                            <div className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">{value}</div>
                            <div className="text-xs sm:text-sm text-gray-500 font-bold uppercase tracking-wider">{label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* How it Works */}
            <section className="py-24 bg-surface-800/40 border-y border-white/5 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">How DevMarket Works</h2>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">Three simple steps to start monetizing your development skills.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 relative">
                        {/* Connecting line for desktop */}
                        <div className="hidden md:block absolute top-[20%] left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-brand-500/0 via-brand-500/20 to-brand-500/0" />

                        {STEPS.map(({ step, title, desc }) => (
                            <div key={step} className="relative z-10 flex flex-col pt-8 sm:pt-0 items-center text-center group">
                                <div className="w-16 h-16 rounded-2xl bg-surface-900 border border-brand-500/30 flex items-center justify-center text-2xl font-bold text-brand-400 mb-6 shadow-[0_0_20px_rgba(97,114,243,0.2)] group-hover:scale-110 transition-transform duration-300 group-hover:bg-brand-500/10">
                                    {step}
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-4">{title}</h3>
                                <p className="text-gray-400 leading-relaxed text-lg">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row gap-12 items-end mb-16">
                    <div className="flex-1">
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">Everything you need to <br className="hidden lg:block" />ship & earn</h2>
                        <p className="text-xl text-gray-400">A complete platform built meticulously around the modern developer workflow.</p>
                    </div>
                    <div className="hidden md:block pb-2">
                        <Link href="/auth/register" className="btn-secondary gap-2 rounded-xl px-6 py-3">
                            Join the community <ArrowRight size={16} />
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                    {FEATURES.map(({ icon: Icon, title, desc }) => (
                        <div key={title} className="glass p-8 rounded-3xl hover:-translate-y-2 hover:border-brand-500/30 hover:shadow-[0_10px_40px_-10px_rgba(97,114,243,0.2)] transition-all duration-300 group">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:bg-brand-500/20 group-hover:border-brand-500/30 transition-colors">
                                <Icon size={28} className="text-gray-300 group-hover:text-brand-400 transition-colors" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
                            <p className="text-gray-400 leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-5xl mx-auto glass p-10 sm:p-16 rounded-[2.5rem] text-center relative overflow-hidden border-brand-500/20 shadow-[0_0_50px_rgba(97,114,243,0.1)]">
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-600/20 to-purple-600/20 pointer-events-none" />
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/20 rounded-full blur-[80px]" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px]" />

                    <div className="relative z-10">
                        <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400">Ready to start earning?</h2>
                        <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">Upload your first project today. It only takes a couple of minutes and you keep the vast majority of the revenue.</p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <Link href="/auth/register" className="btn-primary px-10 py-5 text-lg rounded-2xl shadow-[0_0_20px_rgba(97,114,243,0.4)] hover:shadow-[0_0_30px_rgba(97,114,243,0.6)] justify-center">
                                Create Free Account <ArrowRight size={20} />
                            </Link>
                            <Link href="/marketplace" className="btn-secondary px-10 py-5 text-lg rounded-2xl bg-white/5 hover:bg-white/10 justify-center">
                                Browse Projects
                            </Link>
                        </div>
                        <p className="mt-6 text-sm text-gray-500 flex items-center justify-center gap-2">
                            <CheckCircle2 size={16} className="text-brand-400" /> No credit card required to sign up.
                        </p>
                    </div>
                </div>
            </section>

            {/* Premium Footer */}
            <footer className="border-t border-white/10 pt-16 pb-12 px-4 sm:px-6 lg:px-8 bg-surface-900/50">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                            D
                        </div>
                        <span className="text-xl font-bold tracking-tight text-white">DevMarket</span>
                    </div>

                    <div className="flex flex-wrap justify-center gap-6 sm:gap-10 text-gray-400 text-sm font-medium">
                        <Link href="/marketplace" className="hover:text-brand-400 transition-colors">Marketplace</Link>
                        <Link href="/auth/login" className="hover:text-brand-400 transition-colors">Sign In</Link>
                        <Link href="/upload" className="hover:text-brand-400 transition-colors">Upload</Link>
                    </div>

                    <div className="text-gray-600 text-sm">
                        © 2026 DevMarket. Built for developers.
                    </div>
                </div>
            </footer>
        </div>
    );
}
