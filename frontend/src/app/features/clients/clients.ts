import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, ResourceClient } from '../../core/services/api.service';
import { Client } from '../../core/models';

@Component({
  selector: 'app-clients',
  imports: [ReactiveFormsModule],
  templateUrl: './clients.html',
})
export class Clients implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private repo: ResourceClient<Client> = this.api.resource<Client>('clients');

  readonly items = signal<Client[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly search = signal('');
  readonly modalOpen = signal(false);
  readonly editing = signal<Client | null>(null);
  readonly error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    phone: ['', Validators.required],
    email: [''],
    notes: [''],
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.repo.list({ search: this.search() }).subscribe({
      next: (data) => { this.items.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  onSearch(value: string): void { this.search.set(value); this.load(); }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset();
    this.error.set(null);
    this.modalOpen.set(true);
  }

  openEdit(c: Client): void {
    this.editing.set(c);
    this.error.set(null);
    this.form.setValue({
      first_name: c.first_name, last_name: c.last_name,
      phone: c.phone, email: c.email ?? '', notes: c.notes ?? '',
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
      error: (err) => {
        this.error.set(err?.error?.detail || 'No se pudo guardar el cliente.');
        this.saving.set(false);
      },
    });
  }

  remove(c: Client): void {
    if (!confirm(`¿Eliminar a ${c.full_name}? Esta acción no se puede deshacer.`)) return;
    this.repo.remove(c.id).subscribe({ next: () => this.load() });
  }
}
