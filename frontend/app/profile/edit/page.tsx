'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usersApi } from '@/lib/api';
import { Loader2, Save, User, Github, FileText, Code } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function EditProfilePage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        name: '',
        bio: '',
        skills: '',
        github_url: '',
    });

    useEffect(() => {
        // useAuth uses `loading` but sometimes we might want to check the user explicitly
        if (!authLoading && !user) {
            router.push('/auth/login');
            return;
        }

        if (user) {
            // Fetch latest profile details
            usersApi.me()
                .then((res) => {
                    const data = res.data.data;
                    setForm({
                        name: data.name || '',
                        bio: data.bio || '',
                        skills: data.skills ? data.skills.join(', ') : '',
                        github_url: data.github_url || '',
                    });
                })
                .catch(() => toast.error('Failed to load profile parameters'))
                .finally(() => setLoading(false));
        }
    }, [user, authLoading, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const skillsArray = form.skills
                .split(',')
                .map((s) => s.trim())
                .filter((s) => s.length > 0);

            await usersApi.updateMe({
                name: form.name.trim(),
                bio: form.bio.trim() || undefined,
                skills: skillsArray,
                github_url: form.github_url.trim() || undefined,
            });
            toast.success('Profile updated successfully!');
            router.push(`/profile/${user?.id}`);
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <Loader2 size={36} className="animate-spin text-brand-500" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <h1 className="section-title text-3xl mb-1">Edit Profile</h1>
            <p className="section-sub mb-8">Update your personal details and skills.</p>

            <form onSubmit={handleSubmit} className="glass p-8 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                        <User size={16} /> Display Name
                    </label>
                    <input
                        type="text"
                        required
                        minLength={2}
                        maxLength={60}
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="input"
                        placeholder="John Doe"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                        <FileText size={16} /> Bio
                    </label>
                    <textarea
                        maxLength={500}
                        rows={4}
                        value={form.bio}
                        onChange={(e) => setForm({ ...form, bio: e.target.value })}
                        className="input resize-none"
                        placeholder="Tell the world a little about yourself..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                        <Code size={16} /> Skills
                    </label>
                    <input
                        type="text"
                        value={form.skills}
                        onChange={(e) => setForm({ ...form, skills: e.target.value })}
                        className="input"
                        placeholder="React, Node.js, Python (comma separated)"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                        <Github size={16} /> GitHub Profile URL
                    </label>
                    <input
                        type="url"
                        value={form.github_url}
                        onChange={(e) => setForm({ ...form, github_url: e.target.value })}
                        className="input"
                        placeholder="https://github.com/yourusername"
                    />
                </div>

                <div className="pt-4 flex items-center justify-end gap-4 border-t border-white/10">
                    <button
                        type="button"
                        onClick={() => router.push(`/profile/${user?.id}`)}
                        className="btn-secondary"
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={saving}>
                        {saving ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <><Save size={16} /> Save Changes</>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
