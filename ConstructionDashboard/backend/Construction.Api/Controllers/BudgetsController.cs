using Construction.Core.DTOs;
using Construction.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Construction.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BudgetsController : ControllerBase
{
    private readonly IBudgetService _service;

    public BudgetsController(IBudgetService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<PagedResponseDto<BudgetDto>>> GetBudgets([FromQuery] QueryParametersDto query, CancellationToken ct)
        => Ok(await _service.GetBudgetsAsync(query, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<BudgetDto>> GetBudget(int id, CancellationToken ct)
    {
        var budget = await _service.GetBudgetByIdAsync(id, ct);
        return budget is null ? NotFound() : Ok(budget);
    }

    [HttpPost]
    public async Task<ActionResult<BudgetDto>> CreateBudget([FromBody] BudgetCreateDto dto, CancellationToken ct)
        => Ok(await _service.CreateBudgetAsync(dto, ct));

    [HttpPut("{id:int}")]
    public async Task<ActionResult<BudgetDto>> UpdateBudget(int id, [FromBody] BudgetUpdateDto dto, CancellationToken ct)
    {
        var budget = await _service.UpdateBudgetAsync(id, dto, ct);
        return budget is null ? NotFound() : Ok(budget);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteBudget(int id, CancellationToken ct)
        => await _service.DeleteBudgetAsync(id, ct) ? NoContent() : NotFound();
}
