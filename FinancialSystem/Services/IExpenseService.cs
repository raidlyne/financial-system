using FinancialSystem.DTOs;
using FinancialSystem.Models;

namespace FinancialSystem.Services;

public interface IExpenseService
{
    Task<ExpenseResponse> CreateExpenseAsync(string userId, CreateExpenseRequest request);
    Task<List<ExpenseResponse>> GetExpensesAsync(string userId, DateOnly? dateFilter);
    Task<ExpenseResponse?> UpdateExpenseAsync(string userId, int id, UpdateExpenseRequest request);
    Task<bool> DeleteExpenseAsync(string userId, int id);
    Task CheckBudgetLimitAsync(string userId, int categoryId, decimal newAmount, DateOnly date);
}