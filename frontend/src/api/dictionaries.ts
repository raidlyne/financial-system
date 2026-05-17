import api from "./axios";

export interface Category {
  id: number;
  name: string;
}

export interface ITag {
  id: number;
  name: string;
}

export const dictionariesApi = {
  getCategories: () => api.get<Category[]>("/categories"),
  getTags: () => api.get<ITag[]>("/tags"),
};
