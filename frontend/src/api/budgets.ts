import api from './axios';

export interface CategoryBudget {
    id: number;
    name: string;
    budgetLimit: number | null;
}

export interface UpdateBudgetRequest {
    limitAmount: number | null;
}

export const budgetsApi = {
    // Получить все категории с их текущими лимитами
    getAll: () => api.get<CategoryBudget[]>('/categories'),

    // Обновить или создать лимит для категории
    updateLimit: (categoryId: number, limit: number | null) =>
        api.patch(`/categories/${categoryId}/limit`, { limitAmount: limit }),
};