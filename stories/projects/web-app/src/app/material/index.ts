import { Routes } from '@angular/router';

export function provideFeature(options: {}) {
  const routes: Routes = [
    {
      path: '',
      loadComponent: () => import('./main-page/main.page').then((m) => m.MaterialMainPage),
      children: [
        {
          path: 'autocomplete',
          loadComponent: () =>
            import('./autocomplete.page/autocomplete.page').then((m) => m.AutocompletePage),
        },
        {
          path: 'button',
          loadComponent: () => import('./button.page/button.page').then((m) => m.ButtonPage),
        },
        {
          path: '',
          redirectTo: 'autocomplete',
          pathMatch: 'full',
        },
      ],
    },
  ];

  return routes;
}
