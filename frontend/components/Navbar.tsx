'use client';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { Code2, LayoutDashboard, LogOut, Plus, ShoppingBag, User, Menu, X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function Navbar() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        toast.success('Logged out');
        router.push('/auth/login');
    };

    const navLinks = [
        { href: '/marketplace', label: 'Explore', icon: ShoppingBag },
    ];

    return (
        <nav className="sticky top-0 z-50 border-b border-white/5 bg-surface-900/80 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">

                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center group-hover:bg-brand-500 transition-colors">
                            <Code2 size={18} className="text-white" />
                        </div>
                        <span className="font-bold text-white text-lg tracking-tight">Dev<span className="text-gradient">Market</span></span>
                    </Link>

                    {/* Desktop Links */}
                    <div className="hidden md:flex items-center gap-1">
                        {navLinks.map(({ href, label, icon: Icon }) => (
                            <Link
                                key={href}
                                href={href}
                                className={`btn-ghost ${pathname === href ? 'text-white bg-white/5' : ''}`}
                            >
                                <Icon size={16} />
                                {label}
                            </Link>
                        ))}
                    </div>

                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center gap-3">
                        {user ? (
                            <>
                                <Link href="/upload" className="btn-secondary text-sm">
                                    <Plus size={16} /> Upload Project
                                </Link>
                                <Link href="/dashboard" className="btn-ghost">
                                    <LayoutDashboard size={16} /> Dashboard
                                </Link>
                                <Link href={`/profile/${user.id}`} className="flex items-center gap-2 btn-ghost">
                                    <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold">
                                        {user.name[0].toUpperCase()}
                                    </div>
                                    {user.name.split(' ')[0]}
                                </Link>
                                <button onClick={handleLogout} className="btn-ghost text-red-400 hover:text-red-300">
                                    <LogOut size={16} />
                                </button>
                            </>
                        ) : (
                            <>
                                <Link href="/auth/login" className="btn-ghost">Sign In</Link>
                                <Link href="/auth/register" className="btn-primary">Get Started</Link>
                            </>
                        )}
                    </div>

                    {/* Mobile menu toggle */}
                    <button className="md:hidden btn-ghost p-2" onClick={() => setMenuOpen(!menuOpen)}>
                        {menuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>

                {/* Mobile menu */}
                {menuOpen && (
                    <div className="md:hidden pb-4 space-y-1 animate-slide-up">
                        <Link href="/marketplace" className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-300 hover:bg-white/5" onClick={() => setMenuOpen(false)}>
                            <ShoppingBag size={16} /> Explore
                        </Link>
                        {user ? (
                            <>
                                <Link href="/upload" className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-300 hover:bg-white/5" onClick={() => setMenuOpen(false)}>
                                    <Plus size={16} /> Upload Project
                                </Link>
                                <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-300 hover:bg-white/5" onClick={() => setMenuOpen(false)}>
                                    <LayoutDashboard size={16} /> Dashboard
                                </Link>
                                <Link href={`/profile/${user.id}`} className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-300 hover:bg-white/5" onClick={() => setMenuOpen(false)}>
                                    <User size={16} /> Profile
                                </Link>
                                <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 w-full">
                                    <LogOut size={16} /> Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link href="/auth/login" className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-300 hover:bg-white/5" onClick={() => setMenuOpen(false)}>Sign In</Link>
                                <Link href="/auth/register" className="btn-primary w-full justify-center mt-2" onClick={() => setMenuOpen(false)}>Get Started</Link>
                            </>
                        )}
                    </div>
                )}
            </div>
        </nav>
    );
}
