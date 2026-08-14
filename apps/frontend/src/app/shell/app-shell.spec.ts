import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Component } from '@angular/core';
import { AppShell } from './app-shell';

@Component({ selector: 'app-stub', template: 'stub' })
class StubPage {}

describe('AppShell', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: '',
            component: AppShell,
            children: [{ path: 'organisation', data: { breadcrumb: 'Organisation' }, component: StubPage }],
          },
        ]),
      ],
    });
  });

  it('assemble le bandeau applicatif, le fil d’Ariane et le contenu routé', async () => {
    const harness = await RouterTestingHarness.create('/organisation');

    expect(harness.routeNativeElement!.querySelector('.app-header')).toBeTruthy();
    expect(harness.routeNativeElement!.querySelector('.app-breadcrumb')).toBeTruthy();
    expect(harness.routeNativeElement!.querySelector('app-stub')).toBeTruthy();
  });

  it('marque le lien de navigation « Organisation » actif', async () => {
    const harness = await RouterTestingHarness.create('/organisation');

    const link: HTMLElement = harness.routeNativeElement!.querySelector('.app-header__nav a')!;
    expect(link.classList).toContain('app-header__link--active');
  });
});
