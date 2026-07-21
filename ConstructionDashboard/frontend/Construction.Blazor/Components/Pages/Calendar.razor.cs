using Microsoft.AspNetCore.Components;

namespace Construction.Blazor.Components.Pages;

public partial class Calendar : ComponentBase
{
    [Inject] private SchedulerService SchedulerApi { get; set; } = default!;

    public class SchedulerEvent
    {
        public int Id { get; set; }
        public string Subject { get; set; } = "";
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public string? Description { get; set; }
    }

    private List<SchedulerEvent> _events = [];
    private bool _loading = true;
    private string? _error;
    private readonly DateTime _selectedDate = DateTime.Today;

    protected override async Task OnInitializedAsync()
    {
        try
        {
            var data = await SchedulerApi.GetEventsAsync();
            _events = data.Select(e => new SchedulerEvent
            {
                Id = e.Id,
                Subject = e.Subject,
                StartTime = e.StartTime,
                EndTime = e.EndTime,
                Description = e.Description,
            }).ToList();
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
}
