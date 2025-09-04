import type { Booking } from "../api/crud";
import { Card, CardContent, Typography, Chip, Box } from "@mui/material";

interface Props {
  appt: Booking;
  addressText: string;
}

const statusColors: Record<Booking["status"], "primary" | "warning" | "success"> = {
  "in-progress": "primary",
  scheduled: "warning", 
  completed: "success",
};

export default function AppointmentCard({ appt, addressText }: Props) {
  return (
    <Card variant="outlined" sx={{ mb: 1 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          <Typography variant="subtitle1" fontWeight="600" noWrap sx={{ maxWidth: '20ch' }}>
            {appt.customer_name}
          </Typography>
          <Chip 
            label={appt.status} 
            color={statusColors[appt.status]}
            size="small"
            variant="filled"
          />
        </Box>
        
        <Typography variant="caption" color="text.secondary" display="block">
          {addressText}
        </Typography>

        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
          {appt.booking_date} · {appt.booking_time}
        </Typography>

        {appt.agent_name && (
          <Typography variant="body2" color="text.primary" sx={{ mt: 0.5 }}>
            Assigned to: {appt.agent_name}
          </Typography>
        )}

        {appt.disposition_description ? (
          <Typography variant="body2" color="success.main" fontWeight="500" sx={{ mt: 1 }}>
            Disposition: {appt.disposition_description}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary" fontStyle="italic" sx={{ mt: 1 }}>
            No disposition yet
          </Typography>
        )}

        {appt.disposition_note && (
          <Typography variant="body2" color="text.primary" sx={{ mt: 1 }}>
            <Typography component="span" fontWeight="600">Note:</Typography> {appt.disposition_note}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
