import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzMessageService } from 'ng-zorro-antd/message';
import { EntiteDto } from '@agilometre/shared';
import { OrganisationService } from '../organisation.service';

@Component({
  selector: 'app-organisation-page',
  imports: [FormsModule, NzButtonModule, NzInputModule, NzListModule],
  templateUrl: './organisation-page.html',
  styleUrl: './organisation-page.scss',
})
export class OrganisationPage implements OnInit {
  private readonly organisationService = inject(OrganisationService);
  private readonly message = inject(NzMessageService);

  protected readonly entites = signal<EntiteDto[]>([]);
  protected readonly selectionId = signal<string | null>(null);
  protected readonly nouveauNom = signal('');
  protected readonly nomRenomme = signal('');
  protected readonly creationEnCours = signal(false);
  protected readonly renommageEnCours = signal(false);

  protected readonly entiteSelectionnee = computed(
    () => this.entites().find((entite) => entite.id === this.selectionId()) ?? null,
  );

  protected readonly renommagePossible = computed(() => {
    const entite = this.entiteSelectionnee();
    return entite !== null && this.nomRenomme().trim().length > 0 && this.nomRenomme().trim() !== entite.nom;
  });

  ngOnInit(): void {
    this.organisationService.listerEntites().subscribe((entites) => this.entites.set(entites));
  }

  protected selectionner(entite: EntiteDto): void {
    this.selectionId.set(entite.id);
    this.nomRenomme.set(entite.nom);
  }

  protected creer(): void {
    const nom = this.nouveauNom().trim();
    if (nom.length === 0) {
      return;
    }
    this.creationEnCours.set(true);
    this.organisationService.creerEntite(nom).subscribe({
      next: (entite) => {
        this.entites.update((entites) => [...entites, entite]);
        this.nouveauNom.set('');
        this.creationEnCours.set(false);
        this.selectionner(entite);
      },
      error: (erreur: HttpErrorResponse) => {
        this.creationEnCours.set(false);
        this.message.error(
          erreur.status === 409
            ? 'Une Entité porte déjà ce nom.'
            : 'Impossible de créer cette Entité.',
        );
      },
    });
  }

  protected renommer(): void {
    const entite = this.entiteSelectionnee();
    if (!entite || !this.renommagePossible()) {
      return;
    }
    const nom = this.nomRenomme().trim();
    this.renommageEnCours.set(true);
    this.organisationService.renommerEntite(entite.id, nom).subscribe({
      next: (entiteRenommee) => {
        this.entites.update((entites) =>
          entites.map((e) => (e.id === entiteRenommee.id ? entiteRenommee : e)),
        );
        this.renommageEnCours.set(false);
        this.message.success('Entité renommée.');
      },
      error: (erreur: HttpErrorResponse) => {
        this.renommageEnCours.set(false);
        this.message.error(
          erreur.status === 409
            ? 'Une Entité porte déjà ce nom.'
            : 'Impossible de renommer cette Entité.',
        );
      },
    });
  }
}
