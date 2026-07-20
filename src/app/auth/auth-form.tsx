'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import type { AuthState } from './actions';

type Action = (prev: AuthState, formData: FormData) => Promise<AuthState>;

export function AuthForm({
  mode,
  action,
}: {
  mode: 'login' | 'signup';
  action: Action;
}) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    null,
  );

  const isLogin = mode === 'login';

  return (
    <div className="mx-auto mt-16 max-w-sm rounded border border-gray-300 p-6">
      <h1 className="mb-4 text-xl font-semibold">
        {isLogin ? 'Log in' : 'Sign up'}
      </h1>

      <form action={formAction} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="rounded border border-gray-400 px-2 py-1"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            name="password"
            required
            minLength={6}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            className="rounded border border-gray-400 px-2 py-1"
          />
        </label>

        {state?.error && (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          {pending ? 'Please wait…' : isLogin ? 'Log in' : 'Sign up'}
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-600">
        {isLogin ? (
          <>
            No account?{' '}
            <Link href="/signup" className="underline">
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link href="/login" className="underline">
              Log in
            </Link>
          </>
        )}
      </p>

      {!isLogin && (
        <p className="mt-3 text-xs text-gray-500">
          New accounts are renters. Admin access is granted manually.
        </p>
      )}
    </div>
  );
}
