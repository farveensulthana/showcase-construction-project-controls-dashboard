using Microsoft.AspNetCore.Components;
using Syncfusion.Blazor.Grids;

namespace Construction.Blazor.Components.Pages;

public partial class Documents : ComponentBase
{
    [Inject] private ProjectsService ProjectsApi { get; set; } = default!;

    private const int SampleDocumentId = 1;
    private const string SamplePdfUrl = "https://cdn.syncfusion.com/content/pdf/pdf-succinctly.pdf";

    private List<RecentDocumentDto> _documents = [];
    private RecentDocumentDto? _selectedDocument;
    private bool _loading = true;
    private string? _error;

    protected override async Task OnInitializedAsync()
    {
        try
        {
            var data = await ProjectsApi.GetRecentDocumentsAsync(SampleDocumentId, 365, 50);
            _documents = data;
            _selectedDocument = data.FirstOrDefault();
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

    private void OnRowSelected(RowSelectEventArgs<RecentDocumentDto> args)
    {
        _selectedDocument = args.Data;
    }
}
