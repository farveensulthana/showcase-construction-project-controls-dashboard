using Construction.Core.DTOs;
using Construction.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Construction.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RisksController : ControllerBase
{
    private readonly IRiskService _service;

    public RisksController(IRiskService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<PagedResponseDto<RiskDto>>> GetRisks([FromQuery] QueryParametersDto query, CancellationToken ct)
        => Ok(await _service.GetRisksAsync(query, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<RiskDto>> GetRisk(int id, CancellationToken ct)
    {
        var risk = await _service.GetRiskByIdAsync(id, ct);
        return risk is null ? NotFound() : Ok(risk);
    }

    [HttpPost]
    public async Task<ActionResult<RiskDto>> CreateRisk([FromBody] RiskCreateDto dto, CancellationToken ct)
    {
        var created = await _service.CreateRiskAsync(dto, ct);
        return CreatedAtAction(nameof(GetRisk), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<RiskDto>> UpdateRisk(int id, [FromBody] RiskUpdateDto dto, CancellationToken ct)
    {
        var updated = await _service.UpdateRiskAsync(id, dto, ct);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteRisk(int id, CancellationToken ct)
        => await _service.DeleteRiskAsync(id, ct) ? NoContent() : NotFound();

    [HttpGet("kpis")]
    public async Task<ActionResult<RiskKpisDto>> GetKpis(CancellationToken ct)
        => Ok(await _service.GetKpisAsync(ct));

    [HttpGet("matrix")]
    public async Task<ActionResult<RiskMatrixDto>> GetMatrix(CancellationToken ct)
        => Ok(await _service.GetMatrixAsync(ct));
}
