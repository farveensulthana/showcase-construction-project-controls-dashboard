using Microsoft.AspNetCore.Components;

namespace Construction.Blazor.Components.Pages;

public partial class SiteMap : ComponentBase
{
    [Inject] private ProjectsService ProjectsApi { get; set; } = default!;

    public class MarkerPoint
    {
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string Name { get; set; } = "";
        public string Status { get; set; } = "";
        public int Progress { get; set; }
    }

    private List<MarkerPoint> _locations = [];
    private bool _loading = true;
    private string? _error;

    protected override async Task OnInitializedAsync()
    {
        try
        {
            var data = await ProjectsApi.GetLocationsAsync();
            _locations = data.Select(loc => new MarkerPoint
            {
                Latitude = loc.Latitude,
                Longitude = loc.Longitude,
                Name = loc.Name,
                Status = loc.Status ?? "Active",
                Progress = loc.Progress,
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
