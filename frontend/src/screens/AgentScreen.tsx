import TopBar from "../components/TopBar";
import Filters from "../components/Filters";
import QueueCard from "../components/QueueCard";
import AppointmentCard from "../components/AppointmentCard";
import { appointments } from "../sample-data/appointments";

export default function AgentScreen() {
  const scheduled = appointments.filter((a) => a.status === "Scheduled");
  const active = appointments.filter(
    (a) => a.status === "En Route" || a.status === "On Site"
  );
  const completed = appointments.filter((a) => a.status === "Completed");

  return (
    <div className="bg-gray-50 min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Filters />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <QueueCard
            title="Queue — Scheduled"
            badgeColor="bg-blue-50 text-blue-700"
            count={scheduled.length}
          >
            {scheduled.map((appt) => (
              <AppointmentCard key={appt.id} appt={appt} />
            ))}
          </QueueCard>

          <QueueCard
            title="En Route / On Site"
            badgeColor="bg-yellow-50 text-yellow-700"
            count={active.length}
          >
            {active.map((appt) => (
              <AppointmentCard key={appt.id} appt={appt} />
            ))}
          </QueueCard>

          <QueueCard
            title="Completed Today"
            badgeColor="bg-emerald-50 text-emerald-700"
            count={completed.length}
          >
            {completed.map((appt) => (
              <AppointmentCard key={appt.id} appt={appt} />
            ))}
          </QueueCard>
        </div>
      </main>
    </div>
  );
}
