import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LigneBibliothequeModeleSessionDto, ModeleSessionDto } from '@agilometre/shared';

@Injectable({ providedIn: 'root' })
export class ModelesSessionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/modeles-session';

  listerBibliotheque(): Observable<LigneBibliothequeModeleSessionDto[]> {
    return this.http.get<LigneBibliothequeModeleSessionDto[]>(this.baseUrl);
  }

  creerModele(nom: string): Observable<ModeleSessionDto> {
    return this.http.post<ModeleSessionDto>(this.baseUrl, { nom });
  }

  obtenirModele(id: string): Observable<ModeleSessionDto> {
    return this.http.get<ModeleSessionDto>(`${this.baseUrl}/${id}`);
  }

  renommerModele(id: string, nom: string): Observable<ModeleSessionDto> {
    return this.http.patch<ModeleSessionDto>(`${this.baseUrl}/${id}`, { nom });
  }

  dupliquerModele(id: string): Observable<ModeleSessionDto> {
    return this.http.post<ModeleSessionDto>(`${this.baseUrl}/${id}/dupliquer`, {});
  }

  supprimerModele(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  ajouterQuestion(
    id: string,
    questionId: string,
    position?: number,
  ): Observable<ModeleSessionDto> {
    return this.http.post<ModeleSessionDto>(`${this.baseUrl}/${id}/questions`, {
      questionId,
      position,
    });
  }

  ajouterTheme(
    id: string,
    questionIds: string[],
    position?: number,
  ): Observable<ModeleSessionDto> {
    return this.http.post<ModeleSessionDto>(`${this.baseUrl}/${id}/themes`, {
      questionIds,
      position,
    });
  }

  retirerQuestion(id: string, questionId: string): Observable<ModeleSessionDto> {
    return this.http.delete<ModeleSessionDto>(
      `${this.baseUrl}/${id}/questions/${questionId}`,
    );
  }

  reordonnerQuestion(
    id: string,
    questionId: string,
    position: number,
  ): Observable<ModeleSessionDto> {
    return this.http.patch<ModeleSessionDto>(
      `${this.baseUrl}/${id}/questions/${questionId}`,
      { position },
    );
  }
}
