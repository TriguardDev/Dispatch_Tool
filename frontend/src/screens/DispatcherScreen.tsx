import { useState, useEffect } from "react";
import TopBar from "../components/TopBar";
import Filters from "../components/Filters";
import QueueCard from "../components/QueueCard";
import AppointmentCard from "../components/AppointmentCard";
import NewAppointmentModal from "../components/NewAppointmentModal";
import { getAllBookings, type Booking } from "../api/crud";

interface DispatcherScreenProps {
  onLogout: () => void;
}

export default function DispatcherScreen({ onLogout }: DispatcherScreenProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshBookings, setRefreshBookings] = useState(0);

  useEffect(() => {
    async function fetchBookings() {
      try {
        setLoading(true);
        const data = await getAllBookings();
        setBookings(data);
        setLoading(false);
      } catch (err: unknown) {
        console.error("Error fetching bookings:", err);
        const errorMessage = (err as Error).message || "Failed to fetch bookings";
        setError(errorMessage);
        setLoading(false);
        
        // If authentication error, might need to re-login
        if (errorMessage.includes("Authentication required")) {
          onLogout();
        }
      }
    }

    fetchBookings();

    const interval = setInterval(fetchBookings, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [refreshBookings, onLogout]);

  // Categorize bookings by status
  const scheduled = bookings.filter((b) => ["scheduled"].includes(b.status.toLowerCase()));
  const active = bookings.filter((b) => ["in-progress"].includes(b.status.toLowerCase()));
  const completed = bookings.filter((b) => ["completed"].includes(b.status.toLowerCase()));

  if (loading) return <p className="p-6 text-center">Loading bookings...</p>;
  if (error) return <p className="p-6 text-center text-red-500">{error}</p>;

  return (
    <div className="bg-gray-900 min-h-screen">
      <TopBar onLogOut={onLogout} />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Filters onNewAppt={() => setIsModalOpen(true)} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <QueueCard
            title="Queue — Scheduled"
            badgeColor="bg-blue-50 text-blue-700"
            count={scheduled.length}
          >
            {scheduled.map((appt) => (
              <AppointmentCard 
                key={appt.bookingId} 
                appt={appt}
                addressText={appt.customer_address ?? ""} />
            ))}
          </QueueCard>

          <QueueCard
            title="En Route / On Site"
            badgeColor="bg-yellow-50 text-yellow-700"
            count={active.length}
          >
            {active.map((appt) => (
              <AppointmentCard 
                key={appt.bookingId} 
                appt={appt}
                addressText={appt.customer_address ?? ""} />
            ))}
          </QueueCard>

          <QueueCard
            title="Completed Today"
            badgeColor="bg-emerald-50 text-emerald-700"
            count={completed.length}
          >
            {completed.map((appt) => (
              <AppointmentCard 
                key={appt.bookingId} 
                appt={appt}
                addressText={appt.customer_address ?? ""} />
            ))}
          </QueueCard>
        </div>
      </main>

      <NewAppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={() => setRefreshBookings((prev) => prev + 1)}
        onLogout={onLogout}
      />
    </div>
  );
}