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
        var expenseDate = request.Date ?? DateOnly.FromDateTime(DateTime.UtcNow);

        if (expenseDate > DateOnly.FromDateTime(DateTime.UtcNow))
            throw new ArgumentException("Дата не может быть в будущем");

        // === ПРОВЕРКА СУЩЕСТВОВАНИЯ КАТЕГОРИИ ===
        var categoryExists = await _context.Categories.AnyAsync(c => c.Id == request.CategoryId);
        if (!categoryExists)
        {
            throw new ArgumentException($"Категория с ID {request.CategoryId} не найдена");
        }
        // ========================================

        // Проверка тегов (если она у тебя уже есть)
        if (request.TagIds != null && request.TagIds.Any())
        {
            var existingTagCount = await _context.Tags.CountAsync(t => request.TagIds.Contains(t.Id));
            if (existingTagCount != request.TagIds.Count)
            {
                throw new ArgumentException("Один или несколько указанных тегов не существуют");
            }
        }

        await CheckBudgetLimitAsync(userId, request.CategoryId, request.Amount, expenseDate);

        var expense = new Expense
        {
            UserId = userId,
            CategoryId = request.CategoryId,
            Amount = request.Amount,
            Date = expenseDate,
            Description = request.Description,
            ExpenseTags = request.TagIds?.Select(tagId => new ExpenseTag { TagId = tagId }).ToList() ?? new List<ExpenseTag>()
        };

        _context.Expenses.Add(expense);
        await _context.SaveChangesAsync();

        return await GetExpenseByIdAsync(userId, expense.Id) 
               ?? throw new InvalidOperationException("Ошибка при получении созданной траты");
    }

    public async Task<List<ExpenseResponse>> GetExpensesAsync(string userId, DateOnly? dateFilter)
    {
        IQueryable<Expense> query = _context.Expenses
            .AsNoTracking() // Важно для производительности чтения
            .Include(e => e.Category)
            .Include(e => e.ExpenseTags).ThenInclude(et => et.Tag)
            .Where(e => e.UserId == userId);

        if (dateFilter.HasValue)
        {
            query = query.Where(e => e.Date == dateFilter.Value);
        }

        var expenses = await query.OrderByDescending(e => e.Date).ToListAsync();

        return expenses.Select(e => new ExpenseResponse
        {
            Id = e.Id,
            CategoryId = e.CategoryId,
            CategoryName = e.Category?.Name ?? "Unknown",
            Amount = e.Amount,
            Date = e.Date,
            Description = e.Description,
            Tags = e.ExpenseTags.Select(et => et.Tag?.Name ?? "").ToList(),
            TagIds = e.ExpenseTags.Select(et => et.TagId).ToList()
        }).ToList();
    }

    public async Task<ExpenseResponse?> UpdateExpenseAsync(string userId, int id, UpdateExpenseRequest request)
    {
        var expense = await _context.Expenses
            .Include(e => e.ExpenseTags)
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);

        if (expense == null) return null;

        bool isBudgetCheckNeeded = false;

        if (request.Amount.HasValue)
        {
            expense.Amount = request.Amount.Value;
            isBudgetCheckNeeded = true;
        }

        if (request.Description != null)
            expense.Description = request.Description;

        if (request.CategoryId.HasValue)
        {
            var categoryExists = await _context.Categories.AnyAsync(c => c.Id == request.CategoryId.Value);
            if (!categoryExists)
            {
                throw new ArgumentException($"Категория с ID {request.CategoryId.Value} не найдена");
            }

            expense.CategoryId = request.CategoryId.Value;
            isBudgetCheckNeeded = true;
        }

        if (request.TagIds != null)
        {
            // Проверка тегов
            if (request.TagIds.Any())
            {
                 var existingTagCount = await _context.Tags.CountAsync(t => request.TagIds.Contains(t.Id));
                 if (existingTagCount != request.TagIds.Count)
                 {
                     throw new ArgumentException("Один или несколько указанных тегов не существуют");
                 }
            }
           
            expense.ExpenseTags.Clear();
            foreach (var tagId in request.TagIds)
            {
                expense.ExpenseTags.Add(new ExpenseTag { TagId = tagId });
            }
        }

        if (isBudgetCheckNeeded)
        {
            await CheckBudgetLimitAsync(userId, expense.CategoryId, expense.Amount, expense.Date);
        }

        await _context.SaveChangesAsync();
        return await GetExpenseByIdAsync(userId, id);
    }

    // Вспомогательный метод для получения одной траты с полными данными
    private async Task<ExpenseResponse?> GetExpenseByIdAsync(string userId, int id)
    {
        var expense = await _context.Expenses
            .Include(e => e.Category)
            .Include(e => e.ExpenseTags).ThenInclude(et => et.Tag)
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);

        if (expense == null) return null;

        return new ExpenseResponse
        {
            Id = expense.Id,
            CategoryId = expense.CategoryId,
            CategoryName = expense.Category?.Name ?? "Unknown",
            Amount = expense.Amount,
            Date = expense.Date,
            Description = expense.Description,
            Tags = expense.ExpenseTags.Select(et => et.Tag?.Name ?? "").ToList()
        };
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
    public async Task<List<DateOnly>> GetExpenseDatesAsync(string userId)
    {
        var dates = await _context.Expenses
            .AsNoTracking()
            .Where(e => e.UserId == userId)
            .Select(e => e.Date)
            .Distinct()
            .OrderBy(d => d)
            .ToListAsync();

        return dates;
    }
}