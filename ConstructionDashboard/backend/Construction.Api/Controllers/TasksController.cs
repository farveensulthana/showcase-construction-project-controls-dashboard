using Construction.Core.DTOs;
using Construction.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Construction.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TasksController : ControllerBase
{
    private readonly ITaskService _service;

    public TasksController(ITaskService service) => _service = service;

    [HttpGet]
    public async Task<ActionResult<PagedResponseDto<TaskDto>>> GetTasks([FromQuery] QueryParametersDto query, CancellationToken ct)
        => Ok(await _service.GetTasksAsync(query, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TaskDto>> GetTask(int id, CancellationToken ct)
    {
        var task = await _service.GetTaskByIdAsync(id, ct);
        return task is null ? NotFound() : Ok(task);
    }

    [HttpPost]
    public async Task<ActionResult<TaskDto>> CreateTask([FromBody] TaskCreateDto dto, CancellationToken ct)
    {
        var created = await _service.CreateTaskAsync(dto, ct);
        return CreatedAtAction(nameof(GetTask), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<TaskDto>> UpdateTask(int id, [FromBody] TaskUpdateDto dto, CancellationToken ct)
    {
        var updated = await _service.UpdateTaskAsync(id, dto, ct);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteTask(int id, CancellationToken ct)
        => await _service.DeleteTaskAsync(id, ct) ? NoContent() : NotFound();
}
