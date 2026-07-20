import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { DashboardHeader } from '@/components/dashboard-header';
import { StatusBadge } from '@/components/status-badge';
import type { BookingWithRenter } from '@/lib/types';
import { BookingActions } from './booking-actions';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await requireRole('admin');
  const supabase = await createClient();

  // RLS (bookings_select_admin) allows admins to read every booking.
  // The join pulls the renter's email from profiles (also admin-readable).
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, profiles ( email )')
    .order('created_at', { ascending: false });

  const list = (bookings ?? []) as BookingWithRenter[];

  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <DashboardHeader title="Admin dashboard" email={user.email} />

      <h2 className="mb-2 font-semibold">All booking requests</h2>
      {list.length === 0 ? (
        <p className="text-sm text-gray-500">No booking requests yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((b) => (
            <li key={b.id} className="rounded border border-gray-300 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">
                  {b.booking_date} at {b.booking_time?.slice(0, 5)}
                </span>
                <StatusBadge status={b.status} />
              </div>

              <p className="mt-1 text-xs text-gray-500">
                From: {b.profiles?.email ?? b.renter_id}
              </p>

              {b.note && (
                <p className="mt-1 text-sm text-gray-700">Note: {b.note}</p>
              )}

              {b.clarification_message && (
                <p className="mt-2 rounded bg-yellow-50 p-2 text-sm">
                  <span className="font-medium">You asked:</span>{' '}
                  {b.clarification_message}
                </p>
              )}

              {b.renter_response && (
                <p className="mt-1 rounded bg-blue-50 p-2 text-sm">
                  <span className="font-medium">Renter replied:</span>{' '}
                  {b.renter_response}
                </p>
              )}

              <BookingActions bookingId={b.id} status={b.status} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
