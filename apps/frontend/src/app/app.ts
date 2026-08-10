import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterOutlet } from '@angular/router';
import { interval, switchMap, startWith, catchError, of } from 'rxjs';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTagModule } from 'ng-zorro-antd/tag';

interface HealthResponse {
  status: string;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NzCardModule, NzTagModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('Agilomètre');
  protected readonly health = signal<'checking' | 'ok' | 'down'>('checking');

  private readonly http = inject(HttpClient);

  constructor() {
    interval(2000)
      .pipe(
        startWith(0),
        switchMap(() => this.http.get<HealthResponse>('/api/health')),
        catchError(() => of(null)),
      )
      .subscribe((response) => {
        this.health.set(response?.status === 'ok' ? 'ok' : 'down');
      });
  }
}
