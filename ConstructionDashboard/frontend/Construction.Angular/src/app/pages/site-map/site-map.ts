import { Component, OnInit, signal } from '@angular/core';
import { MapsAllModule } from '@syncfusion/ej2-angular-maps';
import { ProjectsService } from '../../core/services/projects.service';

interface MarkerPoint {
  latitude: number;
  longitude: number;
  name: string;
  status: string;
  progress: number;
}

@Component({
  selector: 'app-site-map',
  imports: [MapsAllModule],
  templateUrl: './site-map.html',
  styleUrl: './site-map.css',
})
export class SiteMap implements OnInit {
  locations = signal<MarkerPoint[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  readonly zoomSettings = { enable: true, zoomFactor: 4, mouseWheelZoom: true };
  readonly mapsArea = { background: '#e5e7eb' };
  readonly titleSettings = { text: 'Project Locations', textStyle: { size: '18px' } };
  readonly tooltipSettings = { visible: true, format: '${name}<br/>Status: ${status}<br/>Progress: ${progress}%' };

  constructor(private projectsApi: ProjectsService) {}

  ngOnInit(): void {
    this.projectsApi.getLocations().subscribe({
      next: (data) => {
        this.locations.set(
          data.map((loc) => ({
            latitude: loc.latitude,
            longitude: loc.longitude,
            name: loc.name,
            status: loc.status ?? 'Active',
            progress: loc.progress,
          })),
        );
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err instanceof Error ? err.message : 'Failed to load site locations');
        this.loading.set(false);
      },
    });
  }
}
