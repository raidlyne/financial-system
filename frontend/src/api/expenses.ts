import api from './axios';

export interface Expense {
    id: number;
    categoryId: number;
    categoryName: string;
    amount: number;
    date: string;
    description?: string;
    tags: string[];
}

export interface UpdateExpenseDto {
    amount?: number;
    description?: string;
    categoryId?: number;
    tagIds?: number[];
    date?: string;
}

export const expensesApi = {
    getByDate: (date: string) => api.get<Expense[]>(`/expenses?date=${date}`),

    create: (data: any) => api.post('/expenses', data),

    update: (id: number, data: UpdateExpenseDto) => api.patch(`/expenses/${id}`, data),

    delete: (id: number) => api.delete(`/expenses/${id}`),
};