using Construction.Core.DTOs;
using Construction.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Construction.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DocumentsController : ControllerBase
{
    private readonly IDocumentService _service;

    public DocumentsController(IDocumentService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<PagedResponseDto<DocumentDto>>> GetDocuments([FromQuery] QueryParametersDto query, CancellationToken ct)
        => Ok(await _service.GetDocumentsAsync(query, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<DocumentDto>> GetDocument(int id, CancellationToken ct)
    {
        var doc = await _service.GetDocumentByIdAsync(id, ct);
        return doc is null ? NotFound() : Ok(doc);
    }

    [HttpPost]
    public async Task<ActionResult<DocumentDto>> CreateDocument([FromBody] DocumentCreateDto dto, CancellationToken ct)
        => Ok(await _service.CreateDocumentAsync(dto, ct));

    [HttpPut("{id:int}")]
    public async Task<ActionResult<DocumentDto>> UpdateDocument(int id, [FromBody] DocumentUpdateDto dto, CancellationToken ct)
    {
        var doc = await _service.UpdateDocumentAsync(id, dto, ct);
        return doc is null ? NotFound() : Ok(doc);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteDocument(int id, CancellationToken ct)
        => await _service.DeleteDocumentAsync(id, ct) ? NoContent() : NotFound();
}
