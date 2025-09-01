import { useState, useEffect } from "react";
import TopBar from "../components/TopBar";
import QueueCard from "../components/QueueCard";
import AppointmentCard from "../components/AppointmentCard";
import { type Booking } from "../api/crud";
import { CompletedAppointmentCard } from "../components/CompletedAppointmentCard";
import { BASE_URL } from "../utils/constants";

interface AgentScreenProps {
  agentId: number; // passed from login
}

export default function AgentScreen({ agentId }: AgentScreenProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    async function fetchBookings() {
      try {
        setLoading(true);
        const res = await fetch(`${BASE_URL}:8000/booking?agentId=${agentId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) throw new Error("Failed to fetch bookings");
        const data: Booking[] = await res.json();
        setBookings(data);
      } catch (err: unknown) {
        setError((err as Error).message || "Failed to fetch bookings");
      } finally {
        setLoading(false);
      }
    }

    fetchBookings();
    const interval = setInterval(fetchBookings, 1000000)
    return () => clearInterval(interval);
  }, [agentId, refresh]);

  const handleStatusChange = async (bookingId: number, status: string) => {
    try {
      const res = await fetch(`${BASE_URL}:8000/booking`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({"booking_id": bookingId, "status": status }),
      });

      if (!res.ok) throw new Error("Failed to update booking status");
      setRefresh((prev) => prev + 1);
    } catch (err) {
      console.error(err);
      alert("Error updating booking status");
    }
  };

  const handleDispositionChange = async (bookingId: number, dispositionType: string, note: string = "") => {
    try {
      const res = await fetch(`${BASE_URL}:8000/disposition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: bookingId,
          dispositionType: dispositionType,
          note: note
        }),
      });

      if (!res.ok) throw new Error("Failed to save disposition");
      setRefresh((prev) => prev + 1);
    } catch (err) {
      console.error(err);
      alert("Error saving disposition");
    }
  };

  // Categorize bookings
  const scheduled = bookings.filter((b) => b.status.toLowerCase() === "scheduled");
  const active = bookings.filter((b) => b.status.toLowerCase() === "in-progress");
  const completed = bookings.filter((b) => b.status.toLowerCase() === "completed");

  if (loading) return <p className="p-6 text-center">Loading bookings...</p>;
  if (error) return <p className="p-6 text-center text-red-500">{error}</p>;

  return (
    <div className="bg-gray-900 min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <QueueCard
            title="Scheduled"
            badgeColor="bg-blue-50 text-blue-700"
            count={scheduled.length}
          >
            {scheduled.map((appt) => (
              <div key={appt.bookingId} className="mb-2">
                {bookings.map((appt) => {
                  const addressText =
                    appt.status === "in-progress"
                      ? appt.customer_address
                      : "Address hidden until on route";

                  return <AppointmentCard key={appt.bookingId} appt={appt} addressText={addressText ?? ""} />;
                })}
                <select
                  className="select mt-1 w-full"
                  value={appt.status}
                  onChange={(e) => handleStatusChange(appt.bookingId, e.target.value)}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="in-progress">En Route / On Site</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            ))}
          </QueueCard>

          <QueueCard
            title="En Route / On Site"
            badgeColor="bg-yellow-50 text-yellow-700"
            count={active.length}
          >
            {active.map((appt) => (
              <div key={appt.bookingId} className="mb-2">
                {bookings.map((appt) => {
                  const addressText =
                    appt.status === "in-progress"
                      ? appt.customer_address
                      : "Address hidden until on route";

                  return <AppointmentCard key={appt.bookingId} appt={appt} addressText={addressText ?? ""} />;
                })}
                <select
                  className="select mt-1 w-full"
                  value={appt.status}
                  onChange={(e) => handleStatusChange(appt.bookingId, e.target.value)}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="in-progress">En Route / On Site</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            ))}
          </QueueCard>

          <QueueCard
            title="Completed"
            badgeColor="bg-emerald-50 text-emerald-700"
            count={completed.length}
          >
            {completed.map((appt) => (
              <CompletedAppointmentCard
                key={appt.bookingId}
                appt={appt}
                onSave={handleDispositionChange}
              />
            ))}
          </QueueCard>

        </div>
      </main>
    </div>
  );
}
