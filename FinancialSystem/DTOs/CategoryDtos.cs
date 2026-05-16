using System.ComponentModel.DataAnnotations;

namespace FinancialSystem.DTOs;

public class CategoryResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal? BudgetLimit { get; set; } // Лимит, если установлен
}

public class UpdateBudgetRequest
{
    [Range(1, 10_000_000, ErrorMessage = "Лимит должен быть от 1 до 10 000 000")]
    public decimal? LimitAmount { get; set; }
}