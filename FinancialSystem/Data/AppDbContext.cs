using FinancialSystem.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace FinancialSystem.Data;

public class AppDbContext : IdentityDbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<Budget> Budgets => Set<Budget>();
    public DbSet<ExpenseTag> ExpenseTags => Set<ExpenseTag>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Настройка связи N:N между Expense и Tag
        builder.Entity<ExpenseTag>()
            .HasKey(et => new { et.ExpenseId, et.TagId });

        builder.Entity<ExpenseTag>()
            .HasOne(et => et.Expense)
            .WithMany(e => e.ExpenseTags)
            .HasForeignKey(et => et.ExpenseId);

        builder.Entity<ExpenseTag>()
            .HasOne(et => et.Tag)
            .WithMany(t => t.ExpenseTags)
            .HasForeignKey(et => et.TagId);
            
        // Можно добавить начальные данные для категорий (Seed)
        builder.Entity<Category>().HasData(
            new Category { Id = 1, Name = "Еда" },
            new Category { Id = 2, Name = "Транспорт" },
            new Category { Id = 3, Name = "Развлечения" }
        );
    }
}