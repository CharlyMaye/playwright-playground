import { Routes } from '@angular/router';

export function provideFeature(options: {}) {
  const routes: Routes = [
    {
      path: '',
      loadComponent: () => import('./home.page/home.page').then((m) => m.HomePage),
    },
  ];

  return routes;
}
