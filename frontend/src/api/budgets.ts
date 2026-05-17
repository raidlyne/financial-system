import api from "./axios";

export interface CategoryBudget {
  key: string;
  id: number;
  name: string;
  budgetLimit: number | null;
}

export const budgetsApi = {
  getAll: () => api.get<CategoryBudget[]>("/categories"),

  updateLimit: (categoryId: number, limit: number | null) =>
    api.patch(`/categories/${categoryId}/limit`, { limitAmount: limit }),
};
