import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { AppHeader } from '../shell/header/app-header';
import { HeaderAuthActions } from '../shell/header/header-auth-actions';
import { LiensNavService } from '../shell/liens-nav.service';
import { CouleurStickyNote, StickyNote } from '../shared/sticky-note/sticky-note';

@Component({
  selector: 'app-home',
  imports: [NzButtonModule, NzIconModule, AppHeader, HeaderAuthActions, RouterLink, StickyNote],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  protected readonly liensNav = inject(LiensNavService).liens;

  protected readonly chiffresCles = [
    { valeur: '2', libelle: 'dispositifs complémentaires : séance et pouls' },
    { valeur: '60–120', libelle: 'questions dans un référentiel type' },
    { valeur: '4', libelle: 'paliers de maturité par thème' },
    { valeur: '0', libelle: 'lien conservé entre une réponse et son auteur' },
  ];

  // couleur : reprend dans l'ordre les 3 barres du pictogramme Insee (bleu, violet, magenta).
  protected readonly dispositifs: {
    icone: string;
    titre: string;
    texte: string;
    couleur: CouleurStickyNote;
    lien?: string;
  }[] = [
    {
      icone: 'schedule',
      titre: 'Séance animée',
      texte:
        'Le coach projette les questions, ouvre la discussion, puis fait voter l’équipe en direct, sur plusieurs tours si besoin.',
      couleur: 'blue',
      lien: '/sessions',
    },
    {
      icone: 'mail',
      titre: 'Campagne de pouls',
      texte:
        'Entre deux séances, un email régulier soumet une ou deux questions à chaque membre. La maturité se met à jour sans mobiliser personne.',
      couleur: 'violet',
    },
    {
      icone: 'team',
      titre: 'Restitutions par rôle',
      texte:
        'Coach, manager et direction voient chacun un niveau de détail différent — jamais la répartition brute au-delà de l’équipe.',
      couleur: 'magenta',
      lien: '/profil',
    },
  ];
}
