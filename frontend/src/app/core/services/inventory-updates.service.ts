import { DestroyRef, Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

// 2026-11-27：付款通知即時重讀庫存，前景頁面每 60 秒補查。
@Injectable({ providedIn: 'root' })
export class InventoryUpdatesService {
  readonly changes = new Subject<void>();
  private readonly destroyRef = inject(DestroyRef);
  constructor() {
    if (typeof window === 'undefined') return;
    const source = typeof EventSource === 'undefined' ? null : new EventSource(environment.apiBaseUrl + '/inventory-events');
    if (source) { source.onmessage = () => this.changes.next(); source.onopen = () => this.changes.next(); }
    const timer = window.setInterval(() => { if (!document.hidden) this.changes.next(); }, 60000);
    const onVisible = () => { if (!document.hidden) this.changes.next(); };
    document.addEventListener('visibilitychange', onVisible);
    this.destroyRef.onDestroy(() => { source?.close(); window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); this.changes.complete(); });
  }
}
