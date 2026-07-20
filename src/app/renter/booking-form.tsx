'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createBooking, type ActionResult } from './actions';

export function BookingForm() {
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(createBooking, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && 'ok' in state) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded border border-gray-300 p-4"
    >
      <h2 className="font-semibold">New booking request</h2>

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Date
          <input
            type="date"
            name="booking_date"
            required
            className="rounded border border-gray-400 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Time
          <input
            type="time"
            name="booking_time"
            required
            className="rounded border border-gray-400 px-2 py-1"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Note (optional)
        <textarea
          name="note"
          rows={2}
          className="rounded border border-gray-400 px-2 py-1"
          placeholder="Anything the admin should know…"
        />
      </label>

      {state && 'error' in state && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-black px-3 py-2 text-white disabled:opacity-50"
      >
        {pending ? 'Submitting…' : 'Submit request'}
      </button>
    </form>
  );
}
