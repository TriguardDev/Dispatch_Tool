import { useState, useMemo, useCallback, memo, useEffect } from "react";
import type { Booking } from "../api/crud";
import { Card, CardContent, Typography, Chip, Box, Divider, Select, MenuItem, FormControl, TextField, Button, InputLabel, IconButton, Collapse, CircularProgress } from "@mui/material";
import { AccessTime, LocationOn, Person, Assignment, Add, Remove, Delete } from "@mui/icons-material";
import { searchAgents, updateBooking, deleteBooking } from "../api/crud";

interface AgentWithAvailability {
  agentId: number;
  name: string;
  distance: number;
  availability_status: string;
  team_id?: number;
  unavailable_reason?: string;
}

interface Props {
  appt: Booking;
  addressText: string;
  onStatusChange?: (bookingId: number, status: string) => void;
  onDispositionSave?: (bookingId: number, dispositionType: string, note: string) => void;
  onAgentChange?: () => void; // Callback to refresh data after agent assignment
  onDelete?: (bookingId: number) => void; // Callback when appointment is deleted
  userRole?: "admin" | "dispatcher" | "field_agent"; // User role to control permissions
}

interface Agent {
  distance: string;
  agentId: string;
  name: string;
}

// Constants
const STATUS_CONFIG: Record<string, { color: "primary" | "warning" | "success" | "info" | "error"; label: string }> = {
  scheduled: { color: "warning", label: "Scheduled" },
  enroute: { color: "info", label: "En Route" },
  "on-site": { color: "primary", label: "On Site" },
  completed: { color: "success", label: "Completed" },
};

const BASE_URL = import.meta.env.VITE_BASE_API_URL;

// Helper Components
const InfoRow = memo(({ icon, children }: { icon: React.ReactElement; children: React.ReactNode }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
    {icon}
    {children}
  </Box>
));

const StatusChip = memo(({ status }: { status: Booking["status"] }) => {
  const config = STATUS_CONFIG[status] || { color: "warning" as const, label: status };
  return (
    <Chip 
      label={config.label}
      color={config.color}
      size="small"
      variant="filled"
      sx={{
        fontWeight: 500,
        fontSize: '0.75rem',
        height: 24
      }}
    />
  );
});

const DispositionNote = memo(({ note, expanded }: { note: string; expanded: boolean }) => (
  <Collapse in={expanded}>
    <Box sx={{ mt: 1 }}>
      <Typography 
        variant="body2" 
        sx={{ 
          p: 1.5,
          borderRadius: 1,
          fontSize: '0.875rem',
          lineHeight: 1.4,
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Typography component="span" fontWeight="600" color="text.secondary" sx={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Note:
        </Typography>
        <br />
        <Typography component="span" color="text.primary">
          {note}
        </Typography>
      </Typography>
    </Box>
  </Collapse>
));

const AppointmentCard = memo(function AppointmentCard({ appt, addressText, onStatusChange, onDispositionSave, onAgentChange, onDelete, userRole }: Props) {
  // State management
  const [note, setNote] = useState("");
  const [selectedDisposition, setSelectedDisposition] = useState(appt.disposition_code || "");
  const [dispositionSaved, setDispositionSaved] = useState(false);
  const [noteExpanded, setNoteExpanded] = useState(false);
  const [agents, setAgents] = useState<AgentWithAvailability[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const [agentsLoaded, setAgentsLoaded] = useState(false); // Track if agents have been loaded
  const [dispositionOptions, setDispositionOptions] = useState<Array<{value: string, label: string}>>([]);
  const [loadingDispositions, setLoadingDispositions] = useState(false);

  // Computed values
  const hasExistingDisposition = useMemo(() => 
    appt.disposition_code && appt.disposition_code !== "", 
    [appt.disposition_code]
  );

  const showDispositionForm = appt.status === 'completed' && onDispositionSave && !dispositionSaved && !hasExistingDisposition;
  const showStatusChangeForm = onStatusChange && appt.status !== 'completed';
  
  // Get next possible status based on current status
  const getNextStatusOptions = (currentStatus: string) => {
    switch (currentStatus.toLowerCase()) {
      case 'scheduled':
        return [{ value: 'enroute', label: 'Start En Route', color: 'info.main' }];
      case 'enroute':
        return [{ value: 'on-site', label: 'Arrive On Site', color: 'primary.main' }];
      case 'on-site':
        return [{ value: 'completed', label: 'Mark Completed', color: 'success.main' }];
      default:
        return [];
    }
  };

  // Fetch disposition types
  const fetchDispositionTypes = useCallback(async () => {
    if (dispositionOptions.length > 0) return; // Already loaded
    
    setLoadingDispositions(true);
    try {
      const response = await fetch(`${BASE_URL}/disposition-types`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const options = data.data.map((type: { typeCode: string; description: string }) => ({
            value: type.typeCode,
            label: type.description
          }));
          setDispositionOptions(options);
        }
      }
    } catch (err) {
      console.error('Error fetching disposition types:', err);
    } finally {
      setLoadingDispositions(false);
    }
  }, [dispositionOptions.length]);

  // Load disposition types when component mounts or when disposition form is shown
  useEffect(() => {
    if (showDispositionForm) {
      fetchDispositionTypes();
    }
  }, [showDispositionForm, fetchDispositionTypes]);

  // Event handlers
  const handleDispositionSave = useCallback(() => {
    if (onDispositionSave) {
      onDispositionSave(appt.bookingId, selectedDisposition, note);
      setDispositionSaved(true);
    }
  }, [onDispositionSave, appt.bookingId, selectedDisposition, note]);

  // Remove unused variable warning by using the function
  // const handleStatusChange = useCallback((newStatus: string) => {
  //   if (onStatusChange) {
  //     onStatusChange(appt.bookingId, newStatus);
  //   }
  // }, [onStatusChange, appt.bookingId]);

  const toggleNoteExpansion = useCallback(() => setNoteExpanded(!noteExpanded), [noteExpanded]);

  const handleSearchAgents = useCallback(async () => {
    if (!appt.customer_latitude || !appt.customer_longitude) {
      console.warn("Customer location not available for agent search");
      return;
    }
    
    setLoadingAgents(true);
    try {
      const data = await searchAgents({
        latitude: appt.customer_latitude.toString(),
        longitude: appt.customer_longitude.toString(),
        booking_date: appt.booking_date,
        booking_time: appt.booking_time,
      });
      setAgents(data);
      setAgentsLoaded(true);
    } catch (err) {
      console.error("Error fetching agents:", err);
    } finally {
      setLoadingAgents(false);
    }
  }, [appt.customer_latitude, appt.customer_longitude, appt.booking_date, appt.booking_time]);

  const handleAgentChange = useCallback(async (newAgentId: string) => {
    try {
      const agentUpdate = newAgentId === "unassigned" 
        ? { agentId: null } 
        : { agentId: parseInt(newAgentId) };
      
      await updateBooking(appt.bookingId, agentUpdate);
      setAgentDropdownOpen(false);
      if (onAgentChange) {
        onAgentChange(); // Refresh the booking data
      }
    } catch (err) {
      console.error("Error updating agent:", err);
      alert("Error updating assigned agent");
    }
  }, [appt.bookingId, onAgentChange]);

  const handleDispatcherSelfAssign = useCallback(async () => {
    try {
      await updateBooking(appt.bookingId, { assign_to_self: true });
      setAgentDropdownOpen(false);
      if (onAgentChange) {
        onAgentChange(); // Refresh the booking data
      }
    } catch (err) {
      console.error("Error assigning to self:", err);
      alert("Error assigning appointment to yourself");
    }
  }, [appt.bookingId, onAgentChange]);

  const handleDelete = useCallback(async () => {
    if (!onDelete || userRole === 'field_agent') return;
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the appointment for ${appt.customer_name} on ${appt.booking_date}?`
    );
    
    if (confirmDelete) {
      try {
        console.log("Attempting to delete booking with ID:", appt.bookingId);
        const result = await deleteBooking(appt.bookingId);
        console.log("Delete result:", result);
        
        if (result.success) {
          // Call the onDelete callback to refresh the data
          onDelete(appt.bookingId);
        } else {
          throw new Error(result.error || "Delete failed");
        }
      } catch (err) {
        console.error("Error deleting appointment:", err);
        console.error("Booking ID that failed:", appt.bookingId);
        alert(`Failed to delete appointment: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  }, [appt.bookingId, appt.customer_name, appt.booking_date, onDelete, userRole]);

  // Render sections
  const renderHeader = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
      <Typography 
        variant="h6" 
        fontWeight="600" 
        color="text.primary"
        sx={{ 
          fontSize: '1.1rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: userRole === 'field_agent' ? '70%' : '55%'
        }}
      >
        {appt.customer_name}
      </Typography>
      <StatusChip status={appt.status} />
    </Box>
  );

  const renderBasicInfo = () => (
    <>
      <InfoRow icon={<Person sx={{ fontSize: 16, color: 'text.secondary' }} />}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" color="text.secondary" fontWeight="600" sx={{ mb: 0.5 }}>
            Assigned to:
          </Typography>
          {userRole === 'field_agent' ? (
            // Field agents see read-only assigned agent info
            <Typography variant="body2" fontWeight="500" sx={{ py: 1 }}>
              {appt.assigned_to || appt.agent_name || appt.dispatcher_name || "No one assigned"}
            </Typography>
          ) : (
            // Admins and dispatchers can reassign agents
            <FormControl fullWidth size="small" variant="outlined">
              <Select
                value={agentDropdownOpen ? "" : (appt.assigned_to || appt.agent_name || "")}
                open={agentDropdownOpen}
                onOpen={() => {
                  setAgentDropdownOpen(true);
                  if (!agentsLoaded && !loadingAgents) {
                    handleSearchAgents(); // Only search if not already loaded
                  }
                }}
                onClose={() => setAgentDropdownOpen(false)}
                displayEmpty
                renderValue={(selected) => {
                  if (loadingAgents) {
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={14} />
                        <Typography variant="body2">Loading agents...</Typography>
                      </Box>
                    );
                  }
                  return selected || appt.assigned_to || appt.agent_name || "No assignment";
                }}
                sx={{
                  '& .MuiSelect-select': {
                    py: 1,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'divider',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderWidth: 1,
                  }
                }}
              >
                {[
                  // Unassigned option
                  <MenuItem 
                    key="unassigned" 
                    value="unassigned"
                    onClick={() => handleAgentChange("unassigned")}
                    sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
                  >
                    <Typography variant="body2" fontWeight="500" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      Unassigned
                    </Typography>
                  </MenuItem>,
                  
                  // Assign to self option (only for dispatchers)
                  ...(userRole === 'dispatcher' ? [
                    <MenuItem 
                      key="assign-to-self" 
                      value="assign-to-self"
                      onClick={() => handleDispatcherSelfAssign()}
                      sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
                    >
                      <Typography variant="body2" fontWeight="500" color="primary.main" sx={{ fontStyle: 'italic' }}>
                        Assign to Self
                      </Typography>
                    </MenuItem>
                  ] : []),
                  
                  // Refresh agents option (only show if agents are loaded)
                  ...(agentsLoaded ? [
                    <MenuItem 
                      key="refresh" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSearchAgents();
                      }}
                      sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
                      disabled={loadingAgents}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {loadingAgents && <CircularProgress size={14} />}
                        <Typography variant="body2" color="primary.main" sx={{ fontStyle: 'italic' }}>
                          {loadingAgents ? 'Refreshing...' : 'Refresh agents'}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ] : []),
                  
                  // Available agents or loading state
                  ...(loadingAgents && !agentsLoaded ? [
                    <MenuItem key="loading" disabled>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={16} />
                        <Typography variant="body2">Searching for nearby agents...</Typography>
                      </Box>
                    </MenuItem>
                  ] : [
                    // Available agents only
                    ...agents.filter(agent => agent.availability_status === 'available').map((agent) => (
                      <MenuItem 
                        key={agent.agentId} 
                        value={agent.agentId}
                        onClick={() => handleAgentChange(agent.agentId.toString())}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                          <Typography variant="body2" fontWeight="500">
                            {agent.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {Math.ceil(Number(agent.distance))} km
                          </Typography>
                        </Box>
                      </MenuItem>
                    )),
                    
                    // Show message if no available agents found (only if agents have been loaded)
                    ...(agents.filter(agent => agent.availability_status === 'available').length === 0 && agentsLoaded && !loadingAgents ? [
                      <MenuItem key="no-agents" disabled>
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          No nearby agents available
                        </Typography>
                      </MenuItem>
                    ] : [])
                  ])
                ]}
              </Select>
            </FormControl>
          )}
        </Box>
      </InfoRow>

      <InfoRow icon={<LocationOn sx={{ fontSize: 16, color: 'text.secondary', mt: 0.1 }} />}>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ 
            lineHeight: 1.4,
            wordBreak: 'break-word'
          }}
        >
          {addressText}
        </Typography>
      </InfoRow>

      <InfoRow icon={<AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />}>
        <Typography variant="body2" color="text.secondary" fontWeight="500">
          {appt.booking_date} at {appt.booking_time}
        </Typography>
      </InfoRow>

      {/* Call Center Agent Information */}
      {appt.call_center_agent_name && (
        <InfoRow icon={<Person sx={{ fontSize: 16, color: 'info.main' }} />}>
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight="600" sx={{ mb: 0.5 }}>
              Call Center Agent:
            </Typography>
            <Typography variant="body2" color="text.primary" fontWeight="500">
              {appt.call_center_agent_name}
            </Typography>
            {appt.call_center_agent_email && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {appt.call_center_agent_email}
              </Typography>
            )}
          </Box>
        </InfoRow>
      )}
    </>
  );

  const renderDisposition = () => (
    <>
      <Divider sx={{ my: 1.5 }} />
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <Assignment sx={{ fontSize: 16, color: 'success.main', mt: 0.1 }} />
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {appt.disposition_description ? (
              <Typography 
                variant="body2" 
                color="success.main" 
                fontWeight="600" 
                sx={{ mb: 0.5 }}
              >
                {appt.disposition_description}
              </Typography>
            ) : (
              <Typography 
                variant="body2" 
                color="text.secondary" 
                fontStyle="italic"
                sx={{ mb: 0.5 }}
              >
                No disposition yet
              </Typography>
            )}
            
            {appt.disposition_note && (
              <IconButton
                size="small"
                onClick={toggleNoteExpansion}
                sx={{ ml: 1, p: 0.5 }}
              >
                {noteExpanded ? (
                  <Remove sx={{ fontSize: 16, color: 'text.secondary' }} />
                ) : (
                  <Add sx={{ fontSize: 16, color: 'text.secondary' }} />
                )}
              </IconButton>
            )}
          </Box>
          
          {appt.disposition_note && (
            <DispositionNote 
              note={appt.disposition_note}
              expanded={noteExpanded}
            />
          )}
        </Box>
      </Box>
    </>
  );

  return (
    <Card 
      variant="outlined" 
      sx={{ 
        mb: 1.5,
        borderRadius: 2,
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        transition: 'all 0.2s ease-in-out',
        position: 'relative',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          transform: 'translateY(-1px)',
        }
      }}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        {renderHeader()}
        {renderBasicInfo()}
        
        {/* Disposition section */}
        {(appt.disposition_description || appt.disposition_note) && renderDisposition()}

        {/* Status Change Form */}
        {showStatusChangeForm && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Assignment sx={{ fontSize: 16, color: 'text.secondary', mt: 0.1 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary" fontWeight="600" sx={{ mb: 1 }}>
                  Next Step
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {getNextStatusOptions(appt.status).map((option) => (
                    <Button
                      key={option.value}
                      variant="contained"
                      size="small"
                      onClick={() => onStatusChange(appt.bookingId, option.value)}
                      sx={{
                        bgcolor: option.color,
                        '&:hover': {
                          bgcolor: option.color,
                          opacity: 0.8,
                        },
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                      }}
                    >
                      {option.label}
                    </Button>
                  ))}
                </Box>
              </Box>
            </Box>
          </>
        )}

        {/* Disposition Form for Completed Appointments */}
        {showDispositionForm && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Assignment sx={{ fontSize: 16, color: 'success.main', mt: 0.1 }} />
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="body2" color="text.secondary" fontWeight="600">
                  Disposition & Note
                </Typography>
                
                <FormControl fullWidth size="small">
                  <InputLabel id="disposition-label">Disposition</InputLabel>
                  <Select
                    labelId="disposition-label"
                    label="Disposition"
                    value={selectedDisposition}
                    onChange={(e) => setSelectedDisposition(e.target.value)}
                    sx={{
                      '& .MuiSelect-select': {
                        py: 1,
                        fontSize: '0.875rem',
                      },
                    }}
                  >
                    <MenuItem value="">
                      {loadingDispositions ? "Loading..." : "Select Disposition"}
                    </MenuItem>
                    {dispositionOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  multiline
                  rows={3}
                  placeholder="Add a note (optional)..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  variant="outlined"
                  size="small"
                  fullWidth
                  label="Note"
                  sx={{
                    '& .MuiInputBase-root': {
                      fontSize: '0.875rem',
                    },
                  }}
                />

                <Button
                  variant="contained"
                  size="small"
                  onClick={handleDispositionSave}
                  sx={{ alignSelf: 'flex-start', px: 3 }}
                >
                  Save Disposition + Note
                </Button>
              </Box>
            </Box>
          </>
        )}
        
        {/* Delete button positioned at bottom right */}
        {userRole !== 'field_agent' && onDelete && (
          <IconButton
            size="small"
            onClick={handleDelete}
            sx={{ 
              position: 'absolute',
              bottom: 8,
              right: 8,
              color: 'error.main',
              backgroundColor: 'background.paper',
              border: '1px solid',
              borderColor: 'error.main',
              '&:hover': { 
                backgroundColor: 'error.main',
                color: 'error.contrastText'
              },
              zIndex: 1
            }}
            title="Delete appointment"
          >
            <Delete sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      </CardContent>
    </Card>
  );
});

export default AppointmentCard;
