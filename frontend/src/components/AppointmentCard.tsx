import type { Booking } from "../api/crud";
import { Card, CardContent, Typography, Chip, Box, Divider } from "@mui/material";
import { AccessTime, LocationOn, Person, Assignment } from "@mui/icons-material";

interface Props {
  appt: Booking;
  addressText: string;
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

export default function AppointmentCard({ appt, addressText }: Props) {
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
      </CardContent>
    </Card>
  );
}
