using Construction.Blazor.Components;
using Construction.Blazor.Core;
using Construction.Blazor.Core.Interop;
using Construction.Blazor.Core.Services;
using Syncfusion.Blazor;
using Syncfusion.Licensing;

var builder = WebApplication.CreateBuilder(args);

var syncfusionLicenseKey = builder.Configuration["SyncfusionLicenseKey"];
if (!string.IsNullOrWhiteSpace(syncfusionLicenseKey))
{
    SyncfusionLicenseProvider.RegisterLicense(syncfusionLicenseKey);
}

// Add services to the container.
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

builder.Services.AddSyncfusionBlazor();
builder.Services.AddMemoryCache(); // required by Syncfusion.Blazor.SfPdfViewer.SfPdfViewer2

var apiBaseUrl = builder.Configuration["ApiBaseUrl"] ?? "http://localhost:5228/api";
builder.Services.AddHttpClient("ConstructionApi", client =>
{
    client.BaseAddress = new Uri(apiBaseUrl.EndsWith('/') ? apiBaseUrl : apiBaseUrl + "/");
});

builder.Services.AddScoped<ApiClient>();
builder.Services.AddScoped<ReportsService>();
builder.Services.AddScoped<ProjectsService>();
builder.Services.AddScoped<TasksService>();
builder.Services.AddScoped<RisksService>();
builder.Services.AddScoped<SchedulerService>();
builder.Services.AddScoped<ChangeOrdersService>();
builder.Services.AddScoped<RiskMatrixService>();

builder.Services.AddScoped<ThemeInterop>();
builder.Services.AddScoped<DownloadInterop>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
}
app.UseStatusCodePagesWithReExecute("/not-found", createScopeForStatusCodePages: true);
app.UseAntiforgery();

app.MapStaticAssets();
app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();
