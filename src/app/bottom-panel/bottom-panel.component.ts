import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MapItemsService } from '../services/mapitems.service';
import { MapClickEvent } from '../map/map.component';

@Component({
  selector: 'app-bottom-panel',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './bottom-panel.component.html',
  styleUrl: './bottom-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BottomPanelComponent implements OnChanges {
  @Input() sessionId = '';
  @Input() coords: MapClickEvent | null = null;
  @Output() coordsConsumed = new EventEmitter<void>();

  private readonly mapItems = inject(MapItemsService);

  nameInput = '';
  descriptionInput = '';
  isSubmitting = signal(false);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['coords'] && !this.coords) {
      this.nameInput = '';
      this.descriptionInput = '';
    }
  }

  canSubmit(): boolean {
    return !!this.sessionId && !!this.coords && !!this.nameInput.trim() && !this.isSubmitting();
  }

  async addMarker(): Promise<void> {
    if (!this.canSubmit() || !this.coords) return;

    this.isSubmitting.set(true);
    try {
      await this.mapItems.addMarker(
        this.sessionId,
        this.nameInput.trim(),
        this.descriptionInput.trim() || null,
        this.coords.lat,
        this.coords.lng
      );
      this.nameInput = '';
      this.descriptionInput = '';
      this.coordsConsumed.emit();
    } finally {
      this.isSubmitting.set(false);
    }
  }

  formatCoord(value: number): string {
    return value.toFixed(4);
  }
}
