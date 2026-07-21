using Construction.Core.DTOs;
using Construction.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Construction.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class InspectionsController : ControllerBase
{
    private readonly IInspectionService _service;

    public InspectionsController(IInspectionService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<PagedResponseDto<InspectionDto>>> GetInspections([FromQuery] QueryParametersDto query, CancellationToken ct)
        => Ok(await _service.GetInspectionsAsync(query, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<InspectionDto>> GetInspection(int id, CancellationToken ct)
    {
        var inspection = await _service.GetInspectionByIdAsync(id, ct);
        return inspection is null ? NotFound() : Ok(inspection);
    }

    [HttpPost]
    public async Task<ActionResult<InspectionDto>> CreateInspection([FromBody] InspectionCreateDto dto, CancellationToken ct)
        => Ok(await _service.CreateInspectionAsync(dto, ct));

    [HttpPut("{id:int}")]
    public async Task<ActionResult<InspectionDto>> UpdateInspection(int id, [FromBody] InspectionUpdateDto dto, CancellationToken ct)
    {
        var inspection = await _service.UpdateInspectionAsync(id, dto, ct);
        return inspection is null ? NotFound() : Ok(inspection);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteInspection(int id, CancellationToken ct)
        => await _service.DeleteInspectionAsync(id, ct) ? NoContent() : NotFound();
}
