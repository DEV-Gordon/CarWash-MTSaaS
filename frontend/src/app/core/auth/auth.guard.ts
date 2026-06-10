import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// Bloquea rutas si el usuario no ha iniciado sesión.
// Una sesión sin negocio asociado (ej. superadmin de Django) no es usable en la
// app: se cierra y se redirige al login en lugar de dejar la UI en un estado roto.
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated() && auth.business()) return true;
  if (auth.isAuthenticated()) {
    auth.logout();
    return false;
  }
  router.navigate(['/login']);
  return false;
};

// Bloquea rutas protegidas si la suscripción no está activa (ni en prueba).
export const subscriptionGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isSubscriptionActive()) return true;
  router.navigate(['/subscription']);
  return false;
};

// Restringe rutas solo a administradores (admin / superadmin).
// Un empleado autenticado es redirigido al dashboard.
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }
  if (auth.isAdmin()) return true;
  router.navigate(['/dashboard']);
  return false;
};

// Evita que un usuario ya autenticado entre a login/registro.
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) return true;
  router.navigate(['/dashboard']);
  return false;
};
