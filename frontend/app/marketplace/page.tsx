'use client';
import { useEffect, useState, useCallback } from 'react';
import { projectsApi } from '@/lib/api';
import ProjectCard from '@/components/ProjectCard';
import { Search, SlidersHorizontal, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

const TECH_TAGS = ['React', 'Next.js', 'Python', 'FastAPI', 'Node.js', 'Vue', 'Flutter', 'MongoDB', 'TypeScript', 'TailwindCSS'];
const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'price_asc', label: 'Price: Low → High' },
    { value: 'price_desc', label: 'Price: High → Low' },
];

export default function MarketplacePage() {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [tech, setTech] = useState('');
    const [sort, setSort] = useState('newest');
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState<{ total: number; pages: number } | null>(null);

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, limit: 12, sort };
            if (search) params.search = search;
            if (tech) params.tech = tech;
            const { data } = await projectsApi.list(params);
            setProjects(data?.data ?? []);
            setMeta(data?.meta ?? null);
        } catch {
            toast.error('Failed to load projects');
            setProjects([]);
            setMeta(null);
        } finally {
            setLoading(false);
        }
    }, [page, sort, tech, search]);

    useEffect(() => { fetchProjects(); }, [fetchProjects]);

    const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchProjects(); };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* Header */}
            <div className="mb-8">
                <h1 className="section-title text-3xl">Explore Projects</h1>
                <p className="section-sub">Discover source code from the developer community</p>
            </div>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="flex gap-3 mb-6">
                <div className="relative flex-1">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        id="marketplace-search"
                        type="text"
                        placeholder="Search projects, tech, descriptions…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="input pl-11"
                    />
                </div>
                <button type="submit" className="btn-primary">Search</button>
            </form>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-8 items-center">
                <span className="text-gray-500 text-sm flex items-center gap-1"><SlidersHorizontal size={14} /> Filters:</span>

                {/* Tech tags */}
                {TECH_TAGS.map(t => (
                    <button
                        key={t}
                        onClick={() => { setTech(tech === t ? '' : t); setPage(1); }}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 border ${tech === t
                            ? 'bg-brand-600 border-brand-500 text-white'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                            }`}
                    >
                        {t}
                    </button>
                ))}

                {tech && (
                    <button onClick={() => setTech('')} className="flex items-center gap-1 text-xs text-gray-500 hover:text-white">
                        <X size={12} /> Clear
                    </button>
                )}

                {/* Sort */}
                <div className="ml-auto">
                    <select
                        value={sort}
                        onChange={e => { setSort(e.target.value); setPage(1); }}
                        className="input py-2 text-sm w-auto bg-surface-700"
                    >
                        {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            </div>

            {/* Results */}
            {loading ? (
                <div className="flex justify-center items-center py-32">
                    <Loader2 size={36} className="text-brand-500 animate-spin" />
                </div>
            ) : projects.length === 0 ? (
                <div className="text-center py-32">
                    <div className="text-5xl mb-4">🔍</div>
                    <p className="text-gray-400">No projects found. Try a different search.</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {projects.map(p => <ProjectCard key={p.id} project={p} />)}
                    </div>

                    {/* Pagination */}
                    {meta && meta.pages > 1 && (
                        <div className="flex justify-center gap-2 mt-10">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="btn-secondary disabled:opacity-40"
                            >
                                Previous
                            </button>
                            <span className="flex items-center px-4 text-gray-400 text-sm">
                                Page {page} of {meta.pages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(meta.pages, p + 1))}
                                disabled={page === meta.pages}
                                className="btn-secondary disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
