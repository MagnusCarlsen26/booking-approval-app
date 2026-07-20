import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Role } from '@/lib/types';

// Returns the current user + role, or null if not signed in.
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('id', user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? profile?.email ?? null,
    role: (profile?.role ?? 'renter') as Role,
  };
}

// Guard for a page that requires a specific role. Redirects otherwise.
export async function requireRole(role: Role) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== role) {
    // Send users to their own dashboard rather than showing a forbidden page.
    redirect(user.role === 'admin' ? '/admin' : '/renter');
  }
  return user;
}
