import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'material',
    loadChildren: () => import('./material').then((m) => m.provideFeatur({})),
  },
  {
    path: '',
    redirectTo: 'material',
    pathMatch: 'full',
  },
];
