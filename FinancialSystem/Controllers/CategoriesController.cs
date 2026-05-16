using FinancialSystem.DTOs;
using FinancialSystem.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FinancialSystem.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class CategoriesController : ControllerBase
{
    private readonly ICategoryService _categoryService;

    public CategoriesController(ICategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    private string GetUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new UnauthorizedAccessException();
    }

    [HttpGet]
    public async Task<IActionResult> GetCategories()
    {
        var userId = GetUserId();
        var categories = await _categoryService.GetCategoriesWithBudgetsAsync(userId);
        return Ok(categories);
    }

    [HttpPatch("{id}/limit")]
    public async Task<IActionResult> UpdateBudget(int id, [FromBody] UpdateBudgetRequest request)
    {
        try 
        {
            var userId = GetUserId();
            await _categoryService.UpdateBudgetAsync(userId, id, request.LimitAmount);
            return NoContent();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}