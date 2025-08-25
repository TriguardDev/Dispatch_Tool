import type { Appointment } from "../sample-data/appointments";

interface Props {
  appt: Appointment;
}

const statusColors: Record<Appointment["status"], string> = {
  Scheduled: "bg-blue-50 text-blue-700",
  "En Route": "bg-amber-50 text-amber-700",
  "On Site": "bg-purple-50 text-purple-700",
  Completed: "bg-emerald-50 text-emerald-700",
};

export default function AppointmentCard({ appt }: Props) {
  return (
    <div className="card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold truncate max-w-[20ch]">{appt.name}</h4>
            <span className={`badge ${statusColors[appt.status]}`}>{appt.status}</span>
          </div>
          <div className="text-xs text-gray-500">
            {appt.date} · {appt.time} · {appt.type}
          </div>
          <div className="text-sm text-gray-700 mt-1">{appt.address}</div>
          {appt.notes && (
            <div className="text-xs text-gray-500 mt-1">{appt.notes}</div>
          )}
        </div>
      </div>
    </div>
  );
}
