import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

// Validador a nivel de grupo: las dos contraseñas deben coincidir.
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const p = group.get('password')?.value;
  const p2 = group.get('password2')?.value;
  return p && p2 && p !== p2 ? { mismatch: true } : null;
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: '../login/auth.css',
})
export class Register {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    business_name: ['', Validators.required],
    business_email: ['', [Validators.required, Validators.email]],
    owner_name: ['', Validators.required],
    phone: [''],
    address: [''],
    username: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(8)]],
    password2: ['', Validators.required],
  }, { validators: passwordsMatch });

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set(null);
    this.auth.register(this.form.getRawValue()).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        const e = err?.error;
        const msg = typeof e === 'object' && e
          ? Object.values(e).flat().join(' ')
          : 'No se pudo completar el registro.';
        this.error.set(msg);
        this.loading.set(false);
      },
    });
  }
}
