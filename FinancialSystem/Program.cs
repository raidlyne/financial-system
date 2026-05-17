using FinancialSystem.Data;
using FinancialSystem.Services;
using FinancialSystem.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddIdentity<IdentityUser, IdentityRole>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:3000",
            "http://localhost:5173",
            "http://frontend:5173",  
            "http://backend:5192")     
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});
builder.Services.AddScoped<IExpenseService, ExpenseService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IStatisticsService, StatisticsService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowReactApp"); 
app.UseAuthentication(); 
app.UseAuthorization();
app.MapControllers();



using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        var userManager = services.GetRequiredService<UserManager<IdentityUser>>();
        
        await context.Database.MigrateAsync();
        
        if (!await context.Categories.AnyAsync())
        {
            var categories = new[]
            {
                new Category { Id = 1, Name = "Еда" },
                new Category { Id = 2, Name = "Транспорт" },
                new Category { Id = 3, Name = "Развлечения" },
                new Category { Id = 4, Name = "Супермаркет" },
                new Category { Id = 5, Name = "Кафе и рестораны" },
                new Category { Id = 6, Name = "Здоровье" },
                new Category { Id = 7, Name = "Одежда" },
                new Category { Id = 8, Name = "Дом и ремонт" },
                new Category { Id = 9, Name = "Связь и интернет" },
                new Category { Id = 10, Name = "Прочее" }
            };
            
            await context.Categories.AddRangeAsync(categories);
            await context.SaveChangesAsync();
        }
        
        if (!await context.Tags.AnyAsync())
        {
            var tags = new[]
            {
                new Tag { Id = 1, Name = "Срочное" },
                new Tag { Id = 2, Name = "Плановое" },
                new Tag { Id = 3, Name = "Необходимое" },
                new Tag { Id = 4, Name = "Разовое" },
                new Tag { Id = 5, Name = "Повторяющееся" },
                new Tag { Id = 6, Name = "Семья" },
                new Tag { Id = 7, Name = "Работа" },
                new Tag { Id = 8, Name = "Хобби" }
            };
            
            await context.Tags.AddRangeAsync(tags);
            await context.SaveChangesAsync();
        }
        
        var user = await userManager.FindByNameAsync("qwerty");
        if (user == null)
        {
            user = new IdentityUser 
            { 
                UserName = "qwerty", 
            };
            await userManager.CreateAsync(user, "Qwerty1!");
        }
        
        var userId = user.Id;
        
        if (!await context.Budgets.AnyAsync())
        {
            context.Budgets.Add(new Budget
            {
                UserId = userId,
                CategoryId = 4,
                LimitAmount = 50000m
            });
            await context.SaveChangesAsync();
        }
        
        if (!await context.Expenses.AnyAsync())
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var yesterday = today.AddDays(-1);
            var twoDaysAgo = today.AddDays(-2);
            var threeDaysAgo = today.AddDays(-3);
            var weekAgo = today.AddDays(-7);
            var halfYearAgo = today.AddMonths(-6);
            var yearAgo = today.AddYears(-1);
            
            var expenses = new[]
            {
                new Expense { UserId = userId, CategoryId = 4, Amount = 1250.50m, Date = today, Description = "Продукты" },
                new Expense { UserId = userId, CategoryId = 5, Amount = 850.00m, Date = today, Description = "Обед в кафе" },
                new Expense { UserId = userId, CategoryId = 6, Amount = 350.00m, Date = today, Description = "Аптека" },
                new Expense { UserId = userId, CategoryId = 7, Amount = 4500.00m, Date = today, Description = "Куртка" },
                new Expense { UserId = userId, CategoryId = 8, Amount = 1200.00m, Date = today, Description = "Лампочки и инструменты" },
                new Expense { UserId = userId, CategoryId = 9, Amount = 650.00m, Date = today, Description = "Оплата интернета" },
                
                // Вчера
                new Expense { UserId = userId, CategoryId = 4, Amount = 890.00m, Date = yesterday, Description = "Супермаркет" },
                // Позавчера
                new Expense { UserId = userId, CategoryId = 5, Amount = 2100.00m, Date = twoDaysAgo, Description = "Ужин в ресторане" },
                // 3 дня назад
                new Expense { UserId = userId, CategoryId = 10, Amount = 500.00m, Date = threeDaysAgo, Description = "Такси" },
                // Неделю назад
                new Expense { UserId = userId, CategoryId = 6, Amount = 2500.00m, Date = weekAgo, Description = "Стоматолог" },
                // Полгода назад
                new Expense { UserId = userId, CategoryId = 7, Amount = 15000.00m, Date = halfYearAgo, Description = "Зимняя обувь" },
                // Год назад
                new Expense { UserId = userId, CategoryId = 2, Amount = 8000.00m, Date = yearAgo, Description = "Бензин на месяц" }
            };
            
            await context.Expenses.AddRangeAsync(expenses);
            await context.SaveChangesAsync();
            
            var tags = await context.Tags.ToListAsync();
            var allExpenses = await context.Expenses.ToListAsync();
            var tagDict = tags.ToDictionary(t => t.Name);
            var expenseTags = new List<ExpenseTag>();
            
            void AddTag(int expenseId, string tagName)
            {
                if (tagDict.TryGetValue(tagName, out var tag))
                {
                    expenseTags.Add(new ExpenseTag { ExpenseId = expenseId, TagId = tag.Id });
                }
            }
            
            var expense1 = allExpenses.First(e => e.Description == "Продукты" && e.Date == today);
            AddTag(expense1.Id, "Необходимое");
            AddTag(expense1.Id, "Плановое");
            
            var expense2 = allExpenses.First(e => e.Description == "Обед в кафе" && e.Date == today);
            AddTag(expense2.Id, "Разовое");
            AddTag(expense2.Id, "Работа");
            
            var expense3 = allExpenses.First(e => e.Description == "Аптека" && e.Date == today);
            AddTag(expense3.Id, "Срочное");
            AddTag(expense3.Id, "Необходимое");
            
            var expense4 = allExpenses.First(e => e.Description == "Куртка" && e.Date == today);
            AddTag(expense4.Id, "Необходимое");
            AddTag(expense4.Id, "Семья");
            
            var expense5 = allExpenses.First(e => e.Description == "Лампочки и инструменты" && e.Date == today);
            AddTag(expense5.Id, "Необходимое");
            AddTag(expense5.Id, "Плановое");
            
            var expense6 = allExpenses.First(e => e.Description == "Оплата интернета" && e.Date == today);
            AddTag(expense6.Id, "Плановое");
            AddTag(expense6.Id, "Работа");
            
            var expense7 = allExpenses.First(e => e.Description == "Супермаркет" && e.Date == yesterday);
            AddTag(expense7.Id, "Необходимое");
            
            var expense8 = allExpenses.First(e => e.Description == "Ужин в ресторане" && e.Date == twoDaysAgo);
            AddTag(expense8.Id, "Разовое");
            AddTag(expense8.Id, "Хобби");
            
            var expense9 = allExpenses.First(e => e.Description == "Такси" && e.Date == threeDaysAgo);
            AddTag(expense9.Id, "Срочное");
            AddTag(expense9.Id, "Работа");
            
            var expense10 = allExpenses.First(e => e.Description == "Стоматолог" && e.Date == weekAgo);
            AddTag(expense10.Id, "Необходимое");
            AddTag(expense10.Id, "Срочное");
            
            var expense11 = allExpenses.First(e => e.Description == "Зимняя обувь" && e.Date == halfYearAgo);
            AddTag(expense11.Id, "Необходимое");
            AddTag(expense11.Id, "Семья");
            
            var expense12 = allExpenses.First(e => e.Description == "Бензин на месяц" && e.Date == yearAgo);
            AddTag(expense12.Id, "Плановое");
            AddTag(expense12.Id, "Работа");
            
            if (expenseTags.Any())
            {
                await context.ExpenseTags.AddRangeAsync(expenseTags);
                await context.SaveChangesAsync();
            }
        }
        
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "❌ Ошибка при инициализации базы данных: {Message}", ex.Message);
    }
}

app.Run();