import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  LigneListeSessionDto,
  PilotageSessionDto,
  SessionDto,
  SyntheseSessionDto,
} from '@agilometre/shared';

@Injectable({ providedIn: 'root' })
export class SessionsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/sessions';

  lister(): Observable<LigneListeSessionDto[]> {
    return this.http.get<LigneListeSessionDto[]>(this.baseUrl);
  }

  creer(equipeId: string, date: string, modeleCollecteId: string): Observable<SessionDto> {
    return this.http.post<SessionDto>(this.baseUrl, { equipeId, date, modeleCollecteId });
  }

  obtenir(id: string): Observable<SessionDto> {
    return this.http.get<SessionDto>(`${this.baseUrl}/${id}`);
  }

  ouvrir(id: string): Observable<SessionDto> {
    return this.http.post<SessionDto>(`${this.baseUrl}/${id}/ouvrir`, {});
  }

  obtenirPilotage(id: string): Observable<PilotageSessionDto> {
    return this.http.get<PilotageSessionDto>(`${this.baseUrl}/${id}/pilotage`);
  }

  obtenirSynthese(id: string): Observable<SyntheseSessionDto> {
    return this.http.get<SyntheseSessionDto>(`${this.baseUrl}/${id}/synthese`);
  }

  passerQuestionSuivante(id: string): Observable<PilotageSessionDto> {
    return this.http.post<PilotageSessionDto>(
      `${this.baseUrl}/${id}/passer-question-suivante`,
      {},
    );
  }

  terminerSession(id: string): Observable<PilotageSessionDto> {
    return this.http.post<PilotageSessionDto>(`${this.baseUrl}/${id}/terminer`, {});
  }

  ouvrirTour(id: string): Observable<PilotageSessionDto> {
    return this.http.post<PilotageSessionDto>(`${this.baseUrl}/${id}/ouvrir-tour`, {});
  }

  clorerTour(id: string): Observable<PilotageSessionDto> {
    return this.http.post<PilotageSessionDto>(`${this.baseUrl}/${id}/clore-tour`, {});
  }

  sauterQuestion(id: string, questionId: string): Observable<PilotageSessionDto> {
    return this.http.post<PilotageSessionDto>(
      `${this.baseUrl}/${id}/questions/${questionId}/sauter`,
      {},
    );
  }

  reactiverQuestion(id: string, questionId: string): Observable<PilotageSessionDto> {
    return this.http.post<PilotageSessionDto>(
      `${this.baseUrl}/${id}/questions/${questionId}/reactiver`,
      {},
    );
  }

  terminerPrematurement(id: string): Observable<PilotageSessionDto> {
    return this.http.post<PilotageSessionDto>(
      `${this.baseUrl}/${id}/terminer-prematurement`,
      {},
    );
  }

  modifierInfos(id: string, equipeId: string, date: string): Observable<SessionDto> {
    return this.http.patch<SessionDto>(`${this.baseUrl}/${id}`, { equipeId, date });
  }

  changerModele(id: string, modeleCollecteId: string): Observable<SessionDto> {
    return this.http.patch<SessionDto>(`${this.baseUrl}/${id}/modele`, {
      modeleCollecteId,
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
