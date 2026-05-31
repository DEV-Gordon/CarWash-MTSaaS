import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, ResourceClient } from '../../core/services/api.service';
import { WashService } from '../../core/models';

@Component({
  selector: 'app-services',
  imports: [ReactiveFormsModule],
  templateUrl: './services.html',
  styleUrl: './services.css',
})
export class Services implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private repo: ResourceClient<WashService> = this.api.resource<WashService>('services');

  readonly items = signal<WashService[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly modalOpen = signal(false);
  readonly editing = signal<WashService | null>(null);
  readonly error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    price: [null as number | null, [Validators.required, Validators.min(0)]],
    duration_minutes: [30, [Validators.required, Validators.min(1)]],
    is_active: [true],
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.repo.list().subscribe({
      next: (data) => { this.items.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  money(v: string | number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'USD' }).format(Number(v));
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({ duration_minutes: 30, is_active: true });
    this.error.set(null);
    this.modalOpen.set(true);
  }

  openEdit(s: WashService): void {
    this.editing.set(s);
    this.error.set(null);
    this.form.setValue({
      name: s.name, description: s.description ?? '',
      price: Number(s.price), duration_minutes: s.duration_minutes, is_active: s.is_active,
    });
    this.modalOpen.set(true);
  }

  close(): void { this.modalOpen.set(false); }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.error.set(null);
    const body = this.form.getRawValue();
    const current = this.editing();
    const req = current ? this.repo.update(current.id, body) : this.repo.create(body);
    req.subscribe({
      next: () => { this.saving.set(false); this.close(); this.load(); },
      error: (err) => { this.error.set(err?.error?.detail || 'No se pudo guardar el servicio.'); this.saving.set(false); },
    });
  }

  remove(s: WashService): void {
    if (!confirm(`¿Eliminar el servicio "${s.name}"?`)) return;
    this.repo.remove(s.id).subscribe({ next: () => this.load() });
  }
}
