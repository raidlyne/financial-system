namespace FinancialSystem.Models;

public class Expense
{
    public int Id { get; set; }
    
    public string UserId { get; set; } = string.Empty;
    
    public int CategoryId { get; set; }
    public Category? Category { get; set; }
    
    public decimal Amount { get; set; }
    
    public DateOnly Date { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    
    public string? Description { get; set; }
    
    public ICollection<ExpenseTag> ExpenseTags { get; set; } = new List<ExpenseTag>();
}