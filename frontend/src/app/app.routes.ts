import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard, subscriptionGuard } from './core/auth/auth.guard';
import { Shell } from './shared/components/shell/shell';

export const routes: Routes = [
  // Rutas públicas
{
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
  },

  // Rutas dentro del shell (requieren login)
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      // La pantalla de suscripción solo requiere login (no suscripción activa), pero es solo para administradores.
      {
        path: 'subscription',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/subscription/subscription').then((m) => m.SubscriptionPage),
      },
      // El resto exige suscripción activa
      {
        path: 'dashboard',
        canActivate: [subscriptionGuard],
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'clients',
        canActivate: [subscriptionGuard],
        loadComponent: () => import('./features/clients/clients').then((m) => m.Clients),
      },
      {
        path: 'vehicles',
        canActivate: [subscriptionGuard],
        loadComponent: () => import('./features/vehicles/vehicles').then((m) => m.Vehicles),
      },
      {
        path: 'employees',
        canActivate: [subscriptionGuard, adminGuard],
        loadComponent: () => import('./features/employees/employees').then((m) => m.Employees),
      },
      {
        path: 'users',
        canActivate: [subscriptionGuard, adminGuard],
        loadComponent: () => import('./features/users/users').then((m) => m.Users),
      },
      {
        path: 'services',
        canActivate: [subscriptionGuard],
        loadComponent: () => import('./features/services/services').then((m) => m.Services),
      },
      {
        path: 'appointments',
        canActivate: [subscriptionGuard],
        loadComponent: () => import('./features/appointments/appointments').then((m) => m.Appointments),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },

  { path: '**', redirectTo: '' },
];
