using FinancialSystem.Data;
using FinancialSystem.DTOs;
using FinancialSystem.Models;
using Microsoft.EntityFrameworkCore;

namespace FinancialSystem.Services;

public class ExpenseService : IExpenseService
{
    private readonly AppDbContext _context;

    public ExpenseService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ExpenseResponse> CreateExpenseAsync(string userId, CreateExpenseRequest request)
    {
        // 1. Нормализация даты (DateOnly)
        var expenseDate = request.Date ?? DateOnly.FromDateTime(DateTime.UtcNow);

        // 2. Валидация (не будущая дата)
        if (expenseDate > DateOnly.FromDateTime(DateTime.UtcNow))
            throw new ArgumentException("Дата не может быть в будущем");

        // 3. Проверка лимита бюджета
        await CheckBudgetLimitAsync(userId, request.CategoryId, request.Amount, expenseDate);

        // 4. Создание сущности
        var expense = new Expense
        {
            UserId = userId,
            CategoryId = request.CategoryId,
            Amount = request.Amount,
            Date = expenseDate,
            Description = request.Description,
            ExpenseTags = request.TagIds.Select(tagId => new ExpenseTag { TagId = tagId }).ToList()
        };

        _context.Expenses.Add(expense);
        await _context.SaveChangesAsync();

        return await MapToResponse(expense);
    }

    public async Task<List<ExpenseResponse>> GetExpensesAsync(string userId, DateOnly? dateFilter)
    {
        IQueryable<Expense> query = _context.Expenses
            .Include(e => e.Category)
            .Include(e => e.ExpenseTags).ThenInclude(et => et.Tag)
            .Where(e => e.UserId == userId);

        if (dateFilter.HasValue)
        {
            // Фильтрация по конкретному дню
            query = query.Where(e => e.Date == dateFilter.Value);
        }

        var expenses = await query.OrderByDescending(e => e.Date).ToListAsync();
    
        // Маппинг в список ответов
        var responses = new List<ExpenseResponse>();
        foreach (var exp in expenses)
        {
            responses.Add(await MapToResponse(exp));
        }
        return responses;
    }

    public async Task<ExpenseResponse?> UpdateExpenseAsync(string userId, int id, UpdateExpenseRequest request)
    {
        var expense = await _context.Expenses
            .Include(e => e.ExpenseTags)
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);

        if (expense == null) return null;

        bool isBudgetCheckNeeded = false;

        // 1. Обновление суммы
        if (request.Amount.HasValue)
        {
            expense.Amount = request.Amount.Value;
            isBudgetCheckNeeded = true;
        }

        // 2. Обновление даты (теперь DateOnly, никаких Kind)
        if (request.Date.HasValue)
        {
            if (request.Date.Value > DateOnly.FromDateTime(DateTime.UtcNow))
            {
                throw new ArgumentException("Дата не может быть в будущем");
            }
            expense.Date = request.Date.Value;
            isBudgetCheckNeeded = true;
        }

        // 3. Обновление описания
        if (request.Description != null)
        {
            expense.Description = request.Description;
        }

        // 4. Обновление категории
        if (request.CategoryId.HasValue)
        {
            expense.CategoryId = request.CategoryId.Value;
            isBudgetCheckNeeded = true;
        }

        // 5. Обновление тегов
        if (request.TagIds != null)
        {
            expense.ExpenseTags.Clear();
            foreach (var tagId in request.TagIds)
            {
                expense.ExpenseTags.Add(new ExpenseTag { TagId = tagId });
            }
        }

        // 6. Финальная проверка бюджета
        if (isBudgetCheckNeeded)
        {
            await CheckBudgetLimitAsync(userId, expense.CategoryId, expense.Amount, expense.Date);
        }

        await _context.SaveChangesAsync();
        return await MapToResponse(expense);
    }

    public async Task<bool> DeleteExpenseAsync(string userId, int id)
    {
        var expense = await _context.Expenses.FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);
        if (expense == null) return false;

        _context.Expenses.Remove(expense);
        await _context.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// Проверяет лимит по категории за месяц (использует DateOnly)
    /// </summary>
    public async Task CheckBudgetLimitAsync(string userId, int categoryId, decimal newAmount, DateOnly date)
    {
        var budget = await _context.Budgets
            .FirstOrDefaultAsync(b => b.UserId == userId && b.CategoryId == categoryId);

        if (budget == null) return;

        // Расчет границ месяца для DateOnly
        var startOfMonth = new DateOnly(date.Year, date.Month, 1);
        var endOfMonth = startOfMonth.AddMonths(1);

        var currentSpent = await _context.Expenses
            .Where(e => e.UserId == userId && 
                        e.CategoryId == categoryId && 
                        e.Date >= startOfMonth && 
                        e.Date < endOfMonth)
            .SumAsync(e => e.Amount);

        if (currentSpent + newAmount > budget.LimitAmount)
        {
            throw new InvalidOperationException($"Превышен лимит бюджета. Лимит: {budget.LimitAmount}, Потрачено: {currentSpent}, Новая трата: {newAmount}");
        }
    }

    private async Task<ExpenseResponse> MapToResponse(Expense expense)
    {
        // Если теги не загружены, догружаем их (ленивая загрузка или явная)
        if (!expense.ExpenseTags.Any()) 
        {
             var loadedExpense = await _context.Expenses
                 .Include(e => e.ExpenseTags).ThenInclude(et => et.Tag)
                 .FirstOrDefaultAsync(e => e.Id == expense.Id);
                 
             if(loadedExpense != null) expense = loadedExpense;
        }

        return new ExpenseResponse
        {
            Id = expense.Id,
            CategoryId = expense.CategoryId,
            CategoryName = expense.Category?.Name ?? "Unknown",
            Amount = expense.Amount,
            Date = expense.Date, // Теперь тут DateOnly
            Description = expense.Description,
            Tags = expense.ExpenseTags.Select(et => et.Tag?.Name ?? "").ToList()
        };
    }
}