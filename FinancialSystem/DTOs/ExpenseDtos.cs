using System.ComponentModel.DataAnnotations;

namespace FinancialSystem.DTOs;

public class CreateExpenseRequest
{
    [Required]
    public int CategoryId { get; set; }

    [Required]
    [Range(1, 10_000_000, ErrorMessage = "Сумма должна быть от 1 до 10 000 000")]
    public decimal Amount { get; set; }

    public DateOnly? Date { get; set; } 

    [StringLength(200, ErrorMessage = "Описание не должно превышать 200 символов")]
    public string? Description { get; set; }

    public List<int> TagIds { get; set; } = new();
}

public class UpdateExpenseRequest
{
    [Range(1, 10_000_000, ErrorMessage = "Сумма должна быть от 1 до 10 000 000")]
    public decimal? Amount { get; set; }

    [StringLength(200, ErrorMessage = "Описание не должно превышать 200 символов")]
    public string? Description { get; set; }

    public int? CategoryId { get; set; }
    
    public List<int>? TagIds { get; set; }
}

public class ExpenseResponse
{
    public int Id { get; set; }
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateOnly Date { get; set; }
    public string? Description { get; set; }
    public List<string> Tags { get; set; } = new();
}