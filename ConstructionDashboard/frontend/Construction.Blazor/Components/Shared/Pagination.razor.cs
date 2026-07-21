using Microsoft.AspNetCore.Components;

namespace Construction.Blazor.Components.Shared;

public partial class Pagination : ComponentBase
{
    [Parameter, EditorRequired] public int Page { get; set; }
    [Parameter, EditorRequired] public int PageSize { get; set; }
    [Parameter, EditorRequired] public int TotalCount { get; set; }
    [Parameter] public EventCallback<int> PageChanged { get; set; }

    private int TotalPages => Math.Max(1, (int)Math.Ceiling(TotalCount / (double)PageSize));
}
