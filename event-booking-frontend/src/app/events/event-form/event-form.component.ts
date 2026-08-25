import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EventService } from '../event.service';
import { CreateEventRequest, UpdateEventRequest } from '../models/event.model';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './event-form.component.html',
  styleUrl: './event-form.component.scss'
})
export class EventFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly eventService = inject(EventService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly isEditMode = signal(false);
  readonly eventId = signal<number | null>(null);
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly eventForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.maxLength(2000)]],
    venue: ['', [Validators.required, Validators.maxLength(300)]],
    eventDate: ['', [Validators.required, this.futureDateValidator]],
    startTime: ['10:00'],
    capacity: [100, [Validators.required, Validators.min(1)]],
    price: [0, [Validators.required, Validators.min(0)]]
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = parseInt(idParam, 10);
      if (!isNaN(id) && id > 0) {
        this.isEditMode.set(true);
        this.eventId.set(id);
        this.loadEventForEdit(id);
      }
    }
  }

  get f() {
    return this.eventForm.controls;
  }

  /**
   * Custom validator checking that the selected event date is in the future.
   */
  private futureDateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const selectedDate = new Date(control.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate <= today) {
      return { pastDate: true };
    }
    return null;
  }

  private loadEventForEdit(id: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.eventService.getEventById(id).subscribe({
      next: (event) => {
        this.isLoading.set(false);
        // Format ISO date string to YYYY-MM-DD for HTML date input
        const dateObj = new Date(event.eventDate);
        const formattedDate = dateObj.toISOString().split('T')[0];

        // Format startTime e.g. "10:00:00" -> "10:00"
        let formattedTime = '10:00';
        if (event.startTime) {
          formattedTime = event.startTime.substring(0, 5);
        }

        this.eventForm.patchValue({
          title: event.title,
          description: event.description || '',
          venue: event.venue,
          eventDate: formattedDate,
          startTime: formattedTime,
          capacity: event.capacity,
          price: event.price
        });
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set('Failed to load event for editing. It may have been deleted.');
      }
    });
  }

  onSubmit(): void {
    if (this.eventForm.invalid) {
      this.eventForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const formValues = this.eventForm.value;

    // Build ISO date string for UTC
    const dateValue = new Date(formValues.eventDate);
    const isoDateString = dateValue.toISOString();

    // Format startTime e.g. "10:00" -> "10:00:00"
    let formattedStartTime: string | undefined = undefined;
    if (formValues.startTime) {
      formattedStartTime = formValues.startTime.length === 5 ? `${formValues.startTime}:00` : formValues.startTime;
    }

    const payload: CreateEventRequest = {
      title: formValues.title.trim(),
      description: formValues.description ? formValues.description.trim() : undefined,
      venue: formValues.venue.trim(),
      eventDate: isoDateString,
      startTime: formattedStartTime,
      capacity: Number(formValues.capacity),
      price: Number(formValues.price)
    };

    if (this.isEditMode() && this.eventId()) {
      const updatePayload: UpdateEventRequest = { ...payload };
      this.eventService.updateEvent(this.eventId()!, updatePayload).subscribe({
        next: (updatedEvent) => {
          this.isSubmitting.set(false);
          this.router.navigate(['/events', updatedEvent.id]);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err.error?.message || 'Failed to update event. Please check form values.');
        }
      });
    } else {
      this.eventService.createEvent(payload).subscribe({
        next: (createdEvent) => {
          this.isSubmitting.set(false);
          this.router.navigate(['/events', createdEvent.id]);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err.error?.message || 'Failed to create event. Please check form values.');
        }
      });
    }
  }
}
