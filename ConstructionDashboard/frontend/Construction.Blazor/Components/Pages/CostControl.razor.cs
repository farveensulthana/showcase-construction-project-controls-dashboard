using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Web;

namespace Construction.Blazor.Components.Pages;

public partial class CostControl : ComponentBase
{
    [Inject] private ReportsService Reports { get; set; } = default!;
    [Inject] private ChangeOrdersService ChangeOrdersApi { get; set; } = default!;
    [Inject] private DownloadInterop Download { get; set; } = default!;

    private static readonly CostVarianceByCostCodeDto[] FallbackCostCodes =
    [
        new() { CostCode = "General Conditions", VariancePct = 2 },
        new() { CostCode = "Sitework", VariancePct = 4 },
        new() { CostCode = "Concrete", VariancePct = -3 },
        new() { CostCode = "Masonry", VariancePct = -5 },
        new() { CostCode = "Metals", VariancePct = -8 },
        new() { CostCode = "Finishes", VariancePct = 1 },
    ];

    private static readonly Dictionary<ChangeOrderStatus, string> StatusBadgeClass = new()
    {
        [ChangeOrderStatus.Draft] = "badge-neutral",
        [ChangeOrderStatus.Pending] = "badge-warning",
        [ChangeOrderStatus.Approved] = "badge-success",
        [ChangeOrderStatus.Rejected] = "badge-error",
        [ChangeOrderStatus.Implemented] = "badge-success",
    };

    private static readonly (ChangeOrderStatus? Status, string Label)[] StatusOptions =
    [
        (null, "All statuses"), (ChangeOrderStatus.Draft, "Draft"), (ChangeOrderStatus.Pending, "Pending"),
        (ChangeOrderStatus.Approved, "Approved"), (ChangeOrderStatus.Rejected, "Rejected"), (ChangeOrderStatus.Implemented, "Implemented"),
    ];

    private CostKpisDto? _kpis;
    private List<CostPerformancePointDto> _trend = [];
    private List<CostVarianceByCostCodeDto> _variances = [];
    private List<ChangeOrderSummaryDto> _changeOrders = [];
    private int _changeOrderPage = 1;
    private const int ChangeOrderPageSize = 20;
    private string _coSearch = "";
    private ChangeOrderStatus? _coStatus = ChangeOrderStatus.Pending;
    private bool _coLoading = true;
    private bool _loading = true;
    private string? _error;
    private ChangeOrderSummaryDto? _selectedCo;
    private bool _showNewCoModal;
    private NewChangeOrderDraft _draft = new();

    private class NewChangeOrderDraft
    {
        public string ProjectId { get; set; } = "";
        public string Description { get; set; } = "";
        public string Amount { get; set; } = "";
        public string RequestedBy { get; set; } = "";
        public DateTime RequestDate { get; set; } = DateTime.Today;
        public string ImpactDays { get; set; } = "";
        public string Justification { get; set; } = "";
    }

    protected override async Task OnInitializedAsync()
    {
        try
        {
            var kpisTask = Reports.GetCostKpisAsync();
            var trendTask = Reports.GetCostPerformanceTrendAsync(7);
            var varianceTask = Reports.GetCostVarianceByCostCodeAsync();
            await Task.WhenAll(kpisTask, trendTask, varianceTask);
            _kpis = kpisTask.Result;
            _trend = trendTask.Result;
            _variances = varianceTask.Result.Count > 0 ? varianceTask.Result : FallbackCostCodes.ToList();
        }
        catch (Exception ex)
        {
            _error = ex.Message;
        }
        finally
        {
            _loading = false;
        }

        try
        {
            var result = await ChangeOrdersApi.GetChangeOrdersAsync(1, 1000);
            _changeOrders = result.Data.ToList();
        }
        catch
        {
            _changeOrders = [];
        }
        finally
        {
            _coLoading = false;
        }
    }

    private decimal TrendScale => _trend.Count == 0 ? 1 : Math.Max(_trend.SelectMany(t => new[] { t.Planned, t.Actual }).Max(), 1);
    private double BarHeight(decimal value) => TrendScale == 0 ? 0 : Math.Round((double)(value / TrendScale) * 100);

    private decimal? BudgetDelta => _kpis is null ? null : _kpis.TotalPortfolioBudget - _kpis.ForecastAtCompletion;

    private static string HeatmapClass(decimal variancePct) => variancePct >= 0 ? "is-positive" : variancePct >= -5 ? "is-warning" : "is-negative";

    private static string PctOfBudget(decimal spend, decimal budget) => budget == 0 ? "—" : $"{Math.Round(spend / budget * 100)}% of budget";

    private List<ChangeOrderSummaryDto> FilteredChangeOrders =>
        _changeOrders.Where(co =>
        {
            var matchesStatus = _coStatus is null || co.Status == _coStatus;
            var q = _coSearch.Trim();
            var matchesSearch = string.IsNullOrEmpty(q)
                || co.Number.Contains(q, StringComparison.OrdinalIgnoreCase)
                || co.Description.Contains(q, StringComparison.OrdinalIgnoreCase)
                || co.ProjectId.ToString().Contains(q, StringComparison.OrdinalIgnoreCase);
            return matchesStatus && matchesSearch;
        }).ToList();

    private List<ChangeOrderSummaryDto> PagedChangeOrders =>
        FilteredChangeOrders.Skip((_changeOrderPage - 1) * ChangeOrderPageSize).Take(ChangeOrderPageSize).ToList();

    private void OnSearchChanged(ChangeEventArgs e)
    {
        _coSearch = e.Value?.ToString() ?? "";
        _changeOrderPage = 1;
    }

    private void OnStatusChanged(ChangeEventArgs e)
    {
        var value = e.Value?.ToString();
        _coStatus = string.IsNullOrEmpty(value) ? null : Enum.Parse<ChangeOrderStatus>(value);
        _changeOrderPage = 1;
    }

    private void OpenNewChangeOrderModal()
    {
        _draft = new NewChangeOrderDraft();
        _showNewCoModal = true;
    }

    private void SaveNewChangeOrder()
    {
        if (string.IsNullOrWhiteSpace(_draft.Description)) return;
        var nextId = _changeOrders.Count > 0 ? _changeOrders.Max(c => c.Id) + 1 : 1;
        var created = new ChangeOrderSummaryDto
        {
            Id = nextId,
            ProjectId = int.TryParse(_draft.ProjectId, out var pid) ? pid : 0,
            Number = $"CO-{nextId:D4}",
            Description = _draft.Description.Trim(),
            Amount = decimal.TryParse(_draft.Amount, out var amt) ? amt : 0,
            Status = ChangeOrderStatus.Draft,
            RequestedBy = string.IsNullOrWhiteSpace(_draft.RequestedBy) ? null : _draft.RequestedBy.Trim(),
            RequestDate = _draft.RequestDate,
        };
        // Demo only: kept in local component state so it's visible in the UI immediately;
        // nothing is written back to the API.
        _changeOrders = [created, .. _changeOrders];
        _coStatus = null;
        _coSearch = "";
        _showNewCoModal = false;
    }

    private async Task ExportChangeOrders()
    {
        var csv = CsvBuilder.Build<ChangeOrderSummaryDto>(
        [
            new("CO #", co => co.Number),
            new("Project ID", co => co.ProjectId),
            new("Description", co => co.Description),
            new("Submitted", co => co.RequestDate is not null ? Formatters.FormatDate(co.RequestDate) : ""),
            new("Amount", co => co.Amount),
            new("Status", co => co.Status),
        ], FilteredChangeOrders);
        await Download.DownloadTextFileAsync("change-orders.csv", "text/csv;charset=utf-8;", csv);
    }

    private void OnRowKeydown(KeyboardEventArgs e, ChangeOrderSummaryDto co) => KeyboardActivation.OnActivateKey(e, () => _selectedCo = co);
}
