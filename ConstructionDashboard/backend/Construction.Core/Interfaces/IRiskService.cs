using Construction.Core.DTOs;

namespace Construction.Core.Interfaces;

public interface IRiskService
{
    Task<PagedResponseDto<RiskDto>> GetRisksAsync(QueryParametersDto query, CancellationToken ct = default);
    Task<RiskDto?> GetRiskByIdAsync(int id, CancellationToken ct = default);
    Task<RiskDto> CreateRiskAsync(RiskCreateDto dto, CancellationToken ct = default);
    Task<RiskDto?> UpdateRiskAsync(int id, RiskUpdateDto dto, CancellationToken ct = default);
    Task<bool> DeleteRiskAsync(int id, CancellationToken ct = default);
    Task<RiskKpisDto> GetKpisAsync(CancellationToken ct = default);
    Task<RiskMatrixDto> GetMatrixAsync(CancellationToken ct = default);
    Task<IReadOnlyList<RiskDto>> GetTopOpenRisksByProjectAsync(int projectId, int limit, CancellationToken ct = default);
}
