namespace FinancialSystem.DTOs;

public class StatisticsResponse
{
    public string Period { get; set; } = string.Empty;
    public List<CategoryStatItem> Categories { get; set; } = new();
}

public class CategoryStatItem
{
    public string CategoryName { get; set; } = string.Empty;
    public decimal TotalSpent { get; set; }
}