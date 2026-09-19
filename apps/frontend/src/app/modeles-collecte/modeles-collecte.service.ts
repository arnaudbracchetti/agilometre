import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LigneBibliothequeModeleCollecteDto, ModeleCollecteDto } from '@agilometre/shared';

@Injectable({ providedIn: 'root' })
export class ModelesCollecteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/modeles-collecte';

  listerBibliotheque(): Observable<LigneBibliothequeModeleCollecteDto[]> {
    return this.http.get<LigneBibliothequeModeleCollecteDto[]>(this.baseUrl);
  }

  creerModele(nom: string): Observable<ModeleCollecteDto> {
    return this.http.post<ModeleCollecteDto>(this.baseUrl, { nom });
  }

  obtenirModele(id: string): Observable<ModeleCollecteDto> {
    return this.http.get<ModeleCollecteDto>(`${this.baseUrl}/${id}`);
  }

  renommerModele(id: string, nom: string): Observable<ModeleCollecteDto> {
    return this.http.patch<ModeleCollecteDto>(`${this.baseUrl}/${id}`, { nom });
  }

  dupliquerModele(id: string): Observable<ModeleCollecteDto> {
    return this.http.post<ModeleCollecteDto>(`${this.baseUrl}/${id}/dupliquer`, {});
  }

  supprimerModele(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  ajouterQuestion(
    id: string,
    questionId: string,
    position?: number,
  ): Observable<ModeleCollecteDto> {
    return this.http.post<ModeleCollecteDto>(`${this.baseUrl}/${id}/questions`, {
      questionId,
      position,
    });
  }

  ajouterTheme(
    id: string,
    questionIds: string[],
    position?: number,
  ): Observable<ModeleCollecteDto> {
    return this.http.post<ModeleCollecteDto>(`${this.baseUrl}/${id}/themes`, {
      questionIds,
      position,
    });
  }

  retirerQuestion(id: string, questionId: string): Observable<ModeleCollecteDto> {
    return this.http.delete<ModeleCollecteDto>(
      `${this.baseUrl}/${id}/questions/${questionId}`,
    );
  }

  reordonnerQuestion(
    id: string,
    questionId: string,
    position: number,
  ): Observable<ModeleCollecteDto> {
    return this.http.patch<ModeleCollecteDto>(
      `${this.baseUrl}/${id}/questions/${questionId}`,
      { position },
    );
  }
}
