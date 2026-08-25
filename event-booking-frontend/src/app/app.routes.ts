import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { EventListComponent } from './events/event-list/event-list.component';
import { EventDetailComponent } from './events/event-detail/event-detail.component';
import { EventFormComponent } from './events/event-form/event-form.component';
import { BookingsPlaceholderComponent } from './bookings/bookings-placeholder.component';
import { AdminPlaceholderComponent } from './admin/admin-placeholder.component';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // Public event browsing routes
  { path: 'events', component: EventListComponent },
  { path: 'events/:id', component: EventDetailComponent },

  // Public authentication routes
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // Admin-only event management routes
  {
    path: 'admin/events/new',
    component: EventFormComponent,
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'admin/events/edit/:id',
    component: EventFormComponent,
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'admin',
    component: AdminPlaceholderComponent,
    canActivate: [authGuard, adminGuard]
  },

  // Authenticated user booking routes
  {
    path: 'bookings',
    component: BookingsPlaceholderComponent,
    canActivate: [authGuard]
  },

  // Default redirect to public events list
  { path: '', redirectTo: 'events', pathMatch: 'full' },

  // Fallback wildcard route
  { path: '**', redirectTo: 'events' }
];
