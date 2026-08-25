import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { EventsPlaceholderComponent } from './events/events-placeholder.component';
import { BookingsPlaceholderComponent } from './bookings/bookings-placeholder.component';
import { AdminPlaceholderComponent } from './admin/admin-placeholder.component';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // Public auth routes
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // Protected application routes
  {
    path: 'events',
    component: EventsPlaceholderComponent,
    canActivate: [authGuard]
  },
  {
    path: 'bookings',
    component: BookingsPlaceholderComponent,
    canActivate: [authGuard]
  },
  {
    path: 'admin',
    component: AdminPlaceholderComponent,
    canActivate: [authGuard, adminGuard]
  },

  // Default redirect
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Wildcard fallback
  { path: '**', redirectTo: 'login' }
];
