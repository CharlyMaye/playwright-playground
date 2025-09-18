import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'material',
    loadChildren: () => import('./material').then((m) => m.provideFeature({})),
  },
  {
    path: 'home',
    loadChildren: () => import('./home').then((m) => m.provideFeature({})),
  },
  {
    path: '',
    redirectTo: 'material',
    pathMatch: 'full',
  },
];
