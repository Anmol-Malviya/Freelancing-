'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { authApi, usersApi } from '@/lib/api';

interface User {
    id: string; name: string; email: string;
    role: string; email_verified: boolean;
    profile_image?: string; bio?: string;
    withdrawable_balance: number; total_earnings: number;
}

interface AuthCtx {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = async () => {
        try {
            const { data } = await usersApi.me();
            setUser(data.data);
        } catch {
            setUser(null);
        }
    };

    useEffect(() => {
        const token = Cookies.get('access_token');
        if (token) {
            refresh().finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email: string, password: string) => {
        const { data } = await authApi.login({ email, password });
        const { access_token, refresh_token, user: u } = data.data;
        Cookies.set('access_token', access_token, { expires: 1 / 96 });
        Cookies.set('refresh_token', refresh_token, { expires: 7 });
        setUser(u);
    };

    const register = async (name: string, email: string, password: string) => {
        const { data } = await authApi.register({ name, email, password });
        const { access_token, refresh_token, user: u } = data.data;
        Cookies.set('access_token', access_token, { expires: 1 / 96 });
        Cookies.set('refresh_token', refresh_token, { expires: 7 });
        setUser(u);
    };

    const logout = async () => {
        try { await authApi.logout(); } catch { }
        Cookies.remove('access_token');
        Cookies.remove('refresh_token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
};
