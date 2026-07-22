using Construction.Core.DTOs;
using Construction.Core.Entities;
using Construction.Core.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Construction.Infrastructure.Services;

public class ChangeOrderService : IChangeOrderService
{
    private readonly IChangeOrderRepository _repo;

    public ChangeOrderService(IChangeOrderRepository repo) => _repo = repo;

    public async Task<PagedResponseDto<ChangeOrderDto>> GetChangeOrdersAsync(QueryParametersDto query, CancellationToken ct = default)
    {
        var source = ApplyFilter(_repo.Query(), query.Filter);
        source = ApplySort(source, query.Sort);

        var total = source.Count();
        var items = source.Skip((query.Page - 1) * query.PageSize).Take(query.PageSize).ToList();

        return await Task.FromResult(new PagedResponseDto<ChangeOrderDto>
        {
            Data = items.Select(MapChangeOrder).ToList(),
            TotalCount = total,
            Page = query.Page,
            PageSize = query.PageSize,
            TotalPages = (int)Math.Ceiling(total / (double)query.PageSize)
        });
    }

    public async Task<ChangeOrderDto?> GetChangeOrderByIdAsync(int id, CancellationToken ct = default)
    {
        var entity = await _repo.GetByIdAsync(id, ct);
        return entity is null ? null : MapChangeOrder(entity);
    }

    private static IQueryable<ChangeOrder> ApplyFilter(IQueryable<ChangeOrder> source, string? filter)
    {
        if (string.IsNullOrWhiteSpace(filter)) return source;
        var parts = filter.Split('=', 2);
        if (parts.Length != 2) return source;
        var key = parts[0].Trim().ToLowerInvariant();
        var value = parts[1].Trim();

        return key switch
        {
            "description" => source.Where(c => c.Description.Contains(value)),
            "number" => source.Where(c => c.Number.Contains(value)),
            "status" when Enum.TryParse<ChangeOrderStatus>(value, true, out var status) => source.Where(c => c.Status == status),
            "projectid" when int.TryParse(value, out var pid) => source.Where(c => c.ProjectId == pid),
            _ => source
        };
    }

    private static IQueryable<ChangeOrder> ApplySort(IQueryable<ChangeOrder> source, string? sort)
    {
        var (field, desc) = ParseSort(sort);
        return field switch
        {
            "number" => desc ? source.OrderByDescending(c => c.Number) : source.OrderBy(c => c.Number),
            "description" => desc ? source.OrderByDescending(c => c.Description) : source.OrderBy(c => c.Description),
            "amount" => desc ? source.OrderByDescending(c => c.Amount) : source.OrderBy(c => c.Amount),
            "requestdate" => desc ? source.OrderByDescending(c => c.RequestDate) : source.OrderBy(c => c.RequestDate),
            "status" => desc ? source.OrderByDescending(c => c.Status) : source.OrderBy(c => c.Status),
            _ => source.OrderBy(c => c.Id)
        };
    }

    private static (string field, bool desc) ParseSort(string? sort)
    {
        if (string.IsNullOrWhiteSpace(sort)) return ("id", false);
        var parts = sort.Split(':', 2);
        var field = parts[0].Trim().ToLowerInvariant();
        var desc = parts.Length > 1 && parts[1].Trim().Equals("desc", StringComparison.OrdinalIgnoreCase);
        return (field, desc);
    }

    private static ChangeOrderDto MapChangeOrder(ChangeOrder c) => new()
    {
        Id = c.Id,
        ProjectId = c.ProjectId,
        Number = c.Number,
        Description = c.Description,
        Amount = c.Amount,
        Status = c.Status,
        RequestedBy = c.RequestedBy,
        RequestDate = c.RequestDate,
        ApprovedBy = c.ApprovedBy,
        ApprovalDate = c.ApprovalDate,
        Justification = c.Justification,
        ImpactDays = c.ImpactDays,
        CreatedDate = c.CreatedDate,
        ModifiedDate = c.ModifiedDate
    };
}
