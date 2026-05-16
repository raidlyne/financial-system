using System.ComponentModel.DataAnnotations;
namespace FinancialSystem.Models;

public class Tag
{
    public int Id { get; set; }
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    // Навигационное свойство для связи N:N
    public ICollection<ExpenseTag> ExpenseTags { get; set; } = new List<ExpenseTag>();
}