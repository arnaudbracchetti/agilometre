import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProjectionSessionDto } from '@agilometre/shared';

/** Service séparé de SessionsService : route publique, sans compte, consommée par un écran hors shell. */
@Injectable({ providedIn: 'root' })
export class ProjectionService {
  private readonly http = inject(HttpClient);

  obtenir(sessionId: string): Observable<ProjectionSessionDto> {
    return this.http.get<ProjectionSessionDto>(`/api/projection/${sessionId}`);
  }
}
