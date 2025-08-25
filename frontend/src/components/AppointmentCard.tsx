import type { Booking } from "../api/crud";

interface Props {
  appt: Booking;
}

const statusColors: Record<Booking["status"], string> = {
  pending: "bg-blue-50 text-blue-700",
  confirmed: "bg-amber-50 text-amber-700",
  completed: "bg-green-50 text-green-700",
};

export default function AppointmentCard({ appt }: Props) {
  return (
    <div className="card p-3 bg-white rounded shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* Customer Name and Status */}
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold truncate max-w-[20ch]">
              {appt.customer_name}
            </h4>
            <span className={`badge ${statusColors[appt.status]}`}>
              {appt.status}
            </span>
          </div>

          {/* Booking Date and Time */}
          <div className="text-xs text-gray-500 mt-1">
            {appt.booking_date} · {appt.booking_time}
          </div>

          {/* Agent Name */}
          {appt.agent_name && (
            <div className="text-sm text-gray-700 mt-1">
              Assigned to: {appt.agent_name}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
