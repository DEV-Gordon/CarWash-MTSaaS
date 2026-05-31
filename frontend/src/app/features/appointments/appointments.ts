import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, ResourceClient } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { Appointment, AppointmentStatus, Employee, Vehicle, WashService } from '../../core/models';

@Component({
  selector: 'app-appointments',
  imports: [ReactiveFormsModule],
  templateUrl: './appointments.html',
  styleUrl: './appointments.css',
})
export class Appointments implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  readonly business = this.auth.business;
  private repo: ResourceClient<Appointment> = this.api.resource<Appointment>('appointments');
  private vehiclesRepo = this.api.resource<Vehicle>('vehicles');
  private employeesRepo = this.api.resource<Employee>('employees');
  private servicesRepo = this.api.resource<WashService>('services');

  readonly items = signal<Appointment[]>([]);
  readonly vehicles = signal<Vehicle[]>([]);
  readonly employees = signal<Employee[]>([]);
  readonly services = signal<WashService[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly statusFilter = signal<string>('');
  readonly modalOpen = signal(false);
  readonly editing = signal<Appointment | null>(null);
  readonly error = signal<string | null>(null);

  // Cita seleccionada para generar/imprimir su factura.
  readonly invoicing = signal<Appointment | null>(null);
  readonly issuedAt = new Date();

  readonly statuses: { value: AppointmentStatus; label: string }[] = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'in_progress', label: 'En proceso' },
    { value: 'done', label: 'Completada' },
    { value: 'cancelled', label: 'Cancelada' },
  ];

  // selección de servicios para el formulario
  readonly selectedServices = signal<Set<number>>(new Set());

  form = this.fb.nonNullable.group({
    vehicle: [null as number | null, Validators.required],
    employee: [null as number | null],
    scheduled_at: ['', Validators.required],
    status: ['pending' as AppointmentStatus, Validators.required],
    notes: [''],
  });

  ngOnInit(): void {
    this.vehiclesRepo.list().subscribe((v) => this.vehicles.set(v));
    this.employeesRepo.list().subscribe((e) => this.employees.set(e));
    this.servicesRepo.list().subscribe((s) => this.services.set(s));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.repo.list({ status: this.statusFilter() }).subscribe({
      next: (data) => { this.items.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  filterBy(status: string): void { this.statusFilter.set(status); this.load(); }

  money(v: string | number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'USD' }).format(Number(v));
  }

  dateTime(iso: string): string {
    return new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  fullDate(d: string | Date): string {
    return new Date(d).toLocaleString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  // Nº de factura legible a partir del id de la cita, ej. FAC-000123.
  invoiceNumber(a: Appointment): string {
    return 'FAC-' + String(a.id).padStart(6, '0');
  }

  // --- Factura ---
  openInvoice(a: Appointment): void { this.invoicing.set(a); }
  closeInvoice(): void { this.invoicing.set(null); }
  printInvoice(): void { window.print(); }

  vehicleLabel(v: Vehicle): string { return `${v.plate} · ${v.brand} ${v.model}`; }

  toggleService(id: number): void {
    const next = new Set(this.selectedServices());
    next.has(id) ? next.delete(id) : next.add(id);
    this.selectedServices.set(next);
  }

  isServiceSelected(id: number): boolean { return this.selectedServices().has(id); }

  // convierte ISO con zona a valor de <input type="datetime-local">
  private toLocalInput(iso: string): string {
    const d = new Date(iso);
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({ status: 'pending', scheduled_at: '', vehicle: null, employee: null, notes: '' });
    this.selectedServices.set(new Set());
    this.error.set(null);
    this.modalOpen.set(true);
  }

  openEdit(a: Appointment): void {
    this.editing.set(a);
    this.error.set(null);
    this.form.setValue({
      vehicle: a.vehicle,
      employee: a.employee,
      scheduled_at: this.toLocalInput(a.scheduled_at),
      status: a.status,
      notes: a.notes ?? '',
    });
    this.selectedServices.set(new Set(a.services));
    this.modalOpen.set(true);
  }

  close(): void { this.modalOpen.set(false); }

  // Cambio rápido de estado desde la tabla
  changeStatus(a: Appointment, status: AppointmentStatus): void {
    this.repo.patch(a.id, { status }).subscribe({ next: () => this.load() });
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (this.selectedServices().size === 0) { this.error.set('Selecciona al menos un servicio.'); return; }
    this.saving.set(true);
    this.error.set(null);
    const raw = this.form.getRawValue();
    const body: Partial<Appointment> = {
      vehicle: raw.vehicle!,
      employee: raw.employee,
      scheduled_at: new Date(raw.scheduled_at).toISOString(),
      status: raw.status,
      notes: raw.notes,
      services: Array.from(this.selectedServices()),
    };
    const current = this.editing();
    const req = current ? this.repo.update(current.id, body) : this.repo.create(body);
    req.subscribe({
      next: () => { this.saving.set(false); this.close(); this.load(); },
      error: (err) => { this.error.set(err?.error?.detail || 'No se pudo guardar la cita.'); this.saving.set(false); },
    });
  }

  remove(a: Appointment): void {
    if (!confirm(`¿Eliminar la cita #${a.id}?`)) return;
    this.repo.remove(a.id).subscribe({ next: () => this.load() });
  }
}
