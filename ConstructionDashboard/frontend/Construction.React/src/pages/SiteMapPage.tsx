import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import {
  Inject,
  LayerDirective,
  LayersDirective,
  MapsComponent,
  Marker,
  MarkerDirective,
  MarkersDirective,
  MapsTooltip,
  Zoom,
} from '@syncfusion/ej2-react-maps';
import { projectsApi } from '../api/reports';
import './SiteMapPage.css';

interface MarkerPoint {
  latitude: number;
  longitude: number;
  name: string;
  status?: string;
  progress: number;
}

export function SiteMapPage(): ReactElement {
  const [locations, setLocations] = useState<MarkerPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    projectsApi
      .getLocations()
      .then((data) => {
        if (!cancelled) {
          setLocations(
            data.map((loc) => ({
              latitude: loc.latitude,
              longitude: loc.longitude,
              name: loc.name,
              status: loc.status ?? 'Active',
              progress: loc.progress,
            }))
          );
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load site locations');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className='site-map-page'>
      <header className='page-header'>
        <h1>Site Map</h1>
        <p>Project and site locations with construction activity markers</p>
      </header>

      {loading && <div className='loading-state' aria-live='polite'>Loading site map…</div>}
      {error && <div className='alert alert-error' role='alert'>{error}</div>}

      {!loading && !error && (
        <div className='card map-card'>
          <MapsComponent
            id='site-map'
            zoomSettings={{ enable: true, zoomFactor: 4, mouseWheelZoom: true }}
            mapsArea={{ background: '#e5e7eb' }}
            titleSettings={{ text: 'Project Locations', textStyle: { size: '18px' } }}
          >
            <Inject services={[Marker, Zoom, MapsTooltip]} />
            <LayersDirective>
              <LayerDirective urlTemplate='https://tile.openstreetmap.org/level/tileX/tileY.png'>
                <MarkersDirective>
                  <MarkerDirective
                    dataSource={locations}
                    visible={true}
                    shape='Circle'
                    height={20}
                    width={20}
                    fill='#1976d2'
                    latitudeValuePath='latitude'
                    longitudeValuePath='longitude'
                    tooltipSettings={{
                      visible: true,
                      format: '${name}<br/>Status: ${status}<br/>Progress: ${progress}%',
                    }}
                  />
                </MarkersDirective>
              </LayerDirective>
            </LayersDirective>
          </MapsComponent>
        </div>
      )}
    </div>
  );
}
