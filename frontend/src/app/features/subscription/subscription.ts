import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-subscription',
  templateUrl: './subscription.html',
  styleUrl: './subscription.css',
})
export class SubscriptionPage implements OnInit {
  private auth = inject(AuthService);

  readonly subscription = this.auth.subscription;
  readonly isAdmin = this.auth.isAdmin;
  readonly loading = signal(true);
  readonly renewing = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  readonly statusLabel = computed(() => {
    switch (this.subscription()?.status) {
      case 'active': return 'Activa';
      case 'trial': return 'Período de prueba';
      case 'expired': return 'Vencida';
      case 'suspended': return 'Suspendida';
      default: return 'Sin suscripción';
    }
  });

  ngOnInit(): void {
    this.auth.refreshSubscription().subscribe({
      next: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }

  money(v: string | number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'USD' }).format(Number(v));
  }

  renew(): void {
    this.renewing.set(true);
    this.message.set(null);
    this.error.set(null);
    this.auth.renewSubscription().subscribe({
      next: (res) => { this.message.set(res.message); this.renewing.set(false); },
      error: (err) => {
        this.error.set(err?.error?.detail || 'No se pudo renovar la suscripción.');
        this.renewing.set(false);
      },
    });
  }
}
