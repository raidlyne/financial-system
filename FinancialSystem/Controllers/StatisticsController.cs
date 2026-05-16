using FinancialSystem.DTOs;
using FinancialSystem.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FinancialSystem.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class StatisticsController : ControllerBase
{
    private readonly IStatisticsService _statisticsService;

    public StatisticsController(IStatisticsService statisticsService)
    {
        _statisticsService = statisticsService;
    }

    private string GetUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier) ?? throw new UnauthorizedAccessException();
    }

    [HttpGet]
    public async Task<IActionResult> GetStatistics([FromQuery] string period = "all")
    {
        var userId = GetUserId();
        var stats = await _statisticsService.GetStatisticsAsync(userId, period);
        return Ok(stats);
    }
}