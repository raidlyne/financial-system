using FinancialSystem.DTOs; 
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace FinancialSystem.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<IdentityUser> _userManager;
    private readonly SignInManager<IdentityUser> _signInManager;

    public AuthController(UserManager<IdentityUser> userManager, SignInManager<IdentityUser> signInManager)
    {
        _userManager = userManager;
        _signInManager = signInManager;
    }

    /// <summary>
    /// Регистрация нового пользователя
    /// </summary>
    [HttpPost("register")]
    [AllowAnonymous] // Доступно всем
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var user = new IdentityUser { UserName = request.Username };
        var result = await _userManager.CreateAsync(user, request.Password);

        if (!result.Succeeded)
            return BadRequest(result.Errors);

        return Ok(new { message = "User registered successfully" });
    }

    /// <summary>
    /// Вход в систему (устанавливает куки)
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _userManager.FindByNameAsync(request.Username);
        if (user == null) return Unauthorized("Invalid credentials");

        var result = await _signInManager.PasswordSignInAsync(user, request.Password, isPersistent: true, lockoutOnFailure: false);
        
        if (!result.Succeeded)
            return Unauthorized("Invalid credentials");

        return Ok(new { message = "Logged in successfully" });
    }

    /// <summary>
    /// Получение информации о текущем авторизованном пользователе
    /// </summary>
    [HttpGet]
    [Authorize] // Только для авторизованных
    public async Task<IActionResult> GetCurrentUser()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null)
            return NotFound("User not found");

        return Ok(new { username = user.UserName });
    }

    /// <summary>
    /// Удаление аккаунта текущего пользователя
    /// </summary>
    [HttpDelete]
    [Authorize]
    public async Task<IActionResult> DeleteAccount()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null) return NotFound();

        
        await _userManager.DeleteAsync(user);
        await _signInManager.SignOutAsync();
        
        return Ok(new { message = "Account deleted" });
    }
    
    /// <summary>
    /// Выход из системы (очистка кук)
    /// </summary>
    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        await _signInManager.SignOutAsync();
        return Ok(new { message = "Logged out successfully" });
    }
}