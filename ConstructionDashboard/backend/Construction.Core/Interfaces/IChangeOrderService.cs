using Construction.Core.DTOs;

namespace Construction.Core.Interfaces;

public interface IChangeOrderService
{
    Task<PagedResponseDto<ChangeOrderDto>> GetChangeOrdersAsync(QueryParametersDto query, CancellationToken ct = default);
    Task<ChangeOrderDto?> GetChangeOrderByIdAsync(int id, CancellationToken ct = default);
    Task<ChangeOrderDto> CreateChangeOrderAsync(ChangeOrderCreateDto dto, CancellationToken ct = default);
    Task<ChangeOrderDto?> UpdateChangeOrderAsync(int id, ChangeOrderUpdateDto dto, CancellationToken ct = default);
    Task<bool> DeleteChangeOrderAsync(int id, CancellationToken ct = default);
}
