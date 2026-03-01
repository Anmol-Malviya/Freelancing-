'use client';
import Link from 'next/link';
import { ArrowRight, Code2, ShoppingBag, TrendingUp, Shield, Zap, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const FEATURES = [
    { icon: ShoppingBag, title: 'Sell Source Code', desc: 'Upload your projects as ZIP files and start earning instantly.' },
    { icon: Users, title: 'Build Your Audience', desc: 'Follow developers, like projects, and grow your profile.' },
    { icon: Shield, title: 'Secure Payments', desc: 'Razorpay-powered payments with instant earnings dashboard.' },
    { icon: Zap, title: 'Fast Downloads', desc: 'S3-backed private file delivery with signed URLs.' },
    { icon: TrendingUp, title: 'Track Earnings', desc: 'Real-time commission breakdown, withdraw anytime via UPI.' },
    { icon: Code2, title: 'Dev-First Platform', desc: 'Built by developers, for developers. No middlemen.' },
];

const STATS = [
    { value: '10%', label: 'Platform fee only' },
    { value: '₹0', label: 'Free to upload' },
    { value: '5 min', label: 'Signed URL TTL' },
    { value: '24/7', label: 'Available' },
];

export default function HomePage() {
    const { user } = useAuth();

    return (
        <div className="relative">
            {/* Hero */}
            <section className="relative overflow-hidden bg-glow min-h-[90vh] flex items-center">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full bg-brand-600/10 blur-3xl" />
                    <div className="absolute top-1/2 right-1/4 w-80 h-80 rounded-full bg-purple-600/10 blur-3xl" />
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-sm font-medium mb-8 animate-fade-in">
                        <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse-slow" />
                        Developer Marketplace — Now Live
                    </div>

                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] animate-slide-up">
                        Monetize Your{' '}
                        <span className="text-gradient">Code.</span>
                        <br />
                        Build Your Brand.
                    </h1>

                    <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto animate-slide-up">
                        DevMarket is the marketplace where developers sell source code, showcase projects,
                        and build a following — all in one place.
                    </p>

                    <div className="mt-10 flex flex-wrap items-center justify-center gap-4 animate-slide-up">
                        {user ? (
                            <>
                                <Link href="/marketplace" className="btn-primary px-7 py-3 text-base">
                                    Explore Projects <ArrowRight size={18} />
                                </Link>
                                <Link href="/upload" className="btn-secondary px-7 py-3 text-base">
                                    Upload & Earn
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link href="/auth/register" className="btn-primary px-7 py-3 text-base">
                                    Start Selling Free <ArrowRight size={18} />
                                </Link>
                                <Link href="/marketplace" className="btn-secondary px-7 py-3 text-base">
                                    Browse Projects
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Stats row */}
                    <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
                        {STATS.map(({ value, label }) => (
                            <div key={label} className="glass py-4 px-2 text-center">
                                <div className="text-2xl font-bold text-gradient">{value}</div>
                                <div className="text-xs text-gray-500 mt-1">{label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                <div className="text-center mb-14">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white">Everything you need to ship & earn</h2>
                    <p className="text-gray-400 mt-3 text-lg">A complete platform built around the developer workflow.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {FEATURES.map(({ icon: Icon, title, desc }) => (
                        <div key={title} className="glass-hover p-6">
                            <div className="w-11 h-11 rounded-xl bg-brand-500/15 flex items-center justify-center mb-4">
                                <Icon size={22} className="text-brand-400" />
                            </div>
                            <h3 className="font-semibold text-white text-base mb-2">{title}</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
                <div className="glass p-12 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-600/10 to-purple-600/10 pointer-events-none" />
                    <h2 className="relative text-3xl font-bold text-white">Ready to start earning?</h2>
                    <p className="relative text-gray-400 mt-3 mb-8">Upload your first project today. It's free.</p>
                    <Link href="/auth/register" className="btn-primary px-8 py-3 text-base relative">
                        Create Free Account <ArrowRight size={18} />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/5 py-8">
                <div className="max-w-7xl mx-auto px-4 text-center text-gray-600 text-sm">
                    © 2026 DevMarket. Built for developers, by developers.
                </div>
            </footer>
        </div>
    );
}
