import { STATUS_BADGE, STATUS_LABEL, type BookingStatus } from '@/lib/status';

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
