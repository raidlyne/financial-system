namespace FinancialSystem.Models;

public class Expense
{
    public int Id { get; set; }
    
    // Внешний ключ на пользователя (Identity)
    public string UserId { get; set; } = string.Empty;
    
    // Внешний ключ на категорию
    public int CategoryId { get; set; }
    public Category? Category { get; set; }
    
    public decimal Amount { get; set; }
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public string? Description { get; set; }
    
    // Связь N:N с тегами через промежуточную таблицу
    public ICollection<ExpenseTag> ExpenseTags { get; set; } = new List<ExpenseTag>();
}