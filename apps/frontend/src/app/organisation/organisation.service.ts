import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  EntiteDto,
  EquipeDto,
  LigneListeSessionDto,
  ProfilEntiteDto,
  ProfilEquipeDto,
} from '@agilometre/shared';

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

  supprimerEntite(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/entites/${id}`);
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
    prenom: string | null,
    email: string,
  ): Observable<EquipeDto> {
    return this.http.post<EquipeDto>(
      `${this.baseUrl}/equipes/${equipeId}/membres`,
      { nom, prenom, email },
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

  obtenirProfilEntite(
    entiteId: string,
    offset = 0,
  ): Observable<ProfilEntiteDto> {
    return this.http.get<ProfilEntiteDto>(
      `${this.baseUrl}/entites/${entiteId}/profil`,
      { params: new HttpParams().set('offset', offset) },
    );
  }

  modifierMembre(
    equipeId: string,
    membreId: string,
    nom: string,
    prenom: string | null,
    email: string,
  ): Observable<EquipeDto> {
    return this.http.patch<EquipeDto>(
      `${this.baseUrl}/equipes/${equipeId}/membres/${membreId}`,
      { nom, prenom, email },
    );
  }

  /** Rafraîchit une Équipe après une mutation dont la réponse HTTP n'est pas l'EquipeDto à jour —
   * ex. créer un compte depuis une ligne de roster, dont la réponse est un UtilisateurDto. */
  obtenirEquipe(id: string): Observable<EquipeDto> {
    return this.http.get<EquipeDto>(`${this.baseUrl}/equipes/${id}`);
  }

  listerSessionsEquipe(equipeId: string): Observable<LigneListeSessionDto[]> {
    return this.http.get<LigneListeSessionDto[]>(
      `${this.baseUrl}/equipes/${equipeId}/sessions`,
    );
  }
}
