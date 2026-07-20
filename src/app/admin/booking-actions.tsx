'use client';

import { useActionState, useState } from 'react';
import { adminAct, type ActionResult } from './actions';
import { ADMIN_ACTIONABLE, type BookingStatus } from '@/lib/status';

export function BookingActions({
  bookingId,
  status,
}: {
  bookingId: string;
  status: BookingStatus;
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(adminAct, null);
  const [showClarify, setShowClarify] = useState(false);

  // Only pending / renter_responded bookings are actionable by the admin.
  if (!ADMIN_ACTIONABLE.includes(status)) {
    if (status === 'clarification_requested') {
      return (
        <p className="mt-2 text-sm text-gray-500">
          Waiting on the renter&rsquo;s response…
        </p>
      );
    }
    return null;
  }

  // "Ask for clarification" is only offered on a pending booking (the spec
  // allows exactly one clarification round, out of pending).
  const canClarify = status === 'pending';

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <form action={formAction}>
          <input type="hidden" name="booking_id" value={bookingId} />
          <input type="hidden" name="action" value="accept" />
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-green-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            Accept
          </button>
        </form>

        <form action={formAction}>
          <input type="hidden" name="booking_id" value={bookingId} />
          <input type="hidden" name="action" value="reject" />
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-red-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            Reject
          </button>
        </form>

        {canClarify && (
          <button
            type="button"
            onClick={() => setShowClarify((v) => !v)}
            disabled={pending}
            className="rounded border border-gray-400 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-50"
          >
            Ask for clarification
          </button>
        )}
      </div>

      {canClarify && showClarify && (
        <form action={formAction} className="flex flex-col gap-2">
          <input type="hidden" name="booking_id" value={bookingId} />
          <input type="hidden" name="action" value="request_clarification" />
          <textarea
            name="message"
            rows={2}
            required
            placeholder="What do you need the renter to clarify?"
            className="rounded border border-gray-400 px-2 py-1 text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="self-start rounded bg-yellow-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            Send clarification request
          </button>
        </form>
      )}

      {state && 'error' in state && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
    </div>
  );
}
