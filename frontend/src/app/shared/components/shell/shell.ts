import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

interface NavItem { label: string; path: string; icon: string; adminOnly?: boolean; }

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  private auth = inject(AuthService);

  readonly user = this.auth.user;
  readonly business = this.auth.business;
  readonly status = this.auth.subscriptionStatus;
  readonly subscription = this.auth.subscription;
  readonly sidebarOpen = signal(false);

  // El banner solo aparece en prueba o cuando la suscripción no está plenamente activa.
  readonly showBanner = computed(() => {
    const s = this.status();
    return s === 'trial' || s === 'expired' || s === 'suspended' || s === 'none';
  });

  readonly bannerText = computed(() => {
    const sub = this.subscription();
    switch (this.status()) {
      case 'trial':
        return sub
          ? `Estás en período de prueba · ${sub.days_remaining} día(s) restante(s).`
          : 'Estás en período de prueba.';
      case 'expired':   return 'Tu suscripción ha vencido. Renueva para seguir usando todas las funciones.';
      case 'suspended': return 'Tu suscripción está suspendida. Contacta a soporte.';
      case 'none':      return 'No tienes una suscripción activa.';
      default:          return '';
    }
  });

  // Menú completo. Los ítems marcados adminOnly solo se muestran a administradores.
  private readonly allNav: NavItem[] = [
    { label: 'Dashboard',    path: '/dashboard',    icon: 'grid' },
    { label: 'Citas',        path: '/appointments', icon: 'calendar' },
    { label: 'Clientes',     path: '/clients',      icon: 'users' },
    { label: 'Vehículos',    path: '/vehicles',     icon: 'car' },
    { label: 'Empleados',    path: '/employees',    icon: 'badge', adminOnly: true },
    { label: 'Equipo',       path: '/users',        icon: 'team', adminOnly: true },
    { label: 'Servicios',    path: '/services',     icon: 'spark' },
    { label: 'Suscripción',  path: '/subscription', icon: 'card', adminOnly: true },
  ];

  // El menú visible depende del rol: los empleados no ven los ítems de administración.
  readonly nav = computed(() => {
    const admin = this.auth.isAdmin();
    return this.allNav.filter((item) => admin || !item.adminOnly);
  });

  readonly initials = computed(() => {
    const name = this.user()?.full_name || this.user()?.username || '?';
    return name.trim().slice(0, 2).toUpperCase();
  });

  toggleSidebar(): void { this.sidebarOpen.update((v) => !v); }
  closeSidebar(): void { this.sidebarOpen.set(false); }
  logout(): void { this.auth.logout(); }
}
