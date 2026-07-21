using Construction.Core.DTOs;

namespace Construction.Core.Interfaces;

public interface IBudgetService
{
    Task<PagedResponseDto<BudgetDto>> GetBudgetsAsync(QueryParametersDto query, CancellationToken ct = default);
    Task<BudgetDto?> GetBudgetByIdAsync(int id, CancellationToken ct = default);
    Task<BudgetDto> CreateBudgetAsync(BudgetCreateDto dto, CancellationToken ct = default);
    Task<BudgetDto?> UpdateBudgetAsync(int id, BudgetUpdateDto dto, CancellationToken ct = default);
    Task<bool> DeleteBudgetAsync(int id, CancellationToken ct = default);
}
