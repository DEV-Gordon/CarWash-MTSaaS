import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, ResourceClient } from '../../core/services/api.service';
import { Employee } from '../../core/models';

@Component({
  selector: 'app-employees',
  imports: [ReactiveFormsModule],
  templateUrl: './employees.html',
})
export class Employees implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private repo: ResourceClient<Employee> = this.api.resource<Employee>('employees');

  readonly items = signal<Employee[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly search = signal('');
  readonly modalOpen = signal(false);
  readonly editing = signal<Employee | null>(null);
  readonly error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    phone: [''],
    email: [''],
    hire_date: [null as string | null],
    is_active: [true],
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
    this.form.reset({ is_active: true });
    this.error.set(null);
    this.modalOpen.set(true);
  }

  openEdit(e: Employee): void {
    this.editing.set(e);
    this.error.set(null);
    this.form.setValue({
      first_name: e.first_name, last_name: e.last_name,
      phone: e.phone ?? '', email: e.email ?? '',
      hire_date: e.hire_date, is_active: e.is_active,
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
      error: (err) => { this.error.set(err?.error?.detail || 'No se pudo guardar el empleado.'); this.saving.set(false); },
    });
  }

  remove(e: Employee): void {
    if (!confirm(`¿Eliminar a ${e.full_name}?`)) return;
    this.repo.remove(e.id).subscribe({ next: () => this.load() });
  }
}
