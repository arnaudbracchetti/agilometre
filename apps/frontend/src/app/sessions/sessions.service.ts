import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LigneListeSessionDto, SessionDto } from '@agilometre/shared';

@Injectable({ providedIn: 'root' })
export class SessionsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/sessions';

  lister(): Observable<LigneListeSessionDto[]> {
    return this.http.get<LigneListeSessionDto[]>(this.baseUrl);
  }

  creer(equipeId: string, date: string, modeleSessionId: string): Observable<SessionDto> {
    return this.http.post<SessionDto>(this.baseUrl, { equipeId, date, modeleSessionId });
  }

  obtenir(id: string): Observable<SessionDto> {
    return this.http.get<SessionDto>(`${this.baseUrl}/${id}`);
  }

  ouvrir(id: string): Observable<SessionDto> {
    return this.http.post<SessionDto>(`${this.baseUrl}/${id}/ouvrir`, {});
  }

  modifierInfos(id: string, equipeId: string, date: string): Observable<SessionDto> {
    return this.http.patch<SessionDto>(`${this.baseUrl}/${id}`, { equipeId, date });
  }

  changerModele(id: string, modeleSessionId: string): Observable<SessionDto> {
    return this.http.patch<SessionDto>(`${this.baseUrl}/${id}/modele`, {
      modeleSessionId,
    });
  }

  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  ajouterQuestion(id: string, questionId: string, position?: number): Observable<SessionDto> {
    return this.http.post<SessionDto>(`${this.baseUrl}/${id}/questions`, {
      questionId,
      position,
    });
  }

  ajouterTheme(id: string, questionIds: string[], position?: number): Observable<SessionDto> {
    return this.http.post<SessionDto>(`${this.baseUrl}/${id}/themes`, {
      questionIds,
      position,
    });
  }

  retirerQuestion(id: string, questionId: string): Observable<SessionDto> {
    return this.http.delete<SessionDto>(`${this.baseUrl}/${id}/questions/${questionId}`);
  }

  reordonnerQuestion(id: string, questionId: string, position: number): Observable<SessionDto> {
    return this.http.patch<SessionDto>(`${this.baseUrl}/${id}/questions/${questionId}`, {
      position,
    });
  }
}
