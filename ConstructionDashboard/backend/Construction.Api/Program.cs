using Construction.Infrastructure.Data;
using Construction.Core.Interfaces;
using Construction.Infrastructure.Repositories;
using Construction.Infrastructure.Services;
using Construction.Infrastructure.Seed;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

// Configure PostgreSQL DbContext
builder.Services.AddDbContext<ConstructionDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IProjectRepository, ProjectRepository>();
builder.Services.AddScoped<ITaskRepository, TaskRepository>();
builder.Services.AddScoped<IRfiRepository, RfiRepository>();
builder.Services.AddScoped<ISubmittalRepository, SubmittalRepository>();
builder.Services.AddScoped<IInspectionRepository, InspectionRepository>();
builder.Services.AddScoped<IBudgetRepository, BudgetRepository>();
builder.Services.AddScoped<IChangeOrderRepository, ChangeOrderRepository>();
builder.Services.AddScoped<IDocumentRepository, DocumentRepository>();
builder.Services.AddScoped<IRiskRepository, RiskRepository>();
builder.Services.AddScoped<IMilestoneRepository, MilestoneRepository>();

builder.Services.AddScoped<IProjectService, ProjectService>();
builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<IRfiService, RfiService>();
builder.Services.AddScoped<ISubmittalService, SubmittalService>();
builder.Services.AddScoped<IInspectionService, InspectionService>();
builder.Services.AddScoped<IBudgetService, BudgetService>();
builder.Services.AddScoped<IChangeOrderService, ChangeOrderService>();
builder.Services.AddScoped<IDocumentService, DocumentService>();
builder.Services.AddScoped<IRiskService, RiskService>();
builder.Services.AddScoped<IMilestoneService, MilestoneService>();
builder.Services.AddScoped<IReportService, ReportService>();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddSwaggerGen();

// Add CORS for frontend access
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowLocalhost", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176",
                "http://localhost:4200", "http://localhost:4201", "http://localhost:4202", "http://localhost:4203", "http://localhost:4204", "http://localhost:4205")
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    // Apply migrations and seed database in Development
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ConstructionDbContext>();
    await db.Database.MigrateAsync();
    var forceSeed = bool.TryParse(builder.Configuration["ForceSeed"], out var fs) && fs;
    await DatabaseSeeder.SeedAsync(db, forceSeed);

    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "Construction API v1");
        options.RoutePrefix = string.Empty; // Swagger at root
    });
}

app.UseCors("AllowLocalhost");

app.UseAuthorization();

app.MapControllers();

await app.RunAsync();
