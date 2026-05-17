using System.ComponentModel.DataAnnotations;
namespace FinancialSystem.Models;


public class Category
{
    public int Id { get; set; }
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    public ICollection<Expense> Expenses { get; set; } = new List<Expense>();
}