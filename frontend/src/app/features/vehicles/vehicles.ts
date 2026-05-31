import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, ResourceClient } from '../../core/services/api.service';
import { Client, Vehicle } from '../../core/models';

@Component({
  selector: 'app-vehicles',
  imports: [ReactiveFormsModule],
  templateUrl: './vehicles.html',
})
export class Vehicles implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private repo: ResourceClient<Vehicle> = this.api.resource<Vehicle>('vehicles');
  private clientsRepo: ResourceClient<Client> = this.api.resource<Client>('clients');

  readonly items = signal<Vehicle[]>([]);
  readonly clients = signal<Client[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly search = signal('');
  readonly modalOpen = signal(false);
  readonly editing = signal<Vehicle | null>(null);
  readonly error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    client: [null as number | null, Validators.required],
    brand: ['', Validators.required],
    model: ['', Validators.required],
    plate: ['', Validators.required],
    year: [null as number | null],
    color: [''],
    notes: [''],
  });

  ngOnInit(): void {
    this.clientsRepo.list().subscribe((c) => this.clients.set(c));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.repo.list({ search: this.search() }).subscribe({
      next: (data) => { this.items.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  onSearch(value: string): void { this.search.set(value); this.load(); }

  clientName(id: number): string {
    return this.clients().find((c) => c.id === id)?.full_name ?? '—';
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset();
    this.error.set(null);
    this.modalOpen.set(true);
  }

  openEdit(v: Vehicle): void {
    this.editing.set(v);
    this.error.set(null);
    this.form.setValue({
      client: v.client, brand: v.brand, model: v.model, plate: v.plate,
      year: v.year, color: v.color ?? '', notes: v.notes ?? '',
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
      error: (err) => { this.error.set(err?.error?.detail || 'No se pudo guardar el vehículo.'); this.saving.set(false); },
    });
  }

  remove(v: Vehicle): void {
    if (!confirm(`¿Eliminar el vehículo ${v.plate}?`)) return;
    this.repo.remove(v.id).subscribe({ next: () => this.load() });
  }
}
