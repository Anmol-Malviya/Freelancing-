'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usersApi, paymentsApi, paiseTo } from '@/lib/api';
import { TrendingUp, DollarSign, ShoppingBag, Download, Loader2, ArrowDownToLine } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [earnings, setEarnings] = useState<any>(null);
    const [purchases, setPurchases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [withdrawForm, setWithdrawForm] = useState({ amount: '', upi_id: '' });
    const [withdrawing, setWithdrawing] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) { router.push('/auth/login'); return; }
        if (user) {
            Promise.all([usersApi.earnings(), paymentsApi.purchases()])
                .then(([e, p]) => { setEarnings(e.data.data); setPurchases(p.data.data); })
                .catch(() => toast.error('Failed to load dashboard'))
                .finally(() => setLoading(false));
        }
    }, [user, authLoading]);

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!withdrawForm.upi_id || !withdrawForm.amount) return;
        const amountPaise = Math.round(parseFloat(withdrawForm.amount) * 100);
        if (amountPaise > (earnings?.withdrawable_balance || 0)) {
            toast.error('Insufficient balance'); return;
        }
        setWithdrawing(true);
        try {
            await usersApi.withdraw({ amount: amountPaise, upi_id: withdrawForm.upi_id });
            toast.success('Withdrawal requested! Processing in 2–3 days.');
            setWithdrawForm({ amount: '', upi_id: '' });
            const { data } = await usersApi.earnings();
            setEarnings(data.data);
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Withdrawal failed');
        } finally {
            setWithdrawing(false);
        }
    };

    if (authLoading || loading) {
        return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 size={36} className="animate-spin text-brand-500" /></div>;
    }

    const stats = [
        { label: 'Total Earnings', value: paiseTo(earnings?.total_earnings || 0), icon: TrendingUp, color: 'text-brand-400' },
        { label: 'Withdrawable Balance', value: paiseTo(earnings?.withdrawable_balance || 0), icon: DollarSign, color: 'text-emerald-400' },
        { label: 'Total Purchases', value: purchases.length, icon: ShoppingBag, color: 'text-purple-400' },
    ];

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-8">
                <h1 className="section-title text-3xl">Dashboard</h1>
                <p className="section-sub">Welcome back, {user?.name?.split(' ')[0]} 👋</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
                {stats.map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="stat-card">
                        <div className={`flex items-center gap-2 text-sm text-gray-400`}>
                            <Icon size={16} className={color} /> {label}
                        </div>
                        <div className="text-3xl font-bold text-white mt-1">{value}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Withdraw */}
                <div className="glass p-6">
                    <h2 className="section-title text-lg mb-1">Withdraw Earnings</h2>
                    <p className="section-sub mb-6">Available: <span className="text-emerald-400 font-semibold">{paiseTo(earnings?.withdrawable_balance || 0)}</span></p>

                    <form onSubmit={handleWithdraw} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Amount (₹)</label>
                            <input
                                id="withdraw-amount"
                                type="number"
                                step="0.01"
                                min="1"
                                placeholder="e.g. 500"
                                value={withdrawForm.amount}
                                onChange={e => setWithdrawForm(f => ({ ...f, amount: e.target.value }))}
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">UPI ID</label>
                            <input
                                id="withdraw-upi"
                                type="text"
                                placeholder="yourname@upi"
                                value={withdrawForm.upi_id}
                                onChange={e => setWithdrawForm(f => ({ ...f, upi_id: e.target.value }))}
                                className="input"
                            />
                        </div>
                        <button type="submit" disabled={withdrawing} className="btn-primary w-full justify-center">
                            {withdrawing ? <Loader2 size={16} className="animate-spin" /> : <><ArrowDownToLine size={16} /> Request Withdrawal</>}
                        </button>
                    </form>
                </div>

                {/* Transaction history */}
                <div className="glass p-6">
                    <h2 className="section-title text-lg mb-4">Transaction History</h2>
                    {earnings?.transactions?.length === 0 ? (
                        <p className="text-gray-500 text-sm py-8 text-center">No transactions yet</p>
                    ) : (
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                            {earnings?.transactions?.map((t: any) => (
                                <div key={t.id} className="flex items-center justify-between bg-white/3 rounded-xl px-4 py-3">
                                    <div>
                                        <div className="text-sm font-medium text-white capitalize">{t.type}</div>
                                        <div className="text-xs text-gray-500">{new Date(t.timestamp).toLocaleDateString()}</div>
                                    </div>
                                    <span className={`text-sm font-semibold ${t.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {t.type === 'credit' ? '+' : '-'}{paiseTo(t.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* My Purchases */}
                <div className="glass p-6 lg:col-span-2">
                    <h2 className="section-title text-lg mb-4">My Purchases</h2>
                    {purchases.length === 0 ? (
                        <p className="text-gray-500 text-sm py-8 text-center">You haven't purchased any projects yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-gray-500 text-xs border-b border-white/5">
                                        <th className="text-left py-3 pr-4">Project</th>
                                        <th className="text-left py-3 pr-4">Amount</th>
                                        <th className="text-left py-3 pr-4">Downloads</th>
                                        <th className="text-left py-3">Date</th>
                                        <th className="text-right py-3">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {purchases.map((p: any) => (
                                        <tr key={p.id}>
                                            <td className="py-3 pr-4 text-gray-300 font-mono text-xs">{p.project_id.slice(0, 10)}…</td>
                                            <td className="py-3 pr-4 text-white">{paiseTo(p.amount)}</td>
                                            <td className="py-3 pr-4 text-gray-400">{p.download_count} / {p.max_downloads}</td>
                                            <td className="py-3 text-gray-500">{new Date(p.created_at).toLocaleDateString()}</td>
                                            <td className="py-3 text-right">
                                                <a
                                                    href={`/api/v1/payments/download/${p.id}`}
                                                    className="btn-ghost text-xs p-2"
                                                    onClick={async (e) => {
                                                        e.preventDefault();
                                                        try {
                                                            const { data } = await paymentsApi.download(p.id);
                                                            window.open(data.data.download_url, '_blank');
                                                            toast.success(`${data.data.downloads_remaining} downloads remaining`);
                                                        } catch (err: any) {
                                                            toast.error(err?.response?.data?.detail || 'Download failed');
                                                        }
                                                    }}
                                                >
                                                    <Download size={14} /> Download
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
