import { Component, Input, Output, EventEmitter, OnChanges, OnDestroy, AfterViewInit, SimpleChanges, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { MapItemsService, MarkerDto } from '../services/mapitems.service';

export interface MapClickEvent {
  lat: number;
  lng: number;
}

declare const L: any;

@Component({
  selector: 'app-map',
  standalone: true,
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss'
})
export class MapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() sessionId = '';
  @Output() mapClick = new EventEmitter<MapClickEvent>();

  private readonly mapItems = inject(MapItemsService);

  private map: any;
  private leafletMarkers = new Map<number, any>();
  private subs: Subscription[] = [];
  private currentSessionId = '';

  ngAfterViewInit(): void {
    this.map = L.map('osm-map', { zoomControl: false }).setView([52.2297, 21.0122], 6);
    L.maplibreGL({
      style: 'https://tiles.openfreemap.org/styles/liberty',
      attribution: '&copy; <a href="https://openfreemap.org">OpenFreeMap</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    this.map.on('click', (e: any) => this.onMapClick(e));

    this.subs.push(
      this.mapItems.markers$.subscribe(markers => this.loadMarkers(markers)),
      this.mapItems.marker$.subscribe(marker => this.addLeafletMarker(marker))
    );
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (!changes['sessionId'] || !this.map) return;

    if (this.currentSessionId) {
      await this.mapItems.leaveSession(this.currentSessionId);
      this.clearMarkers();
    }

    this.currentSessionId = this.sessionId;

    if (this.sessionId) {
      await this.mapItems.connect();
      await this.mapItems.joinSession(this.sessionId);
    }
  }

  ngOnDestroy(): void {
    if (this.currentSessionId) {
      this.mapItems.leaveSession(this.currentSessionId);
    }
    this.subs.forEach(s => s.unsubscribe());
    if (this.map) {
      this.map.remove();
    }
  }

  private onMapClick(e: any): void {
    if (!this.currentSessionId) return;
    this.mapClick.emit({ lat: e.latlng.lat, lng: e.latlng.lng });
  }

  private loadMarkers(markers: MarkerDto[]): void {
    this.clearMarkers();
    markers.forEach(m => this.addLeafletMarker(m));
  }

  private addLeafletMarker(marker: MarkerDto): void {
    if (this.leafletMarkers.has(marker.id)) return;
    const popup = marker.description
      ? `<b>${marker.name}</b><br>${marker.description}`
      : marker.name;
    const lm = L.marker([marker.latitude, marker.longitude])
      .addTo(this.map)
      .bindPopup(popup);
    this.leafletMarkers.set(marker.id, lm);
  }

  private clearMarkers(): void {
    this.leafletMarkers.forEach(lm => lm.remove());
    this.leafletMarkers.clear();
  }
}
