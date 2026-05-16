using FinancialSystem.Data;
using FinancialSystem.DTOs;
using Microsoft.EntityFrameworkCore;

namespace FinancialSystem.Services;

public interface IStatisticsService
{
    Task<StatisticsResponse> GetStatisticsAsync(string userId, string period);
}

public class StatisticsService : IStatisticsService
{
    private readonly AppDbContext _context;

    public StatisticsService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<StatisticsResponse> GetStatisticsAsync(string userId, string period)
    {
        DateOnly startDate;
        var now = DateOnly.FromDateTime(DateTime.UtcNow);

        switch (period.ToLower())
        {
            case "week": startDate = now.AddDays(-7); break;
            case "month": startDate = now.AddMonths(-1); break;
            case "halfyear": startDate = now.AddMonths(-6); break;
            case "year": startDate = now.AddYears(-1); break;
            default: startDate = new DateOnly(1900, 1, 1); break;
        }

        // Сначала получаем сырые данные с категорией
        var expenses = await _context.Expenses
            .Include(e => e.Category)
            .Where(e => e.UserId == userId && e.Date >= startDate)
            .ToListAsync();

        // Группируем в памяти (C#), это безопасно и просто
        var stats = expenses
            .GroupBy(e => e.Category?.Name ?? "Без категории")
            .Select(g => new CategoryStatItem
            {
                CategoryName = g.Key,
                TotalSpent = g.Sum(e => e.Amount)
            })
            .ToList();

        return new StatisticsResponse
        {
            Period = period,
            Categories = stats
        };
    }
}