import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import {
  Agenda,
  Day,
  Inject,
  Month,
  ScheduleComponent,
  Week,
  WorkWeek,
} from '@syncfusion/ej2-react-schedule';
import { schedulerApi } from '../api/reports';
import type { CalendarEventDto } from '../types';
import './CalendarPage.css';

interface SchedulerEvent {
  Id: number;
  Subject: string;
  StartTime: string;
  EndTime: string;
  Location?: string;
  IsAllDay: boolean;
  Description?: string;
}

export function CalendarPage(): ReactElement {
  const [events, setEvents] = useState<SchedulerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    schedulerApi
      .getEvents({ page: 1, pageSize: 200 })
      .then((data) => {
        if (!cancelled) {
          setEvents(
            (data as CalendarEventDto[]).map((event) => ({
              Id: event.id,
              Subject: event.subject,
              StartTime: event.startTime,
              EndTime: event.endTime,
              Location: event.location,
              IsAllDay: event.isAllDay,
              Description: event.description,
            }))
          );
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load calendar events');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className='calendar-page'>
      <header className='page-header'>
        <h1>Calendar</h1>
        <p>Milestones, inspections, meetings, and scheduled site activities</p>
      </header>

      {loading && <div className='loading-state' aria-live='polite'>Loading calendar…</div>}
      {error && <div className='alert alert-error' role='alert'>{error}</div>}

      {!loading && !error && (
        <div className='card schedule-card'>
          <ScheduleComponent
            height='650px'
            selectedDate={new Date()}
            currentView='Month'
            eventSettings={{
              dataSource: events,
              fields: {
                id: 'Id',
                subject: { name: 'Subject' },
                startTime: { name: 'StartTime' },
                endTime: { name: 'EndTime' },
                location: { name: 'Location' },
                description: { name: 'Description' },
                isAllDay: { name: 'IsAllDay' },
              },
            }}
            views={['Day', 'Week', 'WorkWeek', 'Month', 'Agenda']}
          >
            <Inject services={[Day, Week, WorkWeek, Month, Agenda]} />
          </ScheduleComponent>
        </div>
      )}
    </div>
  );
}
