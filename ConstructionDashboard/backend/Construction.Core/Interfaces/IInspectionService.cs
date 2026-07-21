using Construction.Core.DTOs;

namespace Construction.Core.Interfaces;

public interface IInspectionService
{
    Task<PagedResponseDto<InspectionDto>> GetInspectionsAsync(QueryParametersDto query, CancellationToken ct = default);
    Task<InspectionDto?> GetInspectionByIdAsync(int id, CancellationToken ct = default);
    Task<InspectionDto> CreateInspectionAsync(InspectionCreateDto dto, CancellationToken ct = default);
    Task<InspectionDto?> UpdateInspectionAsync(int id, InspectionUpdateDto dto, CancellationToken ct = default);
    Task<bool> DeleteInspectionAsync(int id, CancellationToken ct = default);
}
