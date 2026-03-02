'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { projectsApi } from '@/lib/api';
import { Upload, X, Plus, Loader2, AlertCircle, FileArchive, CheckCircle2, CloudUpload, ImageIcon, Link, Github } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = ['Web App', 'Mobile App', 'CLI Tool', 'Machine Learning', 'API/Backend', 'Game', 'Other'];
const LICENSES = ['MIT', 'Apache 2.0', 'GPL v3', 'Proprietary', 'CC BY 4.0'];

export default function UploadPage() {
    const { user } = useAuth();
    const router = useRouter();

    const [form, setForm] = useState({
        title: '', description: '', category: 'Web App',
        license: 'MIT', price: '', live_url: '', github_url: '',
    });
    const [techInput, setTechInput] = useState('');
    const [techStack, setTechStack] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    // Image upload state
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [imageUploading, setImageUploading] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);

    // File upload state
    const [file, setFile] = useState<File | null>(null);
    const [fileUploading, setFileUploading] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<{ file_id: string; file_url: string; file_name: string; file_size: number } | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <AlertCircle size={40} className="text-brand-400" />
                <p className="text-gray-400">Please <a href="/auth/login" className="text-brand-400">sign in</a> to upload projects.</p>
            </div>
        );
    }

    const addTech = () => {
        const t = techInput.trim();
        if (t && !techStack.includes(t) && techStack.length < 20) {
            setTechStack([...techStack, t]);
            setTechInput('');
        }
    };

    // ─── Image handling (Standalone) ─────────────────────────
    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        const allowed = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
        const isAllowed = allowed.some(ext => selectedFile.name.toLowerCase().endsWith(ext));
        if (!isAllowed) {
            toast.error('Only images allowed: ' + allowed.join(', '));
            return;
        }

        if (selectedFile.size > 5 * 1024 * 1024) {
            toast.error('Image too large. Max 5MB.');
            return;
        }

        setImageUploading(true);
        try {
            const { data } = await projectsApi.uploadStandaloneImage(selectedFile);
            setImageUrls(prev => [...prev, data.data.image_url]);
            toast.success('Image uploaded successfully!');
        } catch (err: any) {
            const detail = err?.response?.data?.detail;
            const msg = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map((d: any) => d.msg).join(', ') : 'Image upload failed';
            toast.error(msg);
        } finally {
            setImageUploading(false);
        }
    };

    // ─── File handling ───────────────────────────────────────────
    const handleFileSelect = async (selectedFile: File) => {
        const allowed = ['.zip', '.rar', '.tar.gz', '.7z', '.gz'];
        const isAllowed = allowed.some(ext => selectedFile.name.toLowerCase().endsWith(ext));
        if (!isAllowed) {
            toast.error('Only archive files are allowed: ' + allowed.join(', '));
            return;
        }
        if (selectedFile.size > 10 * 1024 * 1024) {
            toast.error('File too large. Max size: 10MB');
            return;
        }

        setFile(selectedFile);
        setFileUploading(true);

        try {
            const { data } = await projectsApi.uploadFile(selectedFile);
            setUploadedFile(data.data);
            toast.success('File uploaded successfully!');
        } catch (err: any) {
            const detail = err?.response?.data?.detail;
            const msg = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map((d: any) => d.msg).join(', ') : 'File upload failed';
            toast.error(msg);
            setFile(null);
        } finally {
            setFileUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files?.[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(e.type === 'dragenter' || e.type === 'dragover');
    };

    const removeFile = () => {
        setFile(null);
        setUploadedFile(null);
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // ─── Submit ──────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadedFile) { toast.error('Please upload a project file first'); return; }
        if (techStack.length === 0) { toast.error('Add at least one technology'); return; }

        const price = form.price === '' || form.price === '0' ? 0 : Math.round(parseFloat(form.price) * 100);

        setLoading(true);
        try {
            await projectsApi.create({
                ...form,
                price,
                tech_stack: techStack,
                s3_file_key: uploadedFile.file_id,
                file_url: uploadedFile.file_url,
                image_urls: imageUrls,
            });
            toast.success('Project uploaded! 🎉');
            router.push('/marketplace');
        } catch (err: any) {
            const detail = err?.response?.data?.detail;
            const msg = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map((d: any) => d.msg).join(', ') : 'Upload failed';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
            <div className="mb-8">
                <h1 className="section-title text-3xl">Upload Project</h1>
                <p className="section-sub">Share your source code with the community</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Basic info */}
                <div className="glass p-6 space-y-5">
                    <h2 className="font-semibold text-white">Project Info</h2>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
                        <input id="upload-title" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input" placeholder="e.g. Full-Stack E-commerce App" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Description * <span className="text-gray-500">(min. 20 chars)</span></label>
                        <textarea id="upload-desc" required minLength={20} rows={5} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input resize-none" placeholder="Describe your project, what it does, features, setup instructions…" />
                        <div className="text-xs text-gray-600 mt-1 text-right">{form.description.length} chars</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input">
                                {CATEGORIES.map(c => <option key={c} value={c} className="bg-surface-800 text-white">{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">License</label>
                            <select value={form.license} onChange={e => setForm(f => ({ ...f, license: e.target.value }))} className="input">
                                {LICENSES.map(l => <option key={l} value={l} className="bg-surface-800 text-white">{l}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Additional Links */}
                <div className="glass p-6 space-y-4">
                    <h2 className="font-semibold text-white">Project Links</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2"><Link size={16} /> Live Demo URL</label>
                            <input value={form.live_url} onChange={e => setForm(f => ({ ...f, live_url: e.target.value }))} type="url" className="input" placeholder="https://" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2"><Github size={16} /> GitHub Repo URL</label>
                            <input value={form.github_url} onChange={e => setForm(f => ({ ...f, github_url: e.target.value }))} type="url" className="input" placeholder="https://github.com/..." />
                        </div>
                    </div>
                </div>

                {/* Tech stack */}
                <div className="glass p-6 space-y-4">
                    <h2 className="font-semibold text-white">Tech Stack *</h2>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={techInput}
                            onChange={e => setTechInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTech(); } }}
                            className="input flex-1"
                            placeholder="e.g. React, FastAPI, MongoDB…"
                        />
                        <button type="button" onClick={addTech} className="btn-secondary shrink-0"><Plus size={16} /></button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {techStack.map(t => (
                            <span key={t} className="badge flex items-center gap-1">
                                {t}
                                <button type="button" onClick={() => setTechStack(ts => ts.filter(x => x !== t))} className="hover:text-red-400 transition-colors"><X size={10} /></button>
                            </span>
                        ))}
                    </div>
                </div>

                {/* Pricing */}
                <div className="glass p-6 space-y-4">
                    <h2 className="font-semibold text-white">Pricing</h2>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Price (₹) — Leave blank or 0 for free</label>
                        <input
                            id="upload-price"
                            type="number" min="0" step="1"
                            value={form.price}
                            onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                            className="input"
                            placeholder="0 = Free"
                        />
                    </div>
                    {form.price && parseFloat(form.price) > 0 && (
                        <div className="glass p-3 text-xs text-gray-400 space-y-1">
                            <p>Buyer pays: <span className="text-white">₹{parseFloat(form.price).toFixed(2)}</span></p>
                            <p>Razorpay fee (~2%): <span className="text-red-400">-₹{(parseFloat(form.price) * 0.02).toFixed(2)}</span></p>
                            <p>Platform fee (10%): <span className="text-red-400">-₹{(parseFloat(form.price) * 0.98 * 0.10).toFixed(2)}</span></p>
                            <p className="font-semibold">You receive: <span className="text-emerald-400">₹{(parseFloat(form.price) * 0.98 * 0.90).toFixed(2)}</span></p>
                        </div>
                    )}
                </div>

                {/* Screenshots */}
                <div className="glass p-6 space-y-4">
                    <h2 className="font-semibold text-white">Project Screenshots</h2>

                    <div className="flex flex-wrap gap-4">
                        {imageUrls.map((url, i) => (
                            <div key={i} className="relative group w-32 h-24 rounded-lg overflow-hidden border border-white/10">
                                <img src={url} alt="screenshot" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => setImageUrls(prev => prev.filter((_, idx) => idx !== i))}
                                    className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        ))}

                        <div
                            onClick={() => !imageUploading && imageInputRef.current?.click()}
                            className={`w-32 h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${imageUploading ? 'border-brand-500/30 bg-brand-500/5 cursor-wait' : 'border-white/10 hover:border-brand-500 hover:bg-brand-500/10'
                                }`}
                        >
                            <input
                                ref={imageInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageSelect}
                                className="hidden"
                            />
                            {imageUploading ? (
                                <Loader2 size={20} className="text-brand-400 animate-spin" />
                            ) : (
                                <>
                                    <ImageIcon size={20} className="text-gray-400 mb-1" />
                                    <span className="text-xs text-gray-500">Add Image</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* File Upload — Drag & Drop */}
                <div className="glass p-6 space-y-4">
                    <h2 className="font-semibold text-white">Project File *</h2>

                    {!uploadedFile ? (
                        <div
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => !fileUploading && fileInputRef.current?.click()}
                            className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${dragActive
                                ? 'border-brand-500 bg-brand-500/10'
                                : fileUploading
                                    ? 'border-brand-500/30 bg-brand-500/5'
                                    : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                                }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".zip,.rar,.tar.gz,.7z,.gz"
                                onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                                className="hidden"
                            />

                            {fileUploading ? (
                                <div className="flex flex-col items-center gap-3">
                                    <Loader2 size={40} className="text-brand-400 animate-spin" />
                                    <p className="text-gray-300 font-medium">Uploading {file?.name}…</p>
                                    <p className="text-gray-500 text-sm">{file && formatSize(file.size)}</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-16 h-16 rounded-2xl bg-brand-500/15 flex items-center justify-center">
                                        <CloudUpload size={32} className="text-brand-400" />
                                    </div>
                                    <div>
                                        <p className="text-gray-300 font-medium">
                                            {dragActive ? 'Drop your file here' : 'Drag & drop your project ZIP here'}
                                        </p>
                                        <p className="text-gray-500 text-sm mt-1">or click to browse • Max 10MB • ZIP, RAR, 7z, TAR.GZ</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                                <FileArchive size={24} className="text-emerald-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-medium truncate">{uploadedFile.file_name}</p>
                                <p className="text-emerald-400 text-sm flex items-center gap-1">
                                    <CheckCircle2 size={14} /> Uploaded • {formatSize(uploadedFile.file_size)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={removeFile}
                                className="btn-ghost text-red-400 hover:text-red-300 p-2"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    )}
                </div>

                <button id="upload-submit" type="submit" disabled={loading || !uploadedFile} className="btn-primary w-full justify-center py-4 text-base disabled:opacity-50">
                    {loading ? <Loader2 size={20} className="animate-spin" /> : <><Upload size={20} /> Publish Project</>}
                </button>
            </form >
        </div >
    );
}
