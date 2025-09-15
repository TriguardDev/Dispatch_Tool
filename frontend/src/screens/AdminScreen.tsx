import { useState } from "react";
import { Box, Typography, CircularProgress, Container, Tabs, Tab } from "@mui/material";
import TopBar from "../components/TopBar";
import Filters from "../components/Filters";
import QueueCard from "../components/QueueCard";
import AppointmentCard from "../components/AppointmentCard";
import NewAppointmentModal from "../components/NewAppointmentModal";
import AdminManagement from "../components/AdminManagement";
import TimeOffManagement from "../components/TimeOffManagement";
import { getAllBookings, type Booking } from "../api/crud";
import { useSmartPolling } from "../hooks/useSmartPolling";

interface AdminScreenProps {
  onLogout: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `admin-tab-${index}`,
    'aria-controls': `admin-tabpanel-${index}`,
  };
}

export default function AdminScreen({ onLogout }: AdminScreenProps) {
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Categorize bookings by status
  const scheduled = bookings.filter((b) => ["scheduled"].includes(b.status.toLowerCase()));
  const active = bookings.filter((b) => ["in-progress"].includes(b.status.toLowerCase()));
  const completed = bookings.filter((b) => ["completed"].includes(b.status.toLowerCase()));

  if (loading && tabValue === 0) {
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
  
  if (error && tabValue === 0) {
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
        
        {/* Admin Navigation Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="admin navigation tabs">
            <Tab label="Bookings Dashboard" {...a11yProps(0)} />
            <Tab label="User Management" {...a11yProps(1)} />
            <Tab label="Time-Off Management" {...a11yProps(2)} />
          </Tabs>
        </Box>

        {/* Bookings Dashboard Tab */}
        <TabPanel value={tabValue} index={0}>
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
        </TabPanel>

        {/* User Management Tab */}
        <TabPanel value={tabValue} index={1}>
          <AdminManagement />
        </TabPanel>

        {/* Time-Off Management Tab */}
        <TabPanel value={tabValue} index={2}>
          <TimeOffManagement onLogout={onLogout} userRole="admin" />
        </TabPanel>

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