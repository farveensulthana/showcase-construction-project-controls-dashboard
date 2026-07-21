using Construction.Core.DTOs;

namespace Construction.Core.Interfaces;

public interface IRfiService
{
    Task<PagedResponseDto<RfiDto>> GetRfisAsync(QueryParametersDto query, CancellationToken ct = default);
    Task<RfiDto?> GetRfiByIdAsync(int id, CancellationToken ct = default);
    Task<RfiDto> CreateRfiAsync(RfiCreateDto dto, CancellationToken ct = default);
    Task<RfiDto?> UpdateRfiAsync(int id, RfiUpdateDto dto, CancellationToken ct = default);
    Task<bool> DeleteRfiAsync(int id, CancellationToken ct = default);
    Task<IReadOnlyList<RfiSummaryDto>> GetRfisByProjectAsync(int projectId, CancellationToken ct = default);
}
