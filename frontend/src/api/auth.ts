import api from './axios';

export interface LoginRequest {
    username: string;
    password: string;
}

export interface RegisterRequest {
    username: string;
    password: string;
}

export const authApi = {
    login: (data: LoginRequest) => api.post('/auth/login', data),
    register: (data: RegisterRequest) => api.post('/auth/register', data),
    getMe: () => api.get<{ username: string }>('/auth'),
    logout: () => api.post('/auth/logout'),
    deleteAccount: () => api.delete('/auth'),
};