using FinancialSystem.Data;
using FinancialSystem.DTOs;
using FinancialSystem.Models;
using Microsoft.EntityFrameworkCore;

namespace FinancialSystem.Services;

public interface ICategoryService
{
    Task<List<CategoryResponse>> GetCategoriesWithBudgetsAsync(string userId);
    Task UpdateBudgetAsync(string userId, int categoryId, decimal? limitAmount);
}

public class CategoryService : ICategoryService
{

    private readonly AppDbContext _context;

    public CategoryService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<CategoryResponse>> GetCategoriesWithBudgetsAsync(string userId)
    {
        var categories = await _context.Categories.ToListAsync();
        
        var budgets = await _context.Budgets
            .Where(b => b.UserId == userId && b.CategoryId.HasValue)
            .ToDictionaryAsync(
                b => b.CategoryId!.Value, 
                b => b.LimitAmount
            );

        return categories.Select(c => new CategoryResponse
        {
            Id = c.Id,
            Name = c.Name,
            BudgetLimit = budgets.ContainsKey(c.Id) ? budgets[c.Id] : null
        }).ToList();
    }

    public async Task UpdateBudgetAsync(string userId, int categoryId, decimal? limitAmount)
    {
        var categoryExists = await _context.Categories.AnyAsync(c => c.Id == categoryId);
        if (!categoryExists)
        {
            throw new ArgumentException($"Категория с ID {categoryId} не найдена");
        }

        var budget = await _context.Budgets
            .FirstOrDefaultAsync(b => b.UserId == userId && b.CategoryId == categoryId);

        if (limitAmount == null)
        {
            if (budget != null)
            {
                _context.Budgets.Remove(budget);
            }
        }
        else
        {
            if (limitAmount < 1 || limitAmount > 10_000_000)
            {
                throw new ArgumentException("Лимит должен быть от 1 до 10 000 000");
            }

            if (budget == null)
            {
                budget = new Budget
                {
                    UserId = userId,
                    CategoryId = categoryId,
                    LimitAmount = limitAmount.Value
                };
                _context.Budgets.Add(budget);
            }
            else
            {
                budget.LimitAmount = limitAmount.Value;
            }
        }

        await _context.SaveChangesAsync();
    }
}