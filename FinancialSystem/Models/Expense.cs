using System.ComponentModel.DataAnnotations;
namespace FinancialSystem.Models;

public class Expense
{
    public int Id { get; set; }
    
    public string UserId { get; set; } = string.Empty;
    
    public int CategoryId { get; set; }
    public Category? Category { get; set; }
    
    public decimal Amount { get; set; }
    
    public DateOnly Date { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    [MaxLength(1000,  ErrorMessage = "Слишком длинное описание")]
    public string? Description { get; set; }
    
    public ICollection<ExpenseTag> ExpenseTags { get; set; } = new List<ExpenseTag>();
}