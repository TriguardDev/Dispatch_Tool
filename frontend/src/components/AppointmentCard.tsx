import type { Booking } from "../api/crud";

interface Props {
  appt: Booking;
}

const statusColors: Record<Booking["status"], string> = {
  "in-progress": "bg-blue-50 text-blue-700",
  scheduled: "bg-amber-50 text-amber-700",
  completed: "bg-green-50 text-green-700",
};

export default function AppointmentCard({ appt }: Props) {
  return (
    <div className="card p-3 bg-gray-900  rounded shadow-sm">
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
          <div className="text-xs text-gray-400  mt-1">
            {appt.booking_date} · {appt.booking_time}
          </div>

          {/* Agent Name */}
          {appt.agent_name && (
            <div className="text-sm text-gray-200  mt-1">
              Assigned to: {appt.agent_name}
            </div>
          )}

          {/* Disposition info */}
          {appt.disposition_description ? (
            <p className="text-sm text-green-700 font-medium">
              Disposition: {appt.disposition_description}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic">
              No disposition yet
            </p>
          )}

          {appt.disposition_note && (
            <p className="mt-2 text-sm text-gray-200 ">
              <span className="font-semibold">Note:</span> {appt.disposition_note}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
