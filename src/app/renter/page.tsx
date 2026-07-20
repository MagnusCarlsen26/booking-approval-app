import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { DashboardHeader } from '@/components/dashboard-header';
import { StatusBadge } from '@/components/status-badge';
import type { Booking } from '@/lib/types';
import { BookingForm } from './booking-form';
import { ClarificationReply } from './clarification-reply';

export const dynamic = 'force-dynamic';

export default async function RenterPage() {
  const user = await requireRole('renter');
  const supabase = await createClient();

  // RLS restricts this to the renter's own rows; no explicit filter needed,
  // but we add one anyway for clarity and defense in depth.
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('renter_id', user.id)
    .order('created_at', { ascending: false });

  const list = (bookings ?? []) as Booking[];

  return (
    <main className="mx-auto w-full max-w-2xl p-6">
      <DashboardHeader title="Renter dashboard" email={user.email} />

      <BookingForm />

      <h2 className="mb-2 mt-8 font-semibold">Your bookings</h2>
      {list.length === 0 ? (
        <p className="text-sm text-gray-500">No bookings yet.</p>
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

              {b.note && (
                <p className="mt-1 text-sm text-gray-700">Note: {b.note}</p>
              )}

              {b.clarification_message && (
                <p className="mt-2 rounded bg-yellow-50 p-2 text-sm">
                  <span className="font-medium">Admin asked:</span>{' '}
                  {b.clarification_message}
                </p>
              )}

              {b.renter_response && (
                <p className="mt-1 text-sm text-gray-700">
                  <span className="font-medium">Your reply:</span>{' '}
                  {b.renter_response}
                </p>
              )}

              {/* Reply box only appears while awaiting the renter's response. */}
              {b.status === 'clarification_requested' && (
                <ClarificationReply bookingId={b.id} />
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
