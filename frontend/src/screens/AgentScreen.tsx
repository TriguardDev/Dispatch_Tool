import { useState, useEffect } from "react";
import TopBar from "../components/TopBar";
import QueueCard from "../components/QueueCard";
import AppointmentCard from "../components/AppointmentCard";
import { type Booking } from "../api/crud";

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
        const res = await fetch(`http://localhost:8000/booking?agentId=${agentId}`, {
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
    const interval = setInterval(fetchBookings, 10000)
    return () => clearInterval(interval);
  }, [agentId, refresh]);

  const handleStatusChange = async (bookingId: number, status: string) => {
    try {
      const res = await fetch(`http://localhost:8000/booking`, {
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
      const res = await fetch(`http://localhost:8000/disposition`, {
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
    <div className="bg-gray-50 min-h-screen">
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
                <AppointmentCard appt={appt} />
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
                <AppointmentCard appt={appt} />
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
              <div key={appt.bookingId} className="mb-2">
                <AppointmentCard appt={appt} />
                {/* Add disposition select for completed bookings */}
                <select
                  className="select mt-1 w-full"
                  defaultValue={appt.disposition_code || ""}
                  onChange={(e) => handleDispositionChange(appt.bookingId, e.target.value)}
                >
                  <option value="">Select Disposition</option>
                  <option value="SOLD_CASH_PIF">Sold – Cash Deal (Paid in Full)</option>
                  <option value="SOLD_CHECK_COLLECTED">Sold – Check Collected</option>
                  <option value="SOLD_CARD_ACH_SUBMITTED">Sold – Card/ACH Payment Submitted</option>
                  <option value="SOLD_DEPOSIT_COLLECTED">Sold – Deposit Collected (Balance Due)</option>
                  <option value="SOLD_LENDER_SUBMITTED">Sold – Lender Financing Submitted</option>
                  <option value="SOLD_LENDER_APPROVED_DOCS">Sold – Lender Approved (Docs Signed)</option>
                  <option value="SOLD_FUNDED">Sold – Funded (Lender Disbursed)</option>
                  <option value="SOLD_LENDER_DECLINED">Sold – Lender Declined</option>
                  <option value="SOLD_IN_HOUSE_PLAN">Sold – Payment Plan (In-House)</option>
                  <option value="SOLD_FINAL_PAYMENT">Sold – Balance Paid (Final Payment)</option>
                  <option value="SOLD_RESCINDED_REVERSED">Sale Rescinded / Payment Reversed</option>
                </select>
              </div>
            ))}
          </QueueCard>
        </div>
      </main>
    </div>
  );
}
