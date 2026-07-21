using Construction.Core.DTOs;

namespace Construction.Core.Interfaces;

public interface ITaskService
{
    Task<PagedResponseDto<TaskDto>> GetTasksAsync(QueryParametersDto query, CancellationToken ct = default);
    Task<TaskDto?> GetTaskByIdAsync(int id, CancellationToken ct = default);
    Task<TaskDto> CreateTaskAsync(TaskCreateDto dto, CancellationToken ct = default);
    Task<TaskDto?> UpdateTaskAsync(int id, TaskUpdateDto dto, CancellationToken ct = default);
    Task<bool> DeleteTaskAsync(int id, CancellationToken ct = default);
}
