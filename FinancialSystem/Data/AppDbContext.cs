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

        // 1. Настройка связи N:N между Expense и Tag
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

        // Индекс уникальности для пары (ExpenseId, TagId), чтобы нельзя было добавить один тег дважды к одной трате
        builder.Entity<ExpenseTag>()
            .HasIndex(et => new { et.ExpenseId, et.TagId })
            .IsUnique();

        // 2. Уникальность имени Категории
        builder.Entity<Category>()
            .HasIndex(c => c.Name)
            .IsUnique();

        // 3. Уникальность имени Тега
        builder.Entity<Tag>()
            .HasIndex(t => t.Name)
            .IsUnique();

        // 4. Уникальность бюджета для пары (UserId, CategoryId)
        // Один пользователь может иметь только один лимит на одну категорию
        builder.Entity<Budget>()
            .HasIndex(b => new { b.UserId, b.CategoryId })
            .IsUnique();
            
        // Начальные данные для категорий (Seed)
        builder.Entity<Category>().HasData(
            new Category { Id = 1, Name = "Еда" },
            new Category { Id = 2, Name = "Транспорт" },
            new Category { Id = 3, Name = "Развлечения" }
        );
    }
}