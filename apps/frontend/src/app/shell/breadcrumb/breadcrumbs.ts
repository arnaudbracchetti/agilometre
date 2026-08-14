import { ActivatedRouteSnapshot } from '@angular/router';

export interface Breadcrumb {
  label: string;
  url: string;
}

/**
 * Marche l'arbre des ActivatedRouteSnapshot plutôt que celui des ActivatedRoute vivants : ces
 * derniers peuvent être incomplets pendant la construction du composant qui les injecte (le
 * snapshot, lui, est toujours entièrement peuplé une fois la navigation résolue).
 */
export function buildBreadcrumbs(
  route: ActivatedRouteSnapshot,
  url = '',
  breadcrumbs: Breadcrumb[] = [],
): Breadcrumb[] {
  const firstChild = route.firstChild;
  if (!firstChild) {
    return breadcrumbs;
  }

  const routeUrl = firstChild.url.map((segment) => segment.path).join('/');
  const nextUrl = routeUrl ? `${url}/${routeUrl}` : url;
  const label = firstChild.data['breadcrumb'] as string | undefined;
  if (label) {
    breadcrumbs.push({ label, url: nextUrl });
  }

  return buildBreadcrumbs(firstChild, nextUrl, breadcrumbs);
}
