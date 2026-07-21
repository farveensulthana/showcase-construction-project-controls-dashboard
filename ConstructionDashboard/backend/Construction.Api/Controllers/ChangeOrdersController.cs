using Construction.Core.DTOs;
using Construction.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Construction.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChangeOrdersController : ControllerBase
{
    private readonly IChangeOrderService _service;

    public ChangeOrdersController(IChangeOrderService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<PagedResponseDto<ChangeOrderDto>>> GetChangeOrders([FromQuery] QueryParametersDto query, CancellationToken ct)
        => Ok(await _service.GetChangeOrdersAsync(query, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ChangeOrderDto>> GetChangeOrder(int id, CancellationToken ct)
    {
        var co = await _service.GetChangeOrderByIdAsync(id, ct);
        return co is null ? NotFound() : Ok(co);
    }

    [HttpPost]
    public async Task<ActionResult<ChangeOrderDto>> CreateChangeOrder([FromBody] ChangeOrderCreateDto dto, CancellationToken ct)
        => Ok(await _service.CreateChangeOrderAsync(dto, ct));

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ChangeOrderDto>> UpdateChangeOrder(int id, [FromBody] ChangeOrderUpdateDto dto, CancellationToken ct)
    {
        var co = await _service.UpdateChangeOrderAsync(id, dto, ct);
        return co is null ? NotFound() : Ok(co);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteChangeOrder(int id, CancellationToken ct)
        => await _service.DeleteChangeOrderAsync(id, ct) ? NoContent() : NotFound();
}
