import { useState } from "react";
import type { Booking } from "../api/crud";
import { Card, CardContent, Typography, Chip, Box, Divider, Select, MenuItem, FormControl, TextField, Button, InputLabel } from "@mui/material";
import { AccessTime, LocationOn, Person, Assignment } from "@mui/icons-material";

interface Props {
  appt: Booking;
  addressText: string;
  onStatusChange?: (bookingId: number, status: string) => void;
  onDispositionSave?: (bookingId: number, dispositionType: string, note: string) => void;
}

const statusColors: Record<Booking["status"], "primary" | "warning" | "success"> = {
  "in-progress": "primary",
  scheduled: "warning", 
  completed: "success",
};

const statusLabels: Record<Booking["status"], string> = {
  "in-progress": "En Route / On Site",
  scheduled: "Scheduled",
  completed: "Completed",
};

export default function AppointmentCard({ appt, addressText, onStatusChange, onDispositionSave }: Props) {
  const [note, setNote] = useState("");
  const [selectedDisposition, setSelectedDisposition] = useState(appt.disposition_code || "");
  const [dispositionSaved, setDispositionSaved] = useState(false);

  // Check if disposition already exists (already saved)
  const hasExistingDisposition = appt.disposition_code && appt.disposition_code !== "";

  const handleDispositionSave = () => {
    if (onDispositionSave) {
      onDispositionSave(appt.bookingId, selectedDisposition, note);
      setDispositionSaved(true);
    }
  };
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
        {/* Header with name and status */}
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
          <Chip 
            label={statusLabels[appt.status]} 
            color={statusColors[appt.status]}
            size="small"
            variant="filled"
            sx={{
              fontWeight: 500,
              fontSize: '0.75rem',
              height: 24
            }}
          />
        </Box>

        {/* Agent assignment */}
        {appt.agent_name && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              <Typography component="span" fontWeight="600">
                Assigned to:
              </Typography>{' '}
              <Typography component="span" color="text.primary" fontWeight="500">
                {appt.agent_name}
              </Typography>
            </Typography>
          </Box>
        )}

        {/* Address section */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
          <LocationOn sx={{ fontSize: 16, color: 'text.secondary', mt: 0.1 }} />
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
        </Box>

        {/* Date and time section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary" fontWeight="500">
            {appt.booking_date} at {appt.booking_time}
          </Typography>
        </Box>

        {/* Disposition section */}
        {(appt.disposition_description || appt.disposition_note) && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Assignment sx={{ fontSize: 16, color: 'success.main', mt: 0.1 }} />
              <Box sx={{ flex: 1 }}>
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
                  <Typography 
                    variant="body2" 
                    color="text.primary"
                    sx={{ 
                      mt: 0.5,
                      p: 1,
                      backgroundColor: 'grey.50',
                      borderRadius: 1,
                      fontSize: '0.85rem',
                      lineHeight: 1.4
                    }}
                  >
                    <Typography component="span" fontWeight="600" color="text.secondary">
                      Note:
                    </Typography>{' '}
                    {appt.disposition_note}
                  </Typography>
                )}
              </Box>
            </Box>
          </>
        )}

        {/* Status Change Form */}
        {onStatusChange && appt.status !== 'completed' && (
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
        {appt.status === 'completed' && onDispositionSave && !dispositionSaved && !hasExistingDisposition && (
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
                    <MenuItem value="SOLD_CASH_PIF">Sold – Cash Deal (Paid in Full)</MenuItem>
                    <MenuItem value="SOLD_CHECK_COLLECTED">Sold – Check Collected</MenuItem>
                    <MenuItem value="SOLD_CARD_ACH_SUBMITTED">Sold – Card/ACH Payment Submitted</MenuItem>
                    <MenuItem value="SOLD_DEPOSIT_COLLECTED">Sold – Deposit Collected (Balance Due)</MenuItem>
                    <MenuItem value="SOLD_LENDER_SUBMITTED">Sold – Lender Financing Submitted</MenuItem>
                    <MenuItem value="SOLD_LENDER_APPROVED_DOCS">Sold – Lender Approved (Docs Signed)</MenuItem>
                    <MenuItem value="SOLD_FUNDED">Sold – Funded (Lender Disbursed)</MenuItem>
                    <MenuItem value="SOLD_LENDER_DECLINED">Sold – Lender Declined</MenuItem>
                    <MenuItem value="SOLD_IN_HOUSE_PLAN">Sold – Payment Plan (In-House)</MenuItem>
                    <MenuItem value="SOLD_FINAL_PAYMENT">Sold – Balance Paid (Final Payment)</MenuItem>
                    <MenuItem value="SOLD_RESCINDED_REVERSED">Sale Rescinded / Payment Reversed</MenuItem>
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
}
