'use client';

import { useActionState } from 'react';
import { respondToClarification, type ActionResult } from './actions';

export function ClarificationReply({ bookingId }: { bookingId: string }) {
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(respondToClarification, null);

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-2">
      <input type="hidden" name="booking_id" value={bookingId} />
      <textarea
        name="response"
        rows={2}
        required
        placeholder="Your reply to the admin…"
        className="rounded border border-gray-400 px-2 py-1 text-sm"
      />
      {state && 'error' in state && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-blue-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
      >
        {pending ? 'Sending…' : 'Send response'}
      </button>
    </form>
  );
}
