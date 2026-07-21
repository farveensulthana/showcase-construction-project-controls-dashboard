import { Component, OnInit, signal } from '@angular/core';
import { ScheduleAllModule } from '@syncfusion/ej2-angular-schedule';
import { SchedulerService } from '../../core/services/scheduler.service';
import type { CalendarEventDto } from '../../core/models/api.models';

interface SchedulerEvent {
  Id: number;
  Subject: string;
  StartTime: string;
  EndTime: string;
  Location?: string;
  IsAllDay: boolean;
  Description?: string;
}

@Component({
  selector: 'app-calendar',
  imports: [ScheduleAllModule],
  templateUrl: './calendar.html',
  styleUrl: './calendar.css',
})
export class Calendar implements OnInit {
  events = signal<SchedulerEvent[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  readonly selectedDate = new Date();
  readonly views = ['Day', 'Week', 'WorkWeek', 'Month', 'Agenda'];
  readonly eventFields = {
    id: 'Id',
    subject: { name: 'Subject' },
    startTime: { name: 'StartTime' },
    endTime: { name: 'EndTime' },
    location: { name: 'Location' },
    description: { name: 'Description' },
    isAllDay: { name: 'IsAllDay' },
  };

  constructor(private schedulerApi: SchedulerService) {}

  ngOnInit(): void {
    this.schedulerApi.getEvents({ page: 1, pageSize: 200 }).subscribe({
      next: (data) => {
        this.events.set(
          (data as CalendarEventDto[]).map((event) => ({
            Id: event.id,
            Subject: event.subject,
            StartTime: event.startTime,
            EndTime: event.endTime,
            Location: event.location,
            IsAllDay: event.isAllDay,
            Description: event.description,
          })),
        );
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err instanceof Error ? err.message : 'Failed to load calendar events');
        this.loading.set(false);
      },
    });
  }

  get eventSettings() {
    return { dataSource: this.events(), fields: this.eventFields };
  }
}
