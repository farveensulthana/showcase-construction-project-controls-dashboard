using Construction.Core.DTOs;

namespace Construction.Blazor.Core.Services;

public class TasksService(ApiClient api)
{
    public Task<PagedResponseDto<TaskDto>> GetTasksAsync(int page = 1, int pageSize = 200) =>
        api.GetJsonAsync<PagedResponseDto<TaskDto>>("tasks", new Dictionary<string, object?> { ["page"] = page, ["pageSize"] = pageSize });
}
