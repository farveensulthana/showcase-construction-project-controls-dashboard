using Construction.Core.DTOs;

namespace Construction.Core.Interfaces;

public interface ISubmittalService
{
    Task<PagedResponseDto<SubmittalDto>> GetSubmittalsAsync(QueryParametersDto query, CancellationToken ct = default);
    Task<SubmittalDto?> GetSubmittalByIdAsync(int id, CancellationToken ct = default);
    Task<SubmittalDto> CreateSubmittalAsync(SubmittalCreateDto dto, CancellationToken ct = default);
    Task<SubmittalDto?> UpdateSubmittalAsync(int id, SubmittalUpdateDto dto, CancellationToken ct = default);
    Task<bool> DeleteSubmittalAsync(int id, CancellationToken ct = default);
    Task<IReadOnlyList<SubmittalSummaryDto>> GetSubmittalsByProjectAsync(int projectId, CancellationToken ct = default);
}
