'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { projectsApi, paymentsApi, usersApi, paiseTo } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Star, Download, Heart, Share2, Code2, Loader2, MessageCircle, ShoppingCart, ExternalLink, Github, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import ProjectCard from '@/components/ProjectCard';

declare global { interface Window { Razorpay: any; } }

export default function ProjectDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const router = useRouter();
    const [project, setProject] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [commentText, setCommentText] = useState('');
    const [loading, setLoading] = useState(true);
    const [buying, setBuying] = useState(false);
    const [rating, setRating] = useState(0);
    const [review, setReview] = useState('');
    const [submittingRating, setSubmittingRating] = useState(false);

    useEffect(() => {
        if (!id) return;
        Promise.all([projectsApi.get(id as string), projectsApi.getComments(id as string)])
            .then(([p, c]) => { setProject(p.data.data); setComments(c.data.data); })
            .catch(() => toast.error('Project not found'))
            .finally(() => setLoading(false));
    }, [id]);

    const handleBuy = async () => {
        if (!user) { router.push('/auth/login'); return; }
        setBuying(true);
        try {
            const { data } = await paymentsApi.createOrder(id as string);
            const orderData = data.data;

            if (orderData.free) {
                toast.success('Project claimed! Check your dashboard to download.');
                return;
            }

            // Load Razorpay checkout
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            document.body.appendChild(script);
            script.onload = () => {
                const rzp = new window.Razorpay({
                    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                    amount: orderData.amount,
                    currency: 'INR',
                    name: 'DevMarket',
                    description: project?.title,
                    order_id: orderData.razorpay_order_id,
                    handler: async (response: any) => {
                        try {
                            await paymentsApi.verifyPayment({
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_signature: response.razorpay_signature,
                            });
                            toast.success('Payment successful! Go to Dashboard to download.');
                            router.push('/dashboard');
                        } catch {
                            toast.error('Payment verification failed. Contact support.');
                        }
                    },
                    prefill: { email: user?.email, name: user?.name },
                    theme: { color: '#6172f3' },
                });
                rzp.open();
            };
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Purchase failed');
        } finally {
            setBuying(false);
        }
    };

    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) { router.push('/auth/login'); return; }
        if (!commentText.trim()) return;
        try {
            await projectsApi.addComment(id as string, commentText);
            const { data } = await projectsApi.getComments(id as string);
            setComments(data.data);
            setCommentText('');
            toast.success('Comment added!');
        } catch { toast.error('Failed to add comment'); }
    };

    const handleLike = async () => {
        if (!user) { router.push('/auth/login'); return; }
        try {
            await projectsApi.like(id as string);
            setProject((p: any) => ({ ...p, like_count: (p.like_count || 0) + 1 }));
            toast.success('Liked!');
        } catch { toast.error('Already liked or failed'); }
    };

    const handleRate = async () => {
        if (!user) { router.push('/auth/login'); return; }
        if (!rating) { toast.error('Please select a star rating'); return; }
        setSubmittingRating(true);
        try {
            const { data } = await projectsApi.rate(id as string, { score: rating, review });
            setProject((p: any) => ({ ...p, average_rating: data.data.average_rating, rating_count: data.data.rating_count }));
            toast.success('Rating submitted!');
            setRating(0); setReview('');
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Rating failed');
        } finally { setSubmittingRating(false); }
    };

    if (loading) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 size={36} className="animate-spin text-brand-500" /></div>;
    if (!project) return <div className="text-center py-32 text-gray-400">Project not found</div>;

    const isFree = project.price === 0;

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Main content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Screenshots */}
                    {project.image_urls?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {project.image_urls.map((url: string, idx: number) => (
                                <div key={idx} className="glass overflow-hidden rounded-2xl md:col-span-1">
                                    <img src={url} alt={`${project.title} screenshot ${idx + 1}`} className="w-full h-48 md:h-64 object-cover hover:scale-105 transition-transform duration-500" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="glass rounded-2xl h-52 flex items-center justify-center text-7xl opacity-20">{'</>'}</div>
                    )}

                    {/* Info */}
                    <div className="glass p-6 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                            <h1 className="text-2xl font-bold text-white leading-tight">{project.title}</h1>
                            <div className="flex items-center gap-2 shrink-0">
                                {user && project.user_id === user.id && (
                                    <button onClick={() => router.push(`/projects/${project.id}/edit`)} className="btn-ghost p-2 text-brand-400 hover:text-brand-300">
                                        <Pencil size={18} />
                                    </button>
                                )}
                                <button onClick={handleLike} className="btn-ghost p-2">
                                    <Heart size={18} className="text-pink-400" />
                                    <span className="text-xs">{project.like_count || 0}</span>
                                </button>
                                <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }} className="btn-ghost p-2">
                                    <Share2 size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span className="flex items-center gap-1">
                                <Star size={14} className="text-yellow-400 fill-yellow-400" />
                                {project.average_rating > 0 ? project.average_rating.toFixed(1) : 'No ratings'} ({project.rating_count})
                            </span>
                            <span className="flex items-center gap-1"><Download size={14} /> {project.total_sales} sales</span>
                            <span className="badge">{project.license}</span>
                            <span className="badge">{project.category}</span>
                        </div>

                        <p className="text-gray-300 leading-relaxed">{project.description}</p>

                        {/* Tech stack */}
                        <div className="flex flex-wrap gap-2">
                            {project.tech_stack?.map((t: string) => <span key={t} className="badge">{t}</span>)}
                        </div>

                        {/* Project Links */}
                        {(project.live_url || project.github_url) && (
                            <div className="flex flex-wrap gap-4 pt-4 border-t border-white/5">
                                {project.live_url && (
                                    <a href={project.live_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-brand-400 hover:text-brand-300 font-medium transition-colors">
                                        <ExternalLink size={16} /> Live Demo
                                    </a>
                                )}
                                {project.github_url && (
                                    <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-300 hover:text-white font-medium transition-colors">
                                        <Github size={16} /> Source Code
                                    </a>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Rating form */}
                    {user && (
                        <div className="glass p-6">
                            <h3 className="font-semibold text-white mb-4">Rate this project</h3>
                            <div className="flex gap-2 mb-3">
                                {[1, 2, 3, 4, 5].map(s => (
                                    <button key={s} onClick={() => setRating(s)} className="text-2xl transition-transform hover:scale-110">
                                        <Star size={28} className={s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'} />
                                    </button>
                                ))}
                            </div>
                            <textarea
                                placeholder="Write a review (optional)..."
                                value={review}
                                onChange={e => setReview(e.target.value)}
                                className="input mb-3 resize-none"
                                rows={3}
                            />
                            <button onClick={handleRate} disabled={submittingRating} className="btn-primary">
                                {submittingRating ? <Loader2 size={16} className="animate-spin" /> : 'Submit Rating'}
                            </button>
                        </div>
                    )}

                    {/* Comments */}
                    <div className="glass p-6">
                        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                            <MessageCircle size={18} className="text-brand-400" />
                            Comments ({comments.length})
                        </h3>
                        {user && (
                            <form onSubmit={handleComment} className="flex gap-3 mb-5">
                                <input
                                    type="text"
                                    placeholder="Write a comment…"
                                    value={commentText}
                                    onChange={e => setCommentText(e.target.value)}
                                    className="input flex-1"
                                />
                                <button type="submit" className="btn-primary shrink-0">Post</button>
                            </form>
                        )}
                        <div className="space-y-3">
                            {comments.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-4">No comments yet. Be the first!</p>
                            ) : comments.map((c: any) => (
                                <div key={c.id} className="flex gap-3 bg-white/3 rounded-xl p-3">
                                    <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold shrink-0">U</div>
                                    <div>
                                        <p className="text-sm text-gray-300">{c.body}</p>
                                        <p className="text-xs text-gray-600 mt-1">{new Date(c.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar — Buy card */}
                <div className="lg:col-span-1">
                    <div className="glass p-6 sticky top-24 space-y-5">
                        <div className="text-center">
                            <div className={`text-4xl font-extrabold mb-1 ${isFree ? 'text-emerald-400' : 'text-gradient'}`}>
                                {isFree ? 'Free' : paiseTo(project.price)}
                            </div>
                            {!isFree && <p className="text-xs text-gray-500">+2% Razorpay fee • 10% platform commission</p>}
                        </div>

                        <button
                            id="buy-project-btn"
                            onClick={handleBuy}
                            disabled={buying}
                            className="btn-primary w-full justify-center py-3 text-base"
                        >
                            {buying ? <Loader2 size={18} className="animate-spin" /> : (
                                <><ShoppingCart size={18} /> {isFree ? 'Get for Free' : 'Buy Now'}</>
                            )}
                        </button>

                        <ul className="text-sm text-gray-400 space-y-2">
                            <li className="flex items-center gap-2"><Download size={14} className="text-brand-400" /> Instant ZIP download</li>
                            <li className="flex items-center gap-2"><Code2 size={14} className="text-brand-400" /> Full source code</li>
                            <li className="flex items-center gap-2"><Star size={14} className="text-brand-400" /> {project.rating_count} reviews</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
