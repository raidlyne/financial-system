using FinancialSystem.DTOs;
using FinancialSystem.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FinancialSystem.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class ExpensesController : ControllerBase
{
    private readonly IExpenseService _expenseService;

    public ExpensesController(IExpenseService expenseService)
    {
        _expenseService = expenseService;
    }

    private string GetUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new UnauthorizedAccessException();
    }

    [HttpPost]
    public async Task<IActionResult> CreateExpense([FromBody] CreateExpenseRequest request)
    {
        try
        {
            var userId = GetUserId();
            var result = await _expenseService.CreateExpenseAsync(userId, request);
            return CreatedAtAction(nameof(GetExpenses), new { id = result.Id }, result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetExpenses([FromQuery] DateOnly? date)
    {
        var userId = GetUserId();
        var expenses = await _expenseService.GetExpensesAsync(userId, date);
        return Ok(expenses);
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> UpdateExpense(int id, [FromBody] UpdateExpenseRequest request)
    {
        try
        {
            var userId = GetUserId();
            var result = await _expenseService.UpdateExpenseAsync(userId, id, request);
            if (result == null) return NotFound();
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteExpense(int id)
    {
        var userId = GetUserId();
        var success = await _expenseService.DeleteExpenseAsync(userId, id);
        if (!success) return NotFound();
        return NoContent();
    }
    [HttpGet("dates")]
    public async Task<IActionResult> GetExpenseDates()
    {
        var userId = GetUserId();
        var dates = await _expenseService.GetExpenseDatesAsync(userId);
        var dateStrings = dates.Select(d => d.ToString("yyyy-MM-dd")).ToList();
        return Ok(dateStrings);
    }
}