import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-events-placeholder',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="placeholder-container">
      <div class="card">
        <h2>🎉 Events Dashboard (Phase 5 Placeholder)</h2>
        <p>This is the protected Events route.</p>
        <div class="user-info">
          <p><strong>Logged in as:</strong> {{ authService.currentUser()?.name }}</p>
          <p><strong>Email:</strong> {{ authService.currentUser()?.email }}</p>
          <p><strong>Role:</strong> <span class="badge">{{ authService.currentUser()?.role }}</span></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .placeholder-container {
      max-width: 800px;
      margin: 2rem auto;
      padding: 1rem;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      border: 1px solid #e5e7eb;
    }
    h2 {
      color: #1f2937;
      margin-top: 0;
    }
    .user-info {
      background: #f9fafb;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      margin-top: 1.5rem;
      border-left: 4px solid #4f46e5;
    }
    .badge {
      background: #e0e7ff;
      color: #3730a3;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      font-weight: 600;
      font-size: 0.85rem;
    }
  `]
})
export class EventsPlaceholderComponent {
  readonly authService = inject(AuthService);
}
