import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { EventListComponent } from './events/event-list/event-list.component';
import { EventDetailComponent } from './events/event-detail/event-detail.component';
import { EventFormComponent } from './events/event-form/event-form.component';
import { BookingFormComponent } from './bookings/booking-form/booking-form.component';
import { MyBookingsComponent } from './bookings/my-bookings/my-bookings.component';
import { AdminDashboardComponent } from './admin/admin-dashboard/admin-dashboard.component';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // Public event browsing routes
  { path: 'events', component: EventListComponent },
  { path: 'events/:id', component: EventDetailComponent },

  // Public authentication routes
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // Authenticated user booking routes
  {
    path: 'book',
    component: BookingFormComponent,
    canActivate: [authGuard]
  },
  {
    path: 'book/:eventId',
    component: BookingFormComponent,
    canActivate: [authGuard]
  },
  {
    path: 'bookings/my',
    component: MyBookingsComponent,
    canActivate: [authGuard]
  },
  {
    path: 'bookings',
    redirectTo: 'bookings/my',
    pathMatch: 'full'
  },

  // Admin-only dashboard and event management routes
  {
    path: 'admin',
    component: AdminDashboardComponent,
    canActivate: [authGuard, adminGuard]
  },
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

  // Default redirect to public events list
  { path: '', redirectTo: 'events', pathMatch: 'full' },

  // Fallback wildcard route
  { path: '**', redirectTo: 'events' }
];
