import { useState } from "react";
import { Box, Typography, CircularProgress, Container, Tabs, Tab } from "@mui/material";
import TopBar from "../components/TopBar";
import Filters from "../components/Filters";
import QueueCard from "../components/QueueCard";
import AppointmentCard from "../components/AppointmentCard";
import NewAppointmentModal from "../components/NewAppointmentModal";
import TimeOffManagement from "../components/TimeOffManagement";
import { getAllBookings, type Booking } from "../api/crud";
import { useSmartPolling } from "../hooks/useSmartPolling";

interface DispatcherScreenProps {
  onLogout: () => void;
}

export default function DispatcherScreen({ onLogout }: DispatcherScreenProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  
  const {
    data: bookings,
    loading,
    error,
    refetch,
    pausePolling,
    resumePolling
  } = useSmartPolling({
    fetchFunction: getAllBookings,
    onLogout
  });

  // Handle modal state changes to pause/resume polling
  const handleModalOpen = () => {
    setIsModalOpen(true);
    pausePolling();
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    resumePolling();
  };

  const handleModalSave = () => {
    handleModalClose();
    refetch(); // Refresh data after saving
  };

  // Categorize bookings by status
  const scheduled = bookings.filter((b) => ["scheduled"].includes(b.status.toLowerCase()));
  const active = bookings.filter((b) => ["in-progress"].includes(b.status.toLowerCase()));
  const completed = bookings.filter((b) => ["completed"].includes(b.status.toLowerCase()));

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
            <Tab label="All Appointments" />
            <Tab label="Team Time-Off" />
          </Tabs>
        </Box>

        {/* Appointments Tab */}
        {tabValue === 0 && (
          <>
            <Filters 
              onNewAppt={handleModalOpen} 
              onRefresh={refetch}
              refreshing={loading}
            />

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
                addressText={appt.customer_address ?? ""}
                onAgentChange={refetch} />
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
                addressText={appt.customer_address ?? ""}
                onAgentChange={refetch} />
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
                addressText={appt.customer_address ?? ""}
                onAgentChange={refetch} />
            ))}
          </QueueCard>
            </div>
          </>
        )}

        {/* Time-Off Management Tab */}
        {tabValue === 1 && (
          <TimeOffManagement onLogout={onLogout} userRole="dispatcher" />
        )}
      </Container>

      <NewAppointmentModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        onLogout={onLogout}
      />
    </Box>
  );
}