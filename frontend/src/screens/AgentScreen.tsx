import { useState, useEffect } from "react";
import { Box, Typography, CircularProgress, Container, Select, MenuItem, FormControl } from "@mui/material";
import TopBar from "../components/TopBar";
import QueueCard from "../components/QueueCard";
import AppointmentCard from "../components/AppointmentCard";
import { type Booking, getAgentBookings, updateBookingStatus, saveDisposition } from "../api/crud";
import { CompletedAppointmentCard } from "../components/CompletedAppointmentCard";

interface AgentScreenProps {
  agentId: number; // passed from login
  onLogout: () => void;
}

export default function AgentScreen({ agentId, onLogout }: AgentScreenProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    async function fetchBookings() {
      try {
        console.log("fetching bookings for agent:", agentId);
        setLoading(true);
        const data: Booking[] = await getAgentBookings(agentId);
        setBookings(data);
      } catch (err: unknown) {
        console.error("Error fetching bookings:", err);
        const errorMessage = (err as Error).message || "Failed to fetch bookings";
        setError(errorMessage);
        
        // If authentication error, might need to re-login
        if (errorMessage.includes("Authentication required")) {
          onLogout();
        }
      } finally {
        setLoading(false);
      }
    }

    fetchBookings();
    const interval = setInterval(fetchBookings, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [agentId, refresh, onLogout]);

  const handleStatusChange = async (bookingId: number, status: string) => {
    try {
      await updateBookingStatus(bookingId, status);
      setRefresh((prev) => prev + 1);
    } catch (err) {
      console.error(err);
      const errorMessage = (err as Error).message || "Error updating booking status";
      
      if (errorMessage.includes("Authentication required")) {
        onLogout();
      } else {
        alert(errorMessage);
      }
    }
  };

  const handleDispositionChange = async (
    bookingId: number,
    dispositionType: string,
    note: string = ""
  ) => {
    try {
      await saveDisposition(bookingId, dispositionType, note);
      setRefresh((prev) => prev + 1);
    } catch (err) {
      console.error(err);
      const errorMessage = (err as Error).message || "Error saving disposition";
      
      if (errorMessage.includes("Authentication required")) {
        onLogout();
      } else {
        alert(errorMessage);
      }
    }
  };

  // Categorize bookings
  const scheduled = bookings.filter(
    (b) => b.status.toLowerCase() === "scheduled"
  );
  const active = bookings.filter(
    (b) => b.status.toLowerCase() === "in-progress"
  );
  const completed = bookings.filter(
    (b) => b.status.toLowerCase() === "completed"
  );

  if (loading) {
    return (
      <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh' }}>
        <TopBar onLogOut={onLogout} />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', flexDirection: 'column', gap: 2 }}>
          <CircularProgress />
          <Typography color="text.primary">Loading bookings...</Typography>
        </Box>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh' }}>
        <TopBar onLogOut={onLogout} />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <Typography color="error.main">{error}</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh' }}>
      <TopBar onLogOut={onLogout} />
      <Container component="main" maxWidth="xl" sx={{ py: 3 }}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Scheduled */}
          <QueueCard
            title="Scheduled"
            badgeColor="bg-blue-50 text-blue-700"
            count={scheduled.length}
          >
            {scheduled.map((appt) => {
              const addressText =
                appt.status === "in-progress"
                  ? appt.customer_address
                  : "Address hidden until on route";

              return (
                <Box key={appt.bookingId} sx={{ mb: 2 }}>
                  <AppointmentCard
                    appt={appt}
                    addressText={addressText ?? ""}
                  />
                  <FormControl fullWidth sx={{ mt: 1 }}>
                    <Select
                      value={appt.status}
                      onChange={(e) =>
                        handleStatusChange(appt.bookingId, e.target.value)
                      }
                      size="small"
                    >
                      <MenuItem value="scheduled">Scheduled</MenuItem>
                      <MenuItem value="in-progress">En Route / On Site</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              );
            })}
          </QueueCard>

          {/* En Route / On Site */}
          <QueueCard
            title="En Route / On Site"
            badgeColor="bg-yellow-50 text-yellow-700"
            count={active.length}
          >
            {active.map((appt) => {
              const addressText =
                appt.status === "in-progress"
                  ? appt.customer_address
                  : "Address hidden until on route";

              return (
                <Box key={appt.bookingId} sx={{ mb: 2 }}>
                  <AppointmentCard
                    appt={appt}
                    addressText={addressText ?? ""}
                  />
                  <FormControl fullWidth sx={{ mt: 1 }}>
                    <Select
                      value={appt.status}
                      onChange={(e) =>
                        handleStatusChange(appt.bookingId, e.target.value)
                      }
                      size="small"
                    >
                      <MenuItem value="scheduled">Scheduled</MenuItem>
                      <MenuItem value="in-progress">En Route / On Site</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              );
            })}
          </QueueCard>

          {/* Completed */}
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
      </Container>
    </Box>
  );
}