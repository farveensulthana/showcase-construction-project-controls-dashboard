using Construction.Core.DTOs;

namespace Construction.Blazor.Core.Services;

public class SchedulerService(ApiClient api)
{
    public Task<List<AppointmentDto>> GetEventsAsync() =>
        api.GetJsonAsync<List<AppointmentDto>>("scheduler/appointments");
}
