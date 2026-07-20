'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { adminActionTarget, type AdminAction } from '@/lib/status';
import type { Booking } from '@/lib/types';

export type ActionResult = { error: string } | { ok: true };

// Admin acts on a booking. The DB (RLS + trigger) is the real gate; this
// server action also re-checks the transition so we can return a clean error
// and only touch a row that is still in the expected state (race-safe).
export async function adminAct(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const id = String(formData.get('booking_id') ?? '');
  const action = String(formData.get('action') ?? '') as AdminAction;
  const message = String(formData.get('message') ?? '').trim();

  if (!id) return { error: 'Missing booking id.' };
  if (!['accept', 'reject', 'request_clarification'].includes(action)) {
    return { error: 'Unknown action.' };
  }
  if (action === 'request_clarification' && !message) {
    return { error: 'A clarification message is required.' };
  }

  const supabase = await createClient();

  // Read the current status (RLS lets admins read all bookings).
  const { data: current, error: readErr } = await supabase
    .from('bookings')
    .select('id, status')
    .eq('id', id)
    .single<Pick<Booking, 'id' | 'status'>>();

  if (readErr || !current) return { error: 'Booking not found.' };

  const target = adminActionTarget(current.status, action);
  if (!target) {
    return {
      error: `Cannot ${action.replace('_', ' ')} a booking that is "${current.status}".`,
    };
  }

  const update: Partial<Booking> = { status: target };
  if (action === 'request_clarification') {
    update.clarification_message = message;
  }

  const { data, error } = await supabase
    .from('bookings')
    .update(update)
    .eq('id', id)
    .eq('status', current.status) // race guard: row must still be as we read it
    .select('id');

  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: 'Booking changed before your action; refresh and retry.' };
  }

  revalidatePath('/admin');
  return { ok: true };
}
