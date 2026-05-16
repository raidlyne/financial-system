namespace FinancialSystem.Models;

public class Budget
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    
    public int? CategoryId { get; set; }
    public Category? Category { get; set; }
    
    public decimal LimitAmount { get; set; }
}