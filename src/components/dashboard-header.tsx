import { logout } from '@/app/auth/actions';

export function DashboardHeader({
  title,
  email,
}: {
  title: string;
  email: string | null;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-gray-300 pb-3">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="flex items-center gap-3 text-sm text-gray-600">
        <span>{email}</span>
        <form action={logout}>
          <button
            type="submit"
            className="rounded border border-gray-400 px-3 py-1 hover:bg-gray-100"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
