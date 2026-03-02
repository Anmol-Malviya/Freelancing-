'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usersApi, projectsApi, paiseTo } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Github, Loader2, UserPlus, UserMinus, MapPin } from 'lucide-react';
import ProjectCard from '@/components/ProjectCard';
import toast from 'react-hot-toast';

export default function ProfilePage() {
    const { id } = useParams<{ id: string }>();
    const { user: currentUser } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [projects, setProjects] = useState<any[]>([]);
    const [followers, setFollowers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [following, setFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    useEffect(() => {
        if (!id) return;
        Promise.all([
            usersApi.getUser(id as string),
            projectsApi.list({ page: 1, limit: 12 }),
            usersApi.followers(id as string),
        ])
            .then(([u, p, f]) => {
                setProfile(u.data.data);
                setProjects(p.data.data.filter((proj: any) => proj.user_id === id));
                setFollowers(f.data.data);
                setFollowing(f.data.data.some((u: any) => u.id === currentUser?.id));
            })
            .catch(() => toast.error('Profile not found'))
            .finally(() => setLoading(false));
    }, [id, currentUser]);

    const handleFollowToggle = async () => {
        if (!currentUser) { return; }
        setFollowLoading(true);
        try {
            if (following) {
                await usersApi.unfollow(id as string);
                setFollowing(false);
                toast.success('Unfollowed');
            } else {
                await usersApi.follow(id as string);
                setFollowing(true);
                toast.success('Following!');
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Action failed');
        } finally {
            setFollowLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 size={36} className="animate-spin text-brand-500" /></div>;
    if (!profile) return <div className="text-center py-32 text-gray-400">User not found</div>;

    const isOwn = currentUser?.id === id;

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* Profile Header */}
            <div className="glass p-8 mb-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-r from-brand-900/40 to-purple-900/30" />

                <div className="relative flex flex-col sm:flex-row gap-6 items-start">
                    {/* Avatar */}
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center text-3xl font-extrabold text-white shrink-0 mt-4">
                        {profile.name?.[0]?.toUpperCase()}
                    </div>

                    <div className="flex-1 mt-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h1 className="text-2xl font-bold text-white">{profile.name}</h1>
                                {profile.bio && <p className="text-gray-400 mt-1">{profile.bio}</p>}
                            </div>

                            {!isOwn && currentUser && (
                                <button
                                    onClick={handleFollowToggle}
                                    disabled={followLoading}
                                    className={following ? 'btn-secondary' : 'btn-primary'}
                                >
                                    {followLoading ? <Loader2 size={16} className="animate-spin" /> :
                                        following ? <><UserMinus size={16} /> Unfollow</> : <><UserPlus size={16} /> Follow</>
                                    }
                                </button>
                            )}
                            {isOwn && (
                                <a href="/profile/edit" className="btn-secondary">Edit Profile</a>
                            )}
                        </div>

                        {/* Stats row */}
                        <div className="flex flex-wrap gap-6 mt-4 text-sm">
                            <div><span className="font-bold text-white">{projects.length}</span> <span className="text-gray-500">Projects</span></div>
                            <div><span className="font-bold text-white">{followers.length}</span> <span className="text-gray-500">Followers</span></div>
                            {isOwn && <div><span className="font-bold text-emerald-400">{paiseTo(profile.total_earnings)}</span> <span className="text-gray-500">Earned</span></div>}
                        </div>

                        {/* Links */}
                        <div className="flex flex-wrap gap-3 mt-4">
                            {profile.skills?.map((s: string) => <span key={s} className="badge">{s}</span>)}
                            {profile.github_url && (
                                <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs gap-1 py-1">
                                    <Github size={14} /> GitHub
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Projects */}
            <h2 className="section-title mb-4">Projects by {profile.name?.split(' ')[0]}</h2>
            {projects.length === 0 ? (
                <div className="glass py-20 text-center text-gray-500">
                    {isOwn ? (
                        <><p className="mb-4">You haven't uploaded any projects yet.</p>
                            <a href="/upload" className="btn-primary">Upload Your First Project</a></>
                    ) : 'No projects yet.'}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {projects.map(p => <ProjectCard key={p.id} project={p} />)}
                </div>
            )}
        </div>
    );
}
