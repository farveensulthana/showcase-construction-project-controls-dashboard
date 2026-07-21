using Construction.Core.DTOs;
using Construction.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Construction.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RfisController : ControllerBase
{
    private readonly IRfiService _service;

    public RfisController(IRfiService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<PagedResponseDto<RfiDto>>> GetRfis([FromQuery] QueryParametersDto query, CancellationToken ct)
        => Ok(await _service.GetRfisAsync(query, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<RfiDto>> GetRfi(int id, CancellationToken ct)
    {
        var rfi = await _service.GetRfiByIdAsync(id, ct);
        return rfi is null ? NotFound() : Ok(rfi);
    }

    [HttpPost]
    public async Task<ActionResult<RfiDto>> CreateRfi([FromBody] RfiCreateDto dto, CancellationToken ct)
        => Ok(await _service.CreateRfiAsync(dto, ct));

    [HttpPut("{id:int}")]
    public async Task<ActionResult<RfiDto>> UpdateRfi(int id, [FromBody] RfiUpdateDto dto, CancellationToken ct)
    {
        var rfi = await _service.UpdateRfiAsync(id, dto, ct);
        return rfi is null ? NotFound() : Ok(rfi);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteRfi(int id, CancellationToken ct)
        => await _service.DeleteRfiAsync(id, ct) ? NoContent() : NotFound();
}
