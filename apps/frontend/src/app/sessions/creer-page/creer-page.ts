import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { EntiteDto, EquipeDto, LigneBibliothequeModeleSessionDto, ModeleSessionDto } from '@agilometre/shared';
import { OrganisationService } from '../../organisation/organisation.service';
import { ModelesSessionService } from '../../modeles-session/modeles-session.service';
import { SessionsService } from '../sessions.service';

@Component({
  selector: 'app-creer-page',
  imports: [FormsModule, RouterLink, NzButtonModule, NzDatePickerModule, NzSelectModule, NzTagModule],
  templateUrl: './creer-page.html',
  styleUrl: './creer-page.scss',
})
export class CreerPage implements OnInit {
  private readonly organisationService = inject(OrganisationService);
  private readonly modelesSessionService = inject(ModelesSessionService);
  private readonly sessionsService = inject(SessionsService);
  private readonly message = inject(NzMessageService);
  private readonly router = inject(Router);

  protected readonly entites = signal<EntiteDto[]>([]);
  protected readonly equipesDeLEntite = signal<EquipeDto[]>([]);
  protected readonly modeles = signal<LigneBibliothequeModeleSessionDto[]>([]);
  protected readonly apercuModele = signal<ModeleSessionDto | null>(null);

  protected readonly entiteId = signal<string | null>(null);
  protected readonly equipeId = signal<string | null>(null);
  protected readonly date = signal<Date | null>(new Date());
  protected readonly modeleSessionId = signal<string | null>(null);

  protected readonly creationEnCours = signal(false);
  protected readonly chargementEquipesEnCours = signal(false);

  protected readonly formulaireValide = computed(
    () => this.equipeId() !== null && this.date() !== null && this.modeleSessionId() !== null,
  );

  ngOnInit(): void {
    this.organisationService.listerEntites().subscribe((entites) => this.entites.set(entites));
    this.modelesSessionService.listerBibliotheque().subscribe((modeles) => this.modeles.set(modeles));
  }

  protected onEntiteChange(entiteId: string | null): void {
    this.entiteId.set(entiteId);
    this.equipeId.set(null);
    this.equipesDeLEntite.set([]);
    if (!entiteId) {
      return;
    }
    this.chargementEquipesEnCours.set(true);
    this.organisationService.listerEquipesParEntite(entiteId).subscribe({
      next: (equipes) => {
        this.equipesDeLEntite.set(equipes);
        this.chargementEquipesEnCours.set(false);
      },
      error: () => {
        this.chargementEquipesEnCours.set(false);
        this.message.error('Impossible de charger les Équipes de cette Entité.');
      },
    });
  }

  protected onModeleChange(modeleSessionId: string | null): void {
    this.modeleSessionId.set(modeleSessionId);
    this.apercuModele.set(null);
    if (!modeleSessionId) {
      return;
    }
    this.modelesSessionService.obtenirModele(modeleSessionId).subscribe({
      next: (modele) => this.apercuModele.set(modele),
      error: () => this.message.error('Impossible de charger l’aperçu de ce Modèle.'),
    });
  }

  protected creer(): void {
    const equipeId = this.equipeId();
    const date = this.date();
    const modeleSessionId = this.modeleSessionId();
    if (!equipeId || !date || !modeleSessionId) {
      return;
    }
    this.creationEnCours.set(true);
    this.sessionsService.creer(equipeId, date.toISOString(), modeleSessionId).subscribe({
      next: (session) => {
        this.router.navigate(['/sessions', session.id]);
      },
      error: () => {
        this.creationEnCours.set(false);
        this.message.error('Impossible de créer cette Session.');
      },
    });
  }
}
