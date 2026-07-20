'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ActionResult = { error: string } | { ok: true };

// Renter creates a new booking request (always starts as 'pending').
export async function createBooking(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const booking_date = String(formData.get('booking_date') ?? '').trim();
  const booking_time = String(formData.get('booking_time') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();

  if (!booking_date || !booking_time) {
    return { error: 'Date and time are required.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' };

  const { error } = await supabase.from('bookings').insert({
    renter_id: user.id,
    booking_date,
    booking_time,
    note: note || null,
    status: 'pending',
  });

  if (error) return { error: error.message };

  revalidatePath('/renter');
  return { ok: true };
}

// Renter responds to a clarification request.
// RLS enforces: own booking + currently 'clarification_requested' -> 'renter_responded'.
export async function respondToClarification(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const id = String(formData.get('booking_id') ?? '');
  const response = String(formData.get('response') ?? '').trim();

  if (!id) return { error: 'Missing booking id.' };
  if (!response) return { error: 'A response message is required.' };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'renter_responded', renter_response: response })
    // Guard against races / stale UI: only act on a booking still awaiting
    // clarification. RLS blocks any other case, this makes the failure clean.
    .eq('id', id)
    .eq('status', 'clarification_requested')
    .select('id');

  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: 'This booking is no longer awaiting your response.' };
  }

  revalidatePath('/renter');
  return { ok: true };
}
