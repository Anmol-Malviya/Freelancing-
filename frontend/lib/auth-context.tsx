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
    loginWithGoogle: () => Promise<void>;
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
        const { signInWithEmailAndPassword } = await import('firebase/auth');
        const { auth } = await import('@/lib/firebase');

        // 1. Authenticate with Firebase
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const fbToken = await userCredential.user.getIdToken();

        // 2. Sync with Backend
        const { data } = await authApi.firebaseLogin({ token: fbToken });
        const { access_token, refresh_token, user: u } = data.data;

        Cookies.set('access_token', access_token, { expires: 1 / 96 });
        Cookies.set('refresh_token', refresh_token, { expires: 7 });
        setUser(u);
    };

    const loginWithGoogle = async () => {
        const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
        const { auth } = await import('@/lib/firebase');

        // 1. Authenticate with Google (Popup)
        const provider = new GoogleAuthProvider();
        const userCredential = await signInWithPopup(auth, provider);
        const fbToken = await userCredential.user.getIdToken();

        // 2. Sync with Backend
        // If the user doesn't exist in MongoDB, the backend will auto-create them!
        const { data } = await authApi.firebaseLogin({
            token: fbToken,
            name: userCredential.user.displayName || undefined
        });

        const { access_token, refresh_token, user: u } = data.data;

        Cookies.set('access_token', access_token, { expires: 1 / 96 });
        Cookies.set('refresh_token', refresh_token, { expires: 7 });
        setUser(u);
    };

    const register = async (name: string, email: string, password: string) => {
        const { createUserWithEmailAndPassword } = await import('firebase/auth');
        const { auth } = await import('@/lib/firebase');

        // 1. Create User in Firebase
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const fbToken = await userCredential.user.getIdToken();

        // 2. Sync with Backend (It will create the user in MongoDB if it doesn't exist)
        const { data } = await authApi.firebaseLogin({ token: fbToken, name });
        const { access_token, refresh_token, user: u } = data.data;

        Cookies.set('access_token', access_token, { expires: 1 / 96 });
        Cookies.set('refresh_token', refresh_token, { expires: 7 });
        setUser(u);
    };

    const logout = async () => {
        const { signOut } = await import('firebase/auth');
        const { auth } = await import('@/lib/firebase');

        await signOut(auth).catch(() => { });
        try { await authApi.logout(); } catch { }
        Cookies.remove('access_token');
        Cookies.remove('refresh_token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, register, logout, refresh }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
};
