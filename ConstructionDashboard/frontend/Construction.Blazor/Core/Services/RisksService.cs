using Construction.Core.DTOs;

namespace Construction.Blazor.Core.Services;

public class RisksService(ApiClient api)
{
    public Task<PagedResponseDto<RiskDto>> GetRisksAsync(int page = 1, int pageSize = 50) =>
        api.GetJsonAsync<PagedResponseDto<RiskDto>>("risks", new Dictionary<string, object?> { ["page"] = page, ["pageSize"] = pageSize });

    public Task<RiskKpisDto> GetKpisAsync() =>
        api.GetJsonAsync<RiskKpisDto>("risks/kpis");

    public Task<RiskDto> UpdateAsync(int id, RiskUpdateDto changes) =>
        api.PutJsonAsync<RiskDto>($"risks/{id}", changes);

    // Kept for API-surface parity with the React/Angular apps; intentionally NOT called by the
    // Risks page's "New Risk" modal, which stays local-state-only (demo data, no persistence).
    public Task<RiskDto> CreateAsync(RiskCreateDto risk) =>
        api.PostJsonAsync<RiskDto>("risks", risk);

    public Task DeleteAsync(int id) =>
        api.DeleteAsync($"risks/{id}");

    public Task<RiskMatrixDto> GetMatrixAsync() =>
        api.GetJsonAsync<RiskMatrixDto>("risks/matrix");
}
