import { Component } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzCardModule } from 'ng-zorro-antd/card';

@Component({
  selector: 'app-home',
  imports: [NzButtonModule, NzIconModule, NzCardModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  protected readonly chiffresCles = [
    { valeur: '2', libelle: 'dispositifs complémentaires : séance et pouls' },
    { valeur: '60–120', libelle: 'questions dans un référentiel type' },
    { valeur: '4', libelle: 'paliers de maturité par thème' },
    { valeur: '0', libelle: 'lien conservé entre une réponse et son auteur' },
  ];

  protected readonly dispositifs = [
    {
      icone: 'schedule',
      titre: 'Séance animée',
      texte:
        'Le coach projette les questions, ouvre la discussion, puis fait voter l’équipe en direct, sur plusieurs tours si besoin.',
    },
    {
      icone: 'mail',
      titre: 'Campagne de pouls',
      texte:
        'Entre deux séances, un email régulier soumet une ou deux questions à chaque membre. La maturité se met à jour sans mobiliser personne.',
    },
    {
      icone: 'team',
      titre: 'Restitutions par rôle',
      texte:
        'Coach, manager et direction voient chacun un niveau de détail différent — jamais la répartition brute au-delà de l’équipe.',
    },
  ];
}
