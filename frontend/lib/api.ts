import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
    baseURL: API_URL,
});

// ── Request: attach JWT + set Content-Type ───────────────────
api.interceptors.request.use((config) => {
    const token = Cookies.get('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // Don't override Content-Type for FormData (file uploads)
    // Axios auto-sets multipart/form-data with correct boundary
    if (!(config.data instanceof FormData)) {
        config.headers['Content-Type'] = 'application/json';
    }

    return config;
});

// ── Response: auto refresh on 401 ───────────────────────────
api.interceptors.response.use(
    (res) => res,
    async (error) => {
        const original = error.config;
        if (error.response?.status === 401 && !original._retry) {
            original._retry = true;
            const refresh = Cookies.get('refresh_token');
            if (refresh) {
                try {
                    const { data } = await axios.post(`${API_URL}/api/v1/auth/refresh-token`, {
                        refresh_token: refresh,
                    });
                    Cookies.set('access_token', data.data.access_token, { expires: 1 / 96 }); // 15 min
                    original.headers.Authorization = `Bearer ${data.data.access_token}`;
                    return api(original);
                } catch {
                    Cookies.remove('access_token');
                    Cookies.remove('refresh_token');
                    window.location.href = '/auth/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

// ── Auth ─────────────────────────────────────────────────────
export const authApi = {
    register: (data: { name: string; email: string; password: string }) =>
        api.post('/api/v1/auth/register', data),
    login: (data: { email: string; password: string }) =>
        api.post('/api/v1/auth/login', data),
    requestOtp: (data: { email: string; name?: string }) =>
        api.post('/api/v1/auth/request-otp', data),
    // New Firebase login route
    firebaseLogin: (data: { token: string; name?: string }) =>
        api.post('/api/v1/auth/firebase-login', data),
    verifyOtp: (data: { email: string; otp: string; name?: string }) =>
        api.post('/api/v1/auth/verify-otp', data),
    logout: () => api.post('/api/v1/auth/logout'),
    refreshToken: (refresh_token: string) =>
        api.post('/api/v1/auth/refresh-token', { refresh_token }),
};

// ── Projects ──────────────────────────────────────────────────
export const projectsApi = {
    list: (params?: Record<string, string | number>) =>
        api.get('/api/v1/projects', { params }),
    get: (id: string) => api.get(`/api/v1/projects/${id}`),
    create: (data: unknown) => api.post('/api/v1/projects', data),
    update: (id: string, data: unknown) => api.put(`/api/v1/projects/${id}`, data),
    delete: (id: string) => api.delete(`/api/v1/projects/${id}`),
    uploadFile: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/api/v1/projects/upload-file', formData, {
            timeout: 120000, // 2 min for large files
        });
    },
    uploadImage: (projectId: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post(`/api/v1/projects/${projectId}/upload-image`, formData);
    },
    uploadStandaloneImage: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post(`/api/v1/projects/upload-image`, formData);
    },
    like: (id: string) => api.post(`/api/v1/projects/${id}/like`),
    unlike: (id: string) => api.delete(`/api/v1/projects/${id}/like`),
    rate: (id: string, data: { score: number; review?: string }) =>
        api.post(`/api/v1/projects/${id}/rate`, data),
    getComments: (id: string, page = 1) =>
        api.get(`/api/v1/projects/${id}/comments`, { params: { page } }),
    addComment: (id: string, body: string) =>
        api.post(`/api/v1/projects/${id}/comments`, { body }),
    deleteComment: (projectId: string, commentId: string) =>
        api.delete(`/api/v1/projects/${projectId}/comments/${commentId}`),
};

// ── Payments ──────────────────────────────────────────────────
export const paymentsApi = {
    createOrder: (project_id: string) =>
        api.post('/api/v1/payments/create-order', { project_id }),
    verifyPayment: (data: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
    }) => api.post('/api/v1/payments/verify', data),
    download: (purchase_id: string) =>
        api.get(`/api/v1/payments/download/${purchase_id}`),
    purchases: () => api.get('/api/v1/payments/purchases'),
};

// ── Users ─────────────────────────────────────────────────────
export const usersApi = {
    me: () => api.get('/api/v1/users/me'),
    updateMe: (data: unknown) => api.put('/api/v1/users/me', data),
    getUser: (id: string) => api.get(`/api/v1/users/${id}`),
    follow: (id: string) => api.post(`/api/v1/users/${id}/follow`),
    unfollow: (id: string) => api.delete(`/api/v1/users/${id}/follow`),
    followers: (id: string, page = 1) =>
        api.get(`/api/v1/users/${id}/followers`, { params: { page } }),
    following: (id: string, page = 1) =>
        api.get(`/api/v1/users/${id}/following`, { params: { page } }),
    earnings: () => api.get('/api/v1/users/me/earnings'),
    withdraw: (data: { amount: number; upi_id: string }) =>
        api.post('/api/v1/users/me/withdraw', data),
};

// ── Helpers ───────────────────────────────────────────────────
export const paiseTo = (paise: number) => `₹${(paise / 100).toFixed(2)}`;
