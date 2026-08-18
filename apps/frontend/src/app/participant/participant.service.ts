import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { JetonSessionDto } from '@agilometre/shared';

/** Service séparé de SessionsService : route publique, sans compte, consommée par l'écran participant. */
@Injectable({ providedIn: 'root' })
export class ParticipantService {
  private readonly http = inject(HttpClient);

  rejoindre(code: string): Observable<JetonSessionDto> {
    return this.http.post<JetonSessionDto>('/api/participant/rejoindre', { code });
  }
}
