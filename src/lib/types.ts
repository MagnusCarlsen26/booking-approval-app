import type { BookingStatus } from './status';

export type Role = 'renter' | 'admin';

export interface Profile {
  id: string;
  email: string | null;
  role: Role;
  created_at: string;
}

export interface Booking {
  id: string;
  renter_id: string;
  booking_date: string; // YYYY-MM-DD
  booking_time: string; // HH:MM:SS
  note: string | null;
  status: BookingStatus;
  clarification_message: string | null;
  renter_response: string | null;
  created_at: string;
  updated_at: string;
}

// Booking joined with the renter's email, used on the admin dashboard.
export interface BookingWithRenter extends Booking {
  profiles: { email: string | null } | null;
}
