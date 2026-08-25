import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly registerForm: FormGroup = this.fb.group(
    {
      name: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(200)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    },
    { validators: this.passwordMatchValidator }
  );

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/events']);
    }
  }

  get f() {
    return this.registerForm.controls;
  }

  /**
   * Custom validator checking if password and confirmPassword match.
   */
  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    if (password && confirmPassword && password !== confirmPassword) {
      return { passwordMismatch: true };
    }
    return null;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { name, email, password } = this.registerForm.value;

    this.authService.register({ name, email, password }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/login'], {
          queryParams: { registered: 'true' }
        });
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 409) {
          this.errorMessage.set(err.error?.message || 'A user with this email address already exists.');
        } else if (err.status === 400) {
          this.errorMessage.set(err.error?.message || 'Please check your registration details.');
        } else if (err.status === 0) {
          this.errorMessage.set('Unable to connect to the server. Please check your backend connection.');
        } else {
          this.errorMessage.set(err.error?.message || 'An error occurred during registration. Please try again.');
        }
      }
    });
  }
}
