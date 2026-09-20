import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NZ_MODAL_DATA, NzModalModule, NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTimePickerModule } from 'ng-zorro-antd/time-picker';
import {
  CampagnePoulsDto,
  LigneBibliothequeModeleCollecteDto,
  ModeleCollecteDto,
} from '@agilometre/shared';
import { ModelesCollecteService } from '../../modeles-collecte/modeles-collecte.service';
import { CampagnePoulsService } from '../../pouls/campagne-pouls.service';
import { DialogActions } from '../../shared/dialog-actions/dialog-actions';
import { PanelParTheme } from '../../shared/panel-par-theme/panel-par-theme';

export interface DonneesCreerCampagnePage {
  equipeId: string;
}

interface JourSemaine {
  numero: number;
  libelle: string;
}

const JOURS_SEMAINE: JourSemaine[] = [
  { numero: 1, libelle: 'Lundi' },
  { numero: 2, libelle: 'Mardi' },
  { numero: 3, libelle: 'Mercredi' },
  { numero: 4, libelle: 'Jeudi' },
  { numero: 5, libelle: 'Vendredi' },
  { numero: 6, libelle: 'Samedi' },
  { numero: 7, libelle: 'Dimanche' },
];

/** Toujours ouverte comme contenu d'un `NzModalService.create(...)` — jamais routée (même patron que sessions/creer-page). */
@Component({
  selector: 'app-creer-campagne-page',
  imports: [
    FormsModule,
    DialogActions,
    NzCheckboxModule,
    NzInputNumberModule,
    NzModalModule,
    NzSelectModule,
    NzTimePickerModule,
    PanelParTheme,
  ],
  templateUrl: './creer-campagne-page.html',
  styleUrl: './creer-campagne-page.scss',
})
export class CreerCampagnePage implements OnInit {
  private readonly modelesCollecteService = inject(ModelesCollecteService);
  private readonly campagnePoulsService = inject(CampagnePoulsService);
  private readonly modal = inject(NzModalService);
  private readonly modalRef = inject(NzModalRef<CreerCampagnePage, CampagnePoulsDto>);
  private readonly data = inject<DonneesCreerCampagnePage>(NZ_MODAL_DATA);

  protected readonly equipeId: string = this.data.equipeId;

  protected readonly joursSemaine = JOURS_SEMAINE;
  protected readonly modeles = signal<LigneBibliothequeModeleCollecteDto[]>([]);
  protected readonly apercuModele = signal<ModeleCollecteDto | null>(null);

  protected readonly modeleCollecteId = signal<string | null>(null);
  protected readonly joursEnvoi = signal<number[]>([]);
  protected readonly heureEnvoi = signal<Date | null>(null);
  protected readonly questionsParEnvoi = signal<number>(1);

  protected readonly creationEnCours = signal(false);

  protected readonly formulaireValide = computed(
    () =>
      this.modeleCollecteId() !== null &&
      this.joursEnvoi().length > 0 &&
      this.heureEnvoi() !== null &&
      this.questionsParEnvoi() > 0,
  );

  ngOnInit(): void {
    this.modelesCollecteService.listerBibliotheque().subscribe((modeles) => this.modeles.set(modeles));
  }

  protected annuler(): void {
    this.modalRef.close();
  }

  protected onJourChange(numero: number, coche: boolean): void {
    this.joursEnvoi.update((jours) =>
      coche ? [...jours, numero] : jours.filter((jour) => jour !== numero),
    );
  }

  protected onModeleChange(modeleCollecteId: string | null): void {
    this.modeleCollecteId.set(modeleCollecteId);
    this.apercuModele.set(null);
    if (!modeleCollecteId) {
      return;
    }
    this.modelesCollecteService.obtenirModele(modeleCollecteId).subscribe({
      next: (modele) => this.apercuModele.set(modele),
      error: () =>
        this.modal.error({
          nzTitle: 'Erreur',
          nzContent: 'Impossible de charger l’aperçu de ce Modèle.',
        }),
    });
  }

  protected creer(): void {
    const modeleCollecteId = this.modeleCollecteId();
    const heureEnvoi = this.heureEnvoi();
    if (!this.formulaireValide() || !modeleCollecteId || !heureEnvoi) {
      return;
    }
    const minutesDepuisMinuit = heureEnvoi.getHours() * 60 + heureEnvoi.getMinutes();
    this.creationEnCours.set(true);
    this.campagnePoulsService
      .creer(
        this.equipeId,
        modeleCollecteId,
        this.joursEnvoi(),
        minutesDepuisMinuit,
        this.questionsParEnvoi(),
      )
      .subscribe({
        next: (campagne) => this.modalRef.close(campagne),
        error: () => {
          this.creationEnCours.set(false);
          this.modal.error({
            nzTitle: 'Erreur',
            nzContent: 'Impossible de créer cette Campagne de pouls.',
          });
        },
      });
  }
}
