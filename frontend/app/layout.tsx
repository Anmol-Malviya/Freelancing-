import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { Toaster } from 'react-hot-toast';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
    title: 'DevMarket — Buy & Sell Developer Projects',
    description: 'The marketplace where developers monetize their source code, build followers, and earn revenue.',
    keywords: 'developer marketplace, source code, buy code, sell code, projects',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className="dark">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
            </head>
            <body className="min-h-screen bg-surface-900">
                <AuthProvider>
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            style: { background: '#1a1a27', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
                            success: { iconTheme: { primary: '#6172f3', secondary: '#fff' } },
                        }}
                    />
                    <Navbar />
                    <main>{children}</main>
                </AuthProvider>
            </body>
        </html>
    );
}
