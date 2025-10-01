import { useState, useCallback } from "react";
import { Box, Typography, CircularProgress, Container, Tabs, Tab } from "@mui/material";
import TopBar from "../components/TopBar";
import Filters from "../components/Filters";
import QueueCard from "../components/QueueCard";
import AppointmentCard from "../components/AppointmentCard";
import NewAppointmentModal from "../components/NewAppointmentModal";
import TimeOffManagement from "../components/TimeOffManagement";
import TimesheetManagement from "../components/TimesheetManagement";
import TimesheetHistory from "../components/TimesheetHistory";
import { getAllBookings, getDispatcherBookings, updateBooking, saveDisposition, type Booking } from "../api/crud";
import { useSmartPolling } from "../hooks/useSmartPolling";

interface DispatcherScreenProps {
  dispatcherId: number;
  onLogout: () => void;
}

export default function DispatcherScreen({ dispatcherId, onLogout }: DispatcherScreenProps) {
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

  // Polling for dispatcher's own assignments (field agent view)
  const fetchDispatcherBookings = useCallback(() => {
    return getDispatcherBookings(dispatcherId);
  }, [dispatcherId]);

  const {
    data: dispatcherBookings,
    loading: dispatcherLoading,
    error: dispatcherError,
    refetch: refetchDispatcherBookings,
    optimisticUpdate
  } = useSmartPolling({
    fetchFunction: fetchDispatcherBookings,
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

  const handleDeleteAppointment = (bookingId: number) => {
    // Just trigger a refetch - the AppointmentCard handles the actual deletion
    refetch();
  };

  // Field agent workflow functions for dispatcher assignments
  const handleStatusChange = async (bookingId: number, status: string) => {
    try {
      // Optimistic update - immediately update UI
      optimisticUpdate(bookingId, { status: status as Booking['status'] });
      
      // Make API call
      await updateBooking(bookingId, { status });
      
      // Refresh data to ensure consistency
      await refetchDispatcherBookings();
    } catch (err) {
      console.error(err);
      const errorMessage = (err as Error).message || "Error updating booking status";
      
      if (errorMessage.includes("Authentication required")) {
        onLogout();
      } else {
        // Revert optimistic update on error
        await refetchDispatcherBookings();
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
      await refetchDispatcherBookings();
    } catch (err) {
      console.error(err);
      const errorMessage = (err as Error).message || "Error saving disposition";
      
      if (errorMessage.includes("Authentication required")) {
        onLogout();
      } else {
        // Revert optimistic update on error
        await refetchDispatcherBookings();
        alert(errorMessage);
      }
    }
  };

  // Categorize bookings by status and region
  const globalBookings = bookings.filter((b) => b.region_is_global);
  const teamBookings = bookings.filter((b) => !b.region_is_global);
  
  const globalScheduled = globalBookings.filter((b) => ["scheduled"].includes(b.status.toLowerCase()));
  const globalEnroute = globalBookings.filter((b) => ["enroute"].includes(b.status.toLowerCase()));
  const globalOnsite = globalBookings.filter((b) => ["on-site"].includes(b.status.toLowerCase()));
  const globalCompleted = globalBookings.filter((b) => ["completed"].includes(b.status.toLowerCase()));

  const teamScheduled = teamBookings.filter((b) => ["scheduled"].includes(b.status.toLowerCase()));
  const teamEnroute = teamBookings.filter((b) => ["enroute"].includes(b.status.toLowerCase()));
  const teamOnsite = teamBookings.filter((b) => ["on-site"].includes(b.status.toLowerCase()));
  const teamCompleted = teamBookings.filter((b) => ["completed"].includes(b.status.toLowerCase()));

  // Categorize dispatcher's own assignments (field agent view)
  const myScheduled = dispatcherBookings.filter((b) => b.status.toLowerCase() === "scheduled");
  const myEnroute = dispatcherBookings.filter((b) => b.status.toLowerCase() === "enroute");
  const myOnsite = dispatcherBookings.filter((b) => b.status.toLowerCase() === "on-site");
  const myCompleted = dispatcherBookings.filter((b) => b.status.toLowerCase() === "completed");

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
            <Tab label="Global Appointments" />
            <Tab label="Team Appointments" />
            <Tab label="My Assignments" />
            <Tab label="Team Time-Off" />
            <Tab label="Team Timesheets" />
            <Tab label="Timesheet History" />
          </Tabs>
        </Box>

        {/* Global Appointments Tab */}
        {tabValue === 0 && (
          <>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Global Appointments (accessible by all teams)
            </Typography>
            <Filters 
              onNewAppt={handleModalOpen} 
              onRefresh={refetch}
              refreshing={loading}
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <QueueCard
                title="Queue — Scheduled"
                badgeColor="bg-blue-50 text-blue-700"
                count={globalScheduled.length}
              >
                {globalScheduled.map((appt) => (
                  <AppointmentCard 
                    key={appt.bookingId} 
                    appt={appt}
                    addressText={appt.customer_address ?? ""}
                    onAgentChange={refetch}
                    onDelete={handleDeleteAppointment}
                    userRole="dispatcher" />
                ))}
              </QueueCard>

              <QueueCard
                title="En Route"
                badgeColor="bg-blue-50 text-blue-700"
                count={globalEnroute.length}
              >
                {globalEnroute.map((appt) => (
                  <AppointmentCard 
                    key={appt.bookingId} 
                    appt={appt}
                    addressText={appt.customer_address ?? ""}
                    onAgentChange={refetch}
                    onDelete={handleDeleteAppointment}
                    userRole="dispatcher" />
                ))}
              </QueueCard>

              <QueueCard
                title="On Site"
                badgeColor="bg-yellow-50 text-yellow-700"
                count={globalOnsite.length}
              >
                {globalOnsite.map((appt) => (
                  <AppointmentCard 
                    key={appt.bookingId} 
                    appt={appt}
                    addressText={appt.customer_address ?? ""}
                    onAgentChange={refetch}
                    onDelete={handleDeleteAppointment}
                    userRole="dispatcher" />
                ))}
              </QueueCard>

              <QueueCard
                title="Completed Today"
                badgeColor="bg-emerald-50 text-emerald-700"
                count={globalCompleted.length}
              >
                {globalCompleted.map((appt) => (
                  <AppointmentCard 
                    key={appt.bookingId} 
                    appt={appt}
                    addressText={appt.customer_address ?? ""}
                    onAgentChange={refetch}
                    onDelete={handleDeleteAppointment}
                    userRole="dispatcher" />
                ))}
              </QueueCard>
            </div>
          </>
        )}

        {/* Team Appointments Tab */}
        {tabValue === 1 && (
          <>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Team Appointments (your region only)
            </Typography>
            <Filters 
              onNewAppt={handleModalOpen} 
              onRefresh={refetch}
              refreshing={loading}
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <QueueCard
                title="Queue — Scheduled"
                badgeColor="bg-blue-50 text-blue-700"
                count={teamScheduled.length}
              >
                {teamScheduled.map((appt) => (
                  <AppointmentCard 
                    key={appt.bookingId} 
                    appt={appt}
                    addressText={appt.customer_address ?? ""}
                    onAgentChange={refetch}
                    onDelete={handleDeleteAppointment}
                    userRole="dispatcher" />
                ))}
              </QueueCard>

              <QueueCard
                title="En Route"
                badgeColor="bg-blue-50 text-blue-700"
                count={teamEnroute.length}
              >
                {teamEnroute.map((appt) => (
                  <AppointmentCard 
                    key={appt.bookingId} 
                    appt={appt}
                    addressText={appt.customer_address ?? ""}
                    onAgentChange={refetch}
                    onDelete={handleDeleteAppointment}
                    userRole="dispatcher" />
                ))}
              </QueueCard>

              <QueueCard
                title="On Site"
                badgeColor="bg-yellow-50 text-yellow-700"
                count={teamOnsite.length}
              >
                {teamOnsite.map((appt) => (
                  <AppointmentCard 
                    key={appt.bookingId} 
                    appt={appt}
                    addressText={appt.customer_address ?? ""}
                    onAgentChange={refetch}
                    onDelete={handleDeleteAppointment}
                    userRole="dispatcher" />
                ))}
              </QueueCard>

              <QueueCard
                title="Completed Today"
                badgeColor="bg-emerald-50 text-emerald-700"
                count={teamCompleted.length}
              >
                {teamCompleted.map((appt) => (
                  <AppointmentCard 
                    key={appt.bookingId} 
                    appt={appt}
                    addressText={appt.customer_address ?? ""}
                    onAgentChange={refetch}
                    onDelete={handleDeleteAppointment}
                    userRole="dispatcher" />
                ))}
              </QueueCard>
            </div>
          </>
        )}

        {/* My Assignments Tab (Field Agent View) */}
        {tabValue === 2 && (
          <>
            <Typography variant="h6" sx={{ mb: 2 }}>
              My Assignments (Field Agent Mode)
            </Typography>
            {dispatcherLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '30vh', flexDirection: 'column', gap: 2 }}>
                <CircularProgress />
                <Typography color="text.primary">Loading your assignments...</Typography>
              </Box>
            ) : dispatcherError ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '30vh' }}>
                <Typography color="error.main">{dispatcherError}</Typography>
              </Box>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Scheduled */}
                <QueueCard
                  title="Scheduled"
                  badgeColor="bg-blue-50 text-blue-700"
                  count={myScheduled.length}
                >
                  {myScheduled.map((appt) => (
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
                  count={myEnroute.length}
                >
                  {myEnroute.map((appt) => (
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
                  count={myOnsite.length}
                >
                  {myOnsite.map((appt) => (
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
                  count={myCompleted.length}
                >
                  {myCompleted.map((appt) => (
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
          </>
        )}

        {/* Time-Off Management Tab */}
        {tabValue === 3 && (
          <TimeOffManagement onLogout={onLogout} userRole="dispatcher" />
        )}

        {/* Timesheet Management Tab */}
        {tabValue === 4 && (
          <TimesheetManagement onLogout={onLogout} userRole="dispatcher" />
        )}

        {/* Timesheet History Tab */}
        {tabValue === 5 && (
          <TimesheetHistory onLogout={onLogout} userRole="dispatcher" />
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