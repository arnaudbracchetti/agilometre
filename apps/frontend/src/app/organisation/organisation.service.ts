import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EntiteDto, EquipeDto, ProfilEquipeDto } from '@agilometre/shared';

@Injectable({ providedIn: 'root' })
export class OrganisationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/organisation';

  listerEntites(): Observable<EntiteDto[]> {
    return this.http.get<EntiteDto[]>(`${this.baseUrl}/entites`);
  }

  creerEntite(nom: string): Observable<EntiteDto> {
    return this.http.post<EntiteDto>(`${this.baseUrl}/entites`, { nom });
  }

  renommerEntite(id: string, nom: string): Observable<EntiteDto> {
    return this.http.patch<EntiteDto>(`${this.baseUrl}/entites/${id}`, { nom });
  }

  listerEquipesParEntite(entiteId: string): Observable<EquipeDto[]> {
    return this.http.get<EquipeDto[]>(
      `${this.baseUrl}/entites/${entiteId}/equipes`,
    );
  }

  creerEquipe(nom: string, entiteId: string): Observable<EquipeDto> {
    return this.http.post<EquipeDto>(`${this.baseUrl}/equipes`, {
      nom,
      entiteId,
    });
  }

  renommerEquipe(id: string, nom: string): Observable<EquipeDto> {
    return this.http.patch<EquipeDto>(`${this.baseUrl}/equipes/${id}`, {
      nom,
    });
  }

  supprimerEquipe(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/equipes/${id}`);
  }

  ajouterMembre(
    equipeId: string,
    nom: string,
    email: string,
  ): Observable<EquipeDto> {
    return this.http.post<EquipeDto>(
      `${this.baseUrl}/equipes/${equipeId}/membres`,
      { nom, email },
    );
  }

  retirerMembre(equipeId: string, membreId: string): Observable<EquipeDto> {
    return this.http.delete<EquipeDto>(
      `${this.baseUrl}/equipes/${equipeId}/membres/${membreId}`,
    );
  }

  obtenirProfil(equipeId: string, offset = 0): Observable<ProfilEquipeDto> {
    return this.http.get<ProfilEquipeDto>(
      `${this.baseUrl}/equipes/${equipeId}/profil`,
      { params: new HttpParams().set('offset', offset) },
    );
  }

  modifierMembre(
    equipeId: string,
    membreId: string,
    nom: string,
    email: string,
  ): Observable<EquipeDto> {
    return this.http.patch<EquipeDto>(
      `${this.baseUrl}/equipes/${equipeId}/membres/${membreId}`,
      { nom, email },
    );
  }
}
