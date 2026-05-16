namespace FinancialSystem.Models;

public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    
    // Навигационное свойство
    public ICollection<Expense> Expenses { get; set; } = new List<Expense>();
}