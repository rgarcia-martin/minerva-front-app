import { Component, OnInit, inject, signal } from '@angular/core';

import { ApiHealth, HealthService } from '../../core/api/health.service';

type DashboardState = 'idle' | 'loading' | 'ready';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private readonly health = inject(HealthService);

  protected readonly state = signal<DashboardState>('idle');
  protected readonly healthState = signal<ApiHealth | null>(null);

  ngOnInit(): void {
    this.refresh();
  }

  protected refresh(): void {
    this.state.set('loading');
    this.health.ping().subscribe((result) => {
      this.healthState.set(result);
      this.state.set('ready');
    });
  }
}
