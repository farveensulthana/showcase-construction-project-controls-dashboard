using Construction.Core.DTOs;

namespace Construction.Core.Interfaces;

public interface IMilestoneService
{
    Task<PagedResponseDto<MilestoneDto>> GetMilestonesAsync(QueryParametersDto query, CancellationToken ct = default);
    Task<MilestoneDto?> GetMilestoneByIdAsync(int id, CancellationToken ct = default);
    Task<MilestoneDto> CreateMilestoneAsync(MilestoneCreateDto dto, CancellationToken ct = default);
    Task<MilestoneDto?> UpdateMilestoneAsync(int id, MilestoneUpdateDto dto, CancellationToken ct = default);
    Task<bool> DeleteMilestoneAsync(int id, CancellationToken ct = default);
    Task<IReadOnlyList<MilestoneDto>> GetMilestonesByProjectAsync(int projectId, int days, CancellationToken ct = default);
    Task<IReadOnlyList<MilestoneDto>> GetUpcomingMilestonesAsync(int days, int limit, CancellationToken ct = default);
}
