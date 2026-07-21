using Microsoft.AspNetCore.Components;

namespace Construction.Blazor.Components.Pages;

public partial class Schedule : ComponentBase
{
    [Inject] private ProjectsService ProjectsApi { get; set; } = default!;
    [Inject] private ReportsService Reports { get; set; } = default!;
    [Inject] private TasksService TasksApi { get; set; } = default!;

    private static readonly string[] MonthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    private List<ProjectDto> _projects = [];
    private List<TaskDto> _tasks = [];
    private List<UpcomingMilestoneDto> _milestones = [];
    private readonly Dictionary<string, int> _milestoneFloatDays = [];
    private int? _projectId;
    private int _monthOffset;
    private string _viewMode = "Month";
    private int _page = 1;
    private const int PageSize = 20;
    private bool _loading = true;
    private string? _error;

    protected override async Task OnInitializedAsync()
    {
        try
        {
            var projectsTask = ProjectsApi.GetProjectsAsync(1, 100);
            var tasksTask = TasksApi.GetTasksAsync(1, 200);
            var milestonesTask = Reports.GetUpcomingMilestonesAsync(30, 10);
            await Task.WhenAll(projectsTask, tasksTask, milestonesTask);
            _projects = projectsTask.Result.Data.ToList();
            _tasks = tasksTask.Result.Data.ToList();
            _milestones = milestonesTask.Result;

            var random = new Random();
            foreach (var m in _milestones)
            {
                _milestoneFloatDays[$"{m.ProjectCode}-{m.Title}"] = random.Next(0, 5);
            }
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

    private List<TaskDto> FilteredTasks =>
        _projectId is null ? _tasks : _tasks.Where(t => t.ProjectId == _projectId).ToList();

    private DateTime DisplayedMonth
    {
        get
        {
            var baseDate = DateTime.Today.AddMonths(_monthOffset);
            return new DateTime(baseDate.Year, baseDate.Month, 1);
        }
    }

    private List<TaskDto> VisibleTasks
    {
        get
        {
            var filtered = FilteredTasks;
            if (filtered.Count == 0) return [];
            var monthStart = DisplayedMonth;
            var monthEnd = monthStart.AddMonths(1).AddDays(-1);
            return filtered.Where(t => t.StartDate <= monthEnd && t.EndDate >= monthStart).ToList();
        }
    }

    private (DateTime Start, DateTime End) TimelineRange
    {
        get
        {
            var filtered = FilteredTasks;
            if (filtered.Count == 0) return (DateTime.Today, DateTime.Today);
            return (filtered.Min(t => t.StartDate), filtered.Max(t => t.EndDate));
        }
    }

    private double SpanMs => (TimelineRange.End - TimelineRange.Start).TotalMilliseconds;

    private List<TaskDto> AllVisibleRows
    {
        get
        {
            var rows = new List<TaskDto>();
            var visible = VisibleTasks;
            foreach (var parent in visible.Where(t => t.ParentTaskId is null).OrderBy(t => t.StartDate))
            {
                rows.Add(parent);
                rows.AddRange(GetChildRows(parent));
            }
            return rows;
        }
    }

    private List<TaskDto> PagedRows => AllVisibleRows.Skip((_page - 1) * PageSize).Take(PageSize).ToList();

    private List<TaskDto> GetChildRows(TaskDto parent) =>
        VisibleTasks.Where(t => t.ParentTaskId == parent.Id).OrderBy(t => t.StartDate).ToList();

    private static bool IsChildRow(TaskDto task) => task.ParentTaskId is not null;

    private double TimelineLeft(TaskDto task)
    {
        var span = SpanMs;
        if (span == 0) return 0;
        var offset = (task.StartDate - TimelineRange.Start).TotalMilliseconds;
        return Math.Max(0, Math.Min(100, offset / span * 100));
    }

    private double TimelineWidth(TaskDto task)
    {
        var span = SpanMs;
        if (span == 0) return 100;
        var widthMs = (task.EndDate - task.StartDate).TotalMilliseconds;
        return Math.Max(2, Math.Min(100, widthMs / span * 100));
    }

    private double ProgressWidth(TaskDto task) => Math.Max(2, TimelineWidth(task) * (task.Progress / 100.0));

    private static string ShortDate(DateTime d) => $"{MonthNames[d.Month - 1]} {d.Day}";

    private string GetMonthLabel() => $"{MonthNames[DisplayedMonth.Month - 1]} {DisplayedMonth.Year}";

    private (string ClassName, string Label) MilestoneCriticality(UpcomingMilestoneDto m)
    {
        var days = _milestoneFloatDays.GetValueOrDefault($"{m.ProjectCode}-{m.Title}", 0);
        if (days == 0) return ("badge-error", "Critical");
        if (days <= 2) return ("badge-warning", "Near Critical");
        return ("badge-info", "On Track");
    }

    private int MilestoneFloat(UpcomingMilestoneDto m) => _milestoneFloatDays.GetValueOrDefault($"{m.ProjectCode}-{m.Title}", 0);

    private void OnProjectFilterChanged(Microsoft.AspNetCore.Components.ChangeEventArgs e)
    {
        var value = e.Value?.ToString();
        _projectId = string.IsNullOrEmpty(value) ? null : int.Parse(value);
        _page = 1;
    }

    private void PrevMonth() { _monthOffset--; _page = 1; }
    private void NextMonth() { _monthOffset++; _page = 1; }
    private void SetViewMode(string mode) { _viewMode = mode; _page = 1; }
}
