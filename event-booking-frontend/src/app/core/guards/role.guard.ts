import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard that verifies the user is authenticated and has the 'Admin' role.
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url }
    });
  }

  if (authService.isAdmin()) {
    return true;
  }

  // Authenticated but not an Admin: redirect to /events
  return router.createUrlTree(['/events']);
};

/**
 * Generic role guard that checks for a role specified in route data: { expectedRole: 'Admin' | 'User' }
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url }
    });
  }

  const expectedRole = route.data?.['expectedRole'] as string | undefined;
  const currentRole = authService.getRole();

  if (!expectedRole || (currentRole && currentRole.toLowerCase() === expectedRole.toLowerCase())) {
    return true;
  }

  return router.createUrlTree(['/events']);
};
