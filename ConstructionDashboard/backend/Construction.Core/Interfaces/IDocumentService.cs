using Construction.Core.DTOs;

namespace Construction.Core.Interfaces;

public interface IDocumentService
{
    Task<PagedResponseDto<DocumentDto>> GetDocumentsAsync(QueryParametersDto query, CancellationToken ct = default);
    Task<DocumentDto?> GetDocumentByIdAsync(int id, CancellationToken ct = default);
    Task<DocumentDto> CreateDocumentAsync(DocumentCreateDto dto, CancellationToken ct = default);
    Task<DocumentDto?> UpdateDocumentAsync(int id, DocumentUpdateDto dto, CancellationToken ct = default);
    Task<bool> DeleteDocumentAsync(int id, CancellationToken ct = default);
}
