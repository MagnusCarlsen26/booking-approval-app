// Single source of truth for the booking state machine on the client/server
// side. The DATABASE (trigger + RLS in supabase/migrations/0001_init.sql) is
// the authoritative enforcer; this mirror lets the UI show the right buttons
// and lets server actions fail fast with friendly errors before hitting the DB.

export type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'clarification_requested'
  | 'renter_responded';

export type AdminAction = 'accept' | 'reject' | 'request_clarification';

// Which statuses an admin may act on, and what each action results in.
export const ADMIN_ACTIONABLE: BookingStatus[] = ['pending', 'renter_responded'];

// The renter may only respond when a clarification has been requested.
export const RENTER_CAN_RESPOND: BookingStatus[] = ['clarification_requested'];

// Terminal states — no further transitions allowed.
export const TERMINAL: BookingStatus[] = ['accepted', 'rejected'];

// Legal transitions, mirrored exactly from the SQL trigger.
const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['accepted', 'rejected', 'clarification_requested'],
  clarification_requested: ['renter_responded'],
  renter_responded: ['accepted', 'rejected'],
  accepted: [],
  rejected: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

// Map an admin action to the target status, given the current status.
// Returns null if the action is not valid from the current status.
export function adminActionTarget(
  current: BookingStatus,
  action: AdminAction,
): BookingStatus | null {
  const target: BookingStatus =
    action === 'accept'
      ? 'accepted'
      : action === 'reject'
        ? 'rejected'
        : 'clarification_requested';

  // request_clarification is only valid from pending.
  if (action === 'request_clarification' && current !== 'pending') return null;

  return canTransition(current, target) ? target : null;
}

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  clarification_requested: 'Clarification requested',
  renter_responded: 'Renter responded',
};

// Tailwind classes for a simple status badge.
export const STATUS_BADGE: Record<BookingStatus, string> = {
  pending: 'bg-gray-200 text-gray-800',
  accepted: 'bg-green-200 text-green-900',
  rejected: 'bg-red-200 text-red-900',
  clarification_requested: 'bg-yellow-200 text-yellow-900',
  renter_responded: 'bg-blue-200 text-blue-900',
};
