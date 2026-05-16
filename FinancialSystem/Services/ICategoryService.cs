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
        
        // Фильтруем бюджеты, где CategoryId не null, и преобразуем ключ к int
        var budgets = await _context.Budgets
            .Where(b => b.UserId == userId && b.CategoryId.HasValue)
            .ToDictionaryAsync(
                b => b.CategoryId!.Value, // Берем значение int из nullable
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
        // Ищем существующий бюджет для этой категории у этого пользователя
        var budget = await _context.Budgets
            .FirstOrDefaultAsync(b => b.UserId == userId && b.CategoryId == categoryId);

        if (limitAmount == null)
        {
            // Если лимит null -> удаляем запись о бюджете (снимаем ограничение)
            if (budget != null)
            {
                _context.Budgets.Remove(budget);
            }
        }
        else
        {
            // Валидация значения (на всякий случай, хотя есть атрибуты в DTO)
            if (limitAmount < 1 || limitAmount > 10_000_000)
            {
                throw new ArgumentException("Лимит должен быть от 1 до 10 000 000");
            }

            if (budget == null)
            {
                // Создаем новый бюджет
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
                // Обновляем существующий
                budget.LimitAmount = limitAmount.Value;
            }
        }

        await _context.SaveChangesAsync();
    }
}