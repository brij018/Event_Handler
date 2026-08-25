import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  constructor() {
    // If already logged in, redirect away
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/events']);
    }

    // Check if redirected with a message (e.g. after registration)
    const registered = this.route.snapshot.queryParamMap.get('registered');
    if (registered === 'true') {
      this.successMessage.set('Registration successful! Please log in with your credentials.');
    }
  }

  get f() {
    return this.loginForm.controls;
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.value;

    this.authService.login({ email, password }).subscribe({
      next: () => {
        this.isLoading.set(false);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/events';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 401) {
          this.errorMessage.set(err.error?.message || 'Invalid email or password.');
        } else if (err.status === 400) {
          this.errorMessage.set(err.error?.message || 'Please check your login details.');
        } else if (err.status === 0) {
          this.errorMessage.set('Unable to connect to the server. Please check your backend connection.');
        } else {
          this.errorMessage.set(err.error?.message || 'An error occurred during login. Please try again.');
        }
      }
    });
  }
}
