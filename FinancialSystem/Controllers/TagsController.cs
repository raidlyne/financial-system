using FinancialSystem.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FinancialSystem.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class TagsController : ControllerBase
{
    private readonly AppDbContext _context;

    public TagsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetTags()
    {
        var tags = await _context.Tags.ToListAsync();
        return Ok(tags);
    }
    
}