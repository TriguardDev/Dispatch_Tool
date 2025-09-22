import React from "react";
import { Box, Typography, CircularProgress, Container, Tabs, Tab } from "@mui/material";
import TopBar from "../components/TopBar";
import QueueCard from "../components/QueueCard";
import AppointmentCard from "../components/AppointmentCard";
import { type Booking, getAgentBookings, updateBooking, saveDisposition } from "../api/crud";
import { useSmartPolling } from "../hooks/useSmartPolling";
import TimeOffRequest from "../components/TimeOffRequest";

interface AgentScreenProps {
  agentId: number; // passed from login
  onLogout: () => void;
}

export default function AgentScreen({ agentId, onLogout }: AgentScreenProps) {
  const [tabValue, setTabValue] = React.useState(0);
  
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
      await updateBooking(bookingId, { status });
      
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
  const enroute = bookings.filter(
    (b) => b.status.toLowerCase() === "enroute"
  );
  const onsite = bookings.filter(
    (b) => b.status.toLowerCase() === "on-site"
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
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="My Appointments" />
            <Tab label="Time-Off Requests" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        {tabValue === 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Scheduled */}
          <QueueCard
            title="Scheduled"
            badgeColor="bg-blue-50 text-blue-700"
            count={scheduled.length}
          >
            {scheduled.map((appt) => (
              <AppointmentCard
                key={appt.bookingId}
                appt={appt}
                addressText="Address hidden until en route"
                onStatusChange={handleStatusChange}
                userRole="field_agent"
              />
            ))}
          </QueueCard>

          {/* En Route */}
          <QueueCard
            title="En Route"
            badgeColor="bg-blue-50 text-blue-700"
            count={enroute.length}
          >
            {enroute.map((appt) => (
              <AppointmentCard
                key={appt.bookingId}
                appt={appt}
                addressText={appt.customer_address ?? ""}
                onStatusChange={handleStatusChange}
                userRole="field_agent"
              />
            ))}
          </QueueCard>

          {/* On Site */}
          <QueueCard
            title="On Site"
            badgeColor="bg-yellow-50 text-yellow-700"
            count={onsite.length}
          >
            {onsite.map((appt) => (
              <AppointmentCard
                key={appt.bookingId}
                appt={appt}
                addressText={appt.customer_address ?? ""}
                onStatusChange={handleStatusChange}
                userRole="field_agent"
              />
            ))}
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
                userRole="field_agent"
              />
            ))}
          </QueueCard>
          </div>
        )}

        {/* Time-Off Requests Tab */}
        {tabValue === 1 && (
          <TimeOffRequest onLogout={onLogout} />
        )}
      </Container>
    </Box>
  );
}