import React from "react";
import { Box, Typography, CircularProgress, Container } from "@mui/material";
import TopBar from "../components/TopBar";
import QueueCard from "../components/QueueCard";
import AppointmentCard from "../components/AppointmentCard";
import { type Booking, getAgentBookings, updateBookingStatus, saveDisposition } from "../api/crud";
import { useSmartPolling } from "../hooks/useSmartPolling";

interface AgentScreenProps {
  agentId: number; // passed from login
  onLogout: () => void;
}

export default function AgentScreen({ agentId, onLogout }: AgentScreenProps) {
  
  // Memoize the fetch function to prevent unnecessary re-renders
  const fetchAgentBookings = React.useCallback(() => {
    console.log("Fetching bookings for agent:", agentId);
    return getAgentBookings(agentId);
  }, [agentId]);
  
  const {
    data: bookings,
    loading,
    error,
    refetch,
    pausePolling,
    resumePolling,
    optimisticUpdate
  } = useSmartPolling({
    fetchFunction: fetchAgentBookings,
    onLogout
  });

  const handleStatusChange = async (bookingId: number, status: string) => {
    try {
      // Optimistic update - immediately update UI
      optimisticUpdate(bookingId, { status: status as Booking['status'] });
      
      // Make API call
      await updateBookingStatus(bookingId, status);
      
      // Refresh data to ensure consistency
      await refetch();
    } catch (err) {
      console.error(err);
      const errorMessage = (err as Error).message || "Error updating booking status";
      
      if (errorMessage.includes("Authentication required")) {
        onLogout();
      } else {
        // Revert optimistic update on error
        await refetch();
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
      // Optimistic update
      optimisticUpdate(bookingId, { 
        disposition_code: dispositionType,
        disposition_note: note 
      });
      
      await saveDisposition(bookingId, dispositionType, note);
      await refetch();
    } catch (err) {
      console.error(err);
      const errorMessage = (err as Error).message || "Error saving disposition";
      
      if (errorMessage.includes("Authentication required")) {
        onLogout();
      } else {
        // Revert optimistic update on error
        await refetch();
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
                <AppointmentCard
                  key={appt.bookingId}
                  appt={appt}
                  addressText={addressText ?? ""}
                  onStatusChange={handleStatusChange}
                />
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
                <AppointmentCard
                  key={appt.bookingId}
                  appt={appt}
                  addressText={addressText ?? ""}
                  onStatusChange={handleStatusChange}
                />
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
              <AppointmentCard
                key={appt.bookingId}
                appt={appt}
                addressText={appt.customer_address ?? ""}
                onDispositionSave={handleDispositionChange}
              />
            ))}
          </QueueCard>
        </div>
      </Container>
    </Box>
  );
}