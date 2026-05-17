import api from "./axios";

export interface CategoryStat {
  categoryName: string;
  categoryId: number;
  totalSpent: number;
}

export interface StatisticsResponse {
  period: string;
  categories: CategoryStat[];
}

export const statisticsApi = {
  getStatistics: (period: string = "all") =>
    api.get<StatisticsResponse>(`/statistics?period=${period}`),
};
