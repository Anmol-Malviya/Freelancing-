import { Star, Download, ShoppingCart, Eye } from 'lucide-react';
import Link from 'next/link';
import { paiseTo } from '@/lib/api';

interface ProjectCardProps {
    project: {
        id: string;
        title: string;
        description: string;
        tech_stack: string[];
        price: number;
        total_sales: number;
        average_rating: number;
        rating_count: number;
        like_count: number;
        image_urls: string[];
        user_id: string;
    };
}

export default function ProjectCard({ project }: ProjectCardProps) {
    const isFree = project.price === 0;

    return (
        <Link href={`/projects/${project.id}`} className="block">
            <div className="glass-hover h-full flex flex-col">
                {/* Thumbnail */}
                <div className="h-44 rounded-t-2xl overflow-hidden bg-gradient-to-br from-brand-900/40 to-purple-900/30 flex items-center justify-center relative">
                    {project.image_urls?.[0] ? (
                        <img src={project.image_urls[0]} alt={project.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-5xl select-none opacity-30">{'</>'}</div>
                    )}
                    {/* Price badge */}
                    <div className="absolute top-3 right-3">
                        <span className={isFree ? 'badge-green' : 'badge'}>
                            {isFree ? 'Free' : paiseTo(project.price)}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col gap-3 flex-1">
                    <h3 className="font-semibold text-white text-base leading-snug line-clamp-2">
                        {project.title}
                    </h3>
                    <p className="text-gray-400 text-sm line-clamp-2 flex-1">
                        {project.description}
                    </p>

                    {/* Tech stack */}
                    <div className="flex flex-wrap gap-1.5">
                        {project.tech_stack.slice(0, 4).map((tech) => (
                            <span key={tech} className="badge text-xs">{tech}</span>
                        ))}
                        {project.tech_stack.length > 4 && (
                            <span className="badge text-xs">+{project.tech_stack.length - 4}</span>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                            <Star size={12} className="text-yellow-400 fill-yellow-400" />
                            <span>{project.average_rating > 0 ? project.average_rating.toFixed(1) : '—'}</span>
                            {project.rating_count > 0 && <span>({project.rating_count})</span>}
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                                <Download size={12} />
                                {project.total_sales}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
