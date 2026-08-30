import { Directive, Input, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { Capacite } from '@agilometre/shared';
import { DroitsService } from './droits.service';

/**
 * `*aDroit="'capacite'"` — raccourci syntaxique sur `DroitsService.peut()`, sans logique propre
 * (docs/design/agregat-politique-des-droits.md §2). Syntaxe fixée par le design doc, sans préfixe
 * `app` (même convention que les directives structurelles natives `*ngIf`/`*ngFor`).
 */
// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: '[aDroit]' })
export class ADroit {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly droits = inject(DroitsService);

  @Input() set aDroit(capacite: Capacite) {
    this.viewContainer.clear();
    if (this.droits.peut(capacite)) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}
