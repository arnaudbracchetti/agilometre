import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  InfoSessionParticipantDto,
  JetonSessionDto,
  MoiParticipantDto,
} from '@agilometre/shared';

/**
 * Service séparé de SessionsService : routes publiques, sans compte, consommées par l'écran
 * participant. `obtenirMoi`/`voter` portent le Jeton en `Authorization: Bearer` (résolu par
 * `JetonParticipantGuard` côté backend) — pas d'intercepteur HTTP global pour deux routes
 * seulement, l'en-tête est construit ici à partir du Jeton fourni par l'appelant.
 */
@Injectable({ providedIn: 'root' })
export class ParticipantService {
  private readonly http = inject(HttpClient);

  rejoindre(code: string, jetonPrecedent?: string): Observable<JetonSessionDto> {
    return this.http.post<JetonSessionDto>('/api/participant/rejoindre', {
      code,
      jetonPrecedent,
    });
  }

  obtenirMoi(jeton: string): Observable<MoiParticipantDto> {
    return this.http.get<MoiParticipantDto>('/api/participant/moi', {
      headers: this.enteteAuth(jeton),
    });
  }

  obtenirInfoSession(jeton: string): Observable<InfoSessionParticipantDto> {
    return this.http.get<InfoSessionParticipantDto>(
      '/api/participant/info-session',
      { headers: this.enteteAuth(jeton) },
    );
  }

  voter(jeton: string, optionIndex: number): Observable<MoiParticipantDto> {
    return this.http.post<MoiParticipantDto>(
      '/api/participant/voter',
      { optionIndex },
      { headers: this.enteteAuth(jeton) },
    );
  }

  private enteteAuth(jeton: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${jeton}` });
  }
}
