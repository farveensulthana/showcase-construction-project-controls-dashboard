using Microsoft.AspNetCore.Components;

namespace Construction.Blazor.Components.Pages;

public partial class Dashboard : ComponentBase
{
    [Inject] private ReportsService Reports { get; set; } = default!;
    [Inject] private NavigationManager Nav { get; set; } = default!;

    private PortfolioKpisDto? _portfolio;
    private CostKpisDto? _cost;
    private ProjectHealthDistributionDto? _health;
    private List<CostPerformancePointDto> _trend = [];
    private List<UpcomingMilestoneDto> _milestones = [];
    private bool _loading = true;
    private string? _error;
    private string? _hoveredMonth;

    private static readonly Dictionary<HealthStatus, string> HealthClasses = new()
    {
        [HealthStatus.NotStarted] = "text-secondary",
        [HealthStatus.OnTrack] = "positive",
        [HealthStatus.AtRisk] = "warning",
        [HealthStatus.Critical] = "negative",
    };

    private static readonly Dictionary<HealthStatus, string> HealthBadgeClass = new()
    {
        [HealthStatus.NotStarted] = "badge-neutral",
        [HealthStatus.OnTrack] = "badge-success",
        [HealthStatus.AtRisk] = "badge-warning",
        [HealthStatus.Critical] = "badge-error",
    };

    private record KpiSummaryItem(string Label, string Value, string Icon, string Trend, string Tone, string? To);

    protected override async Task OnInitializedAsync()
    {
        try
        {
            var portfolioTask = Reports.GetPortfolioKpisAsync();
            var costTask = Reports.GetCostKpisAsync();
            var healthTask = Reports.GetProjectHealthDistributionAsync();
            var trendTask = Reports.GetCostPerformanceTrendAsync(6);
            var milestonesTask = Reports.GetUpcomingMilestonesAsync(14, 10);
            await Task.WhenAll(portfolioTask, costTask, healthTask, trendTask, milestonesTask);

            _portfolio = portfolioTask.Result;
            _cost = costTask.Result;
            _health = healthTask.Result;
            _trend = trendTask.Result;
            _milestones = milestonesTask.Result;
        }
        catch (Exception ex)
        {
            _error = ex.Message;
        }
        finally
        {
            _loading = false;
        }
    }

    private decimal CostScale => _trend.Count == 0 ? 1 : Math.Max(_trend.SelectMany(t => new[] { t.Planned, t.Actual }).Max(), 1);

    private double BarHeight(decimal value) => CostScale == 0 ? 0 : (double)(value / CostScale) * 100;

    private (int OnTrack, int AtRisk, int Critical, int NotStarted, int Total) HealthCounts =>
        _health is null
            ? (0, 0, 0, 0, 0)
            : (_health.OnTrack, _health.AtRisk, _health.Critical, _health.NotStarted,
               _health.OnTrack + _health.AtRisk + _health.Critical + _health.NotStarted);

    private string DonutBackground
    {
        get
        {
            var (onTrack, atRisk, critical, _, total) = HealthCounts;
            if (total == 0) return "conic-gradient(var(--color-border) 0 100%)";
            var t1 = onTrack / (double)total * 100;
            var t2 = t1 + atRisk / (double)total * 100;
            var t3 = t2 + critical / (double)total * 100;
            return $"conic-gradient(var(--color-success) 0% {t1}%, var(--color-warning) {t1}% {t2}%, var(--color-error) {t2}% {t3}%, var(--color-border) {t3}% 100%)";
        }
    }

    private static string FormatPct(decimal n) => $"{(n >= 0 ? "+" : "")}{n:0.0}%";

    private List<KpiSummaryItem>? KpiSummary
    {
        get
        {
            if (_portfolio is null || _cost is null) return null;
            var p = _portfolio;
            return
            [
                new("Active Projects", p.ActiveProjects.ToString(), "arrow-up-right", "3 this quarter", "positive", "/projects"),
                new("Schedule Variance (SV)", FormatPct(p.ScheduleVariancePct), p.ScheduleVariancePct >= 0 ? "arrow-up-right" : "arrow-down-right",
                    $"{Math.Abs(p.ScheduleVariancePct):0.0}% {(p.ScheduleVariancePct >= 0 ? "ahead" : "behind")} plan", p.ScheduleVariancePct >= 0 ? "positive" : "negative", null),
                new("Cost Variance (CV)", FormatPct(p.CostVariancePct), p.CostVariancePct >= 0 ? "arrow-up-right" : "arrow-down-right",
                    p.CostVariancePct >= 0 ? "Under budget" : "Over budget", p.CostVariancePct >= 0 ? "positive" : "negative", "/cost-control"),
                new("CPI", p.Cpi.ToString("0.00"), p.Cpi >= 1 ? "arrow-up-right" : "alert-circle", p.Cpi >= 1 ? "On target" : "Below target", p.Cpi >= 1 ? "positive" : "warning", null),
                new("SPI", p.Spi.ToString("0.00"), p.Spi >= 1 ? "arrow-up-right" : "arrow-down-right", p.Spi >= 1 ? "Schedule on track" : "Recovery needed", p.Spi >= 1 ? "positive" : "negative", null),
                new("Open Risks", p.OpenRisks.ToString(), p.CriticalRisks > 0 ? "alert-triangle" : "check-circle", $"{p.CriticalRisks} critical", p.CriticalRisks > 0 ? "negative" : "positive", "/risks"),
            ];
        }
    }

    private void GoTo(string path) => Nav.NavigateTo(path);

    private void OnKpiKeydown(Microsoft.AspNetCore.Components.Web.KeyboardEventArgs e, KpiSummaryItem kpi)
    {
        if (kpi.To is null) return;
        KeyboardActivation.OnActivateKey(e, () => GoTo(kpi.To));
    }

    private static string SplitHealthLabel(HealthStatus status) =>
        System.Text.RegularExpressions.Regex.Replace(status.ToString(), "([A-Z])", " $1").Trim();
}
