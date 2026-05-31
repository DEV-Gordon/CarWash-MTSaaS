import { Component, OnInit, inject, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, ResourceClient } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { AuthUser, UserRole } from '../../core/models';

// Refleja BusinessUserSerializer del backend.
interface TeamUser extends AuthUser {
  first_name?: string;
  last_name?: string;
  phone?: string;
  business?: number;
}

@Component({
  selector: 'app-users',
  imports: [ReactiveFormsModule, TitleCasePipe],
  templateUrl: './users.html',
})
export class Users implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private repo: ResourceClient<TeamUser> = this.api.resource<TeamUser>('auth/users');

  readonly items = signal<TeamUser[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly modalOpen = signal(false);
  readonly error = signal<string | null>(null);
  readonly isAdmin = this.auth.isAdmin;
  readonly currentId = this.auth.user()?.id;

  readonly roles: { value: UserRole; label: string }[] = [
    { value: 'admin', label: 'Administrador' },
    { value: 'employee', label: 'Empleado' },
  ];

  form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    first_name: [''],
    last_name: [''],
    email: ['', Validators.email],
    phone: [''],
    role: ['employee' as UserRole, Validators.required],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.repo.list().subscribe({
      next: (data) => { this.items.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  roleLabel(role: UserRole): string {
    return role === 'admin' || role === 'superadmin' ? 'Administrador' : 'Empleado';
  }

  openCreate(): void {
    this.form.reset({ role: 'employee' });
    this.error.set(null);
    this.modalOpen.set(true);
  }

  close(): void { this.modalOpen.set(false); }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.error.set(null);
    this.repo.create(this.form.getRawValue()).subscribe({
      next: () => { this.saving.set(false); this.close(); this.load(); },
      error: (err) => {
        const e = err?.error;
        const msg = typeof e === 'object' && e ? Object.values(e).flat().join(' ') : 'No se pudo crear el usuario.';
        this.error.set(msg);
        this.saving.set(false);
      },
    });
  }
}
