import { useState, useMemo, useCallback, memo } from "react";
import type { Booking } from "../api/crud";
import { Card, CardContent, Typography, Chip, Box, Divider, Select, MenuItem, FormControl, TextField, Button, InputLabel, IconButton, Collapse } from "@mui/material";
import { AccessTime, LocationOn, Person, Assignment, Add, Remove } from "@mui/icons-material";

interface Props {
  appt: Booking;
  addressText: string;
  onStatusChange?: (bookingId: number, status: string) => void;
  onDispositionSave?: (bookingId: number, dispositionType: string, note: string) => void;
}

// Constants
const STATUS_CONFIG: Record<Booking["status"], { color: "primary" | "warning" | "success"; label: string }> = {
  "in-progress": { color: "primary", label: "En Route / On Site" },
  scheduled: { color: "warning", label: "Scheduled" },
  completed: { color: "success", label: "Completed" },
};

const DISPOSITION_OPTIONS = [
  { value: "SOLD_CASH_PIF", label: "Sold – Cash Deal (Paid in Full)" },
  { value: "SOLD_CHECK_COLLECTED", label: "Sold – Check Collected" },
  { value: "SOLD_CARD_ACH_SUBMITTED", label: "Sold – Card/ACH Payment Submitted" },
  { value: "SOLD_DEPOSIT_COLLECTED", label: "Sold – Deposit Collected (Balance Due)" },
  { value: "SOLD_LENDER_SUBMITTED", label: "Sold – Lender Financing Submitted" },
  { value: "SOLD_LENDER_APPROVED_DOCS", label: "Sold – Lender Approved (Docs Signed)" },
  { value: "SOLD_FUNDED", label: "Sold – Funded (Lender Disbursed)" },
  { value: "SOLD_LENDER_DECLINED", label: "Sold – Lender Declined" },
  { value: "SOLD_IN_HOUSE_PLAN", label: "Sold – Payment Plan (In-House)" },
  { value: "SOLD_FINAL_PAYMENT", label: "Sold – Balance Paid (Final Payment)" },
  { value: "SOLD_RESCINDED_REVERSED", label: "Sale Rescinded / Payment Reversed" },
];

// Helper Components
const InfoRow = memo(({ icon, children }: { icon: React.ReactElement; children: React.ReactNode }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
    {icon}
    {children}
  </Box>
));

const StatusChip = memo(({ status }: { status: Booking["status"] }) => {
  const config = STATUS_CONFIG[status];
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

const AppointmentCard = memo(function AppointmentCard({ appt, addressText, onStatusChange, onDispositionSave }: Props) {
  // State management
  const [note, setNote] = useState("");
  const [selectedDisposition, setSelectedDisposition] = useState(appt.disposition_code || "");
  const [dispositionSaved, setDispositionSaved] = useState(false);
  const [noteExpanded, setNoteExpanded] = useState(false);

  // Computed values
  const hasExistingDisposition = useMemo(() => 
    appt.disposition_code && appt.disposition_code !== "", 
    [appt.disposition_code]
  );

  const showDispositionForm = appt.status === 'completed' && onDispositionSave && !dispositionSaved && !hasExistingDisposition;
  const showStatusChangeForm = onStatusChange && appt.status !== 'completed';

  // Event handlers
  const handleDispositionSave = useCallback(() => {
    if (onDispositionSave) {
      onDispositionSave(appt.bookingId, selectedDisposition, note);
      setDispositionSaved(true);
    }
  }, [onDispositionSave, appt.bookingId, selectedDisposition, note]);

  const handleStatusChange = useCallback((newStatus: string) => {
    if (onStatusChange) {
      onStatusChange(appt.bookingId, newStatus);
    }
  }, [onStatusChange, appt.bookingId]);

  const toggleNoteExpansion = useCallback(() => setNoteExpanded(!noteExpanded), [noteExpanded]);

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
          maxWidth: '70%'
        }}
      >
        {appt.customer_name}
      </Typography>
      <StatusChip status={appt.status} />
    </Box>
  );

  const renderBasicInfo = () => (
    <>
      {appt.agent_name && (
        <InfoRow icon={<Person sx={{ fontSize: 16, color: 'text.secondary' }} />}>
          <Typography variant="body2" color="text.secondary">
            <Typography component="span" fontWeight="600">
              Assigned to:
            </Typography>{' '}
            <Typography component="span" color="text.primary" fontWeight="500">
              {appt.agent_name}
            </Typography>
          </Typography>
        </InfoRow>
      )}

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
                  Update Status
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={appt.status}
                    onChange={(e) => onStatusChange(appt.bookingId, e.target.value)}
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
                    <MenuItem value="scheduled">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'warning.main' }} />
                        <Typography variant="body2" fontWeight="500">Scheduled</Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="in-progress">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
                        <Typography variant="body2" fontWeight="500">En Route / On Site</Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="completed">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
                        <Typography variant="body2" fontWeight="500">Completed</Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
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
                    <MenuItem value="">Select Disposition</MenuItem>
                    {DISPOSITION_OPTIONS.map((option) => (
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
      </CardContent>
    </Card>
  );
});

export default AppointmentCard;
