import { useState } from "react";
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Button, 
  IconButton,
  Typography,
  Box
} from "@mui/material";
import Grid from '@mui/material/Grid';
import { Close } from "@mui/icons-material";
import { findLatLong } from "../api/location_conversion";
import { createBooking, searchAgents } from "../api/crud";
import AgentSelector from "./AgentSelector";
import PhoneInput from "./PhoneInput";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void; // Callback to refresh bookings after saving
  onLogout: () => void;
}

interface Agent {
  distance: string;
  agentId: string;
  name: string;
}

export default function NewAppointmentModal({ isOpen, onClose, onSave, onLogout }: Props) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    street_number: "",
    street_name: "",
    postal_code: "",
    city: "",
    state_province: "",
    country: "",    
    date: "",
    time: "",
    rep: "",
    type: "Roof Replacement",
  });

  const [latLon, setLatLon] = useState<{ lat: number | null, lon: number | null }>({ lat: null, lon: null });
  const [phoneValid, setPhoneValid] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  // ensure HH:MM:SS
  const formatTime = (time: string) => {
    if (!time) return "";
    return time.length === 5 ? `${time}:00` : time; // if "HH:MM", add ":00"
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    const key = id.replace("f-", "");

    // Special handling for phone number
    if (key === "phone") {
      // Remove all non-digit characters
      let digits = value.replace(/\D/g, "");
      // Limit to 10 digits
      digits = digits.slice(0, 10);

      // Format as xxx-xxx-xxxx
      let formatted = digits;
      if (digits.length > 3 && digits.length <= 6) {
        formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`;
      } else if (digits.length > 6) {
        formatted = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
      }

      setForm((prev) => ({ ...prev, [key]: formatted }));
      return;
    }

    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.phone && !phoneValid) {
      alert("Please enter a valid phone number");
      return;
    }

    // Transform flat form into backend format
    const payload = {
      customer: {
        name: form.name,
        email: form.email,
        phone: form.phone,
      },
      location: {
        latitude: latLon.lat,
        longitude: latLon.lon,
        postal_code: form.postal_code,
        street_name: form.street_name,
        street_number: form.street_number,
        city: form.city,
        state_province: form.state_province,
        country: form.country,
      },
      booking: {
        agentId: Number(form.rep),
        booking_date: form.date,
        booking_time: formatTime(form.time),
      },
    };
    
    console.log(JSON.stringify(payload))

    try {
      await createBooking(payload);
      console.log("✅ Appointment saved");

      if (onSave) onSave();
      onClose();
    } catch (err) {
      console.error("❌ Error saving appointment:", err);
      const errorMessage = (err as Error).message || "Error saving appointment";
      
      if (errorMessage.includes("Authentication required")) {
        onLogout();
      } else {
        alert(errorMessage);
      }
    }
  };

  const handleSearchAgents = async () => {
    setLoadingAgents(true);
    console.log("Searching...")
    try {
      // First get lat/long
      const { lat, lon } = await findLatLong({street_number: form.street_number, street_name: form.street_name, postal_code: form.postal_code })

      if (lat === null || lon === null){
        console.error("Could not find lat/lon for address.")
        setLatLon({ lat: null, lon: null });
        setAgents([])
      } else{
        setLatLon({ lat, lon });
        const data = await searchAgents({
          latitude: lat.toString(),
          longitude: lon.toString(),
          booking_date: form.date,
          booking_time: formatTime(form.time),
        });
        setAgents(data);
      }      
    } catch (err) {
      console.error("Error fetching agents:", err);
      const errorMessage = (err as Error).message || "Error searching agents";
      
      if (errorMessage.includes("Authentication required")) {
        onLogout();
      } else {
        alert(errorMessage);
      }
    } finally {
      setLoadingAgents(false);
    }
  };

  const handlePhoneChange = (phoneValue: string) => {
    setForm((prev) => ({ ...prev, phone: phoneValue }));
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { maxHeight: '90vh' }
      }}
    >
      <form onSubmit={handleSave}>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight="bold">
              New Appointment
            </Typography>
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Customer Fields */}
            <Grid size={{xs:12, md:6}}>
              <TextField
                id="f-name"
                label="Customer Name"
                placeholder="Bob"
                value={form.name}
                onChange={handleChange}
                required
                fullWidth
              />
            </Grid>

            <Grid size={{xs:12, md:6}}>
              <TextField
                id="f-email"
                label="Customer Email"
                type="email"
                placeholder="Bob@example.com"
                value={form.email}
                onChange={handleChange}
                required
                fullWidth
              />
            </Grid>

            <Grid size={{xs:12, md:6}}>
              <PhoneInput
                value={form.phone}
                onChange={handlePhoneChange}
                onValidityChange={setPhoneValid}
                placeholder="(123) 456-7890"
                id="f-phone"
                name="phone"
              />
            </Grid>

            {/* Address Fields */}
            <Grid size={{xs:12, md:6}}>
              <TextField
                id="f-street_number"
                label="Street Number"
                placeholder="5580"
                value={form.street_number}
                onChange={handleChange}
                fullWidth
              />
            </Grid>

            <Grid size={{xs:12, md:6}}>
              <TextField
                id="f-street_name"
                label="Street Name"
                placeholder="Lacklon Lane"
                value={form.street_name}
                onChange={handleChange}
                fullWidth
              />
            </Grid>

            <Grid size={{xs:12, md:6}}>
              <TextField
                id="f-city"
                label="City"
                placeholder="Bedford"
                value={form.city}
                onChange={handleChange}
                fullWidth
              />
            </Grid>

            <Grid size={{xs:12, md:6}}>
              <TextField
                id="f-state_province"
                label="Province"
                placeholder="NS"
                value={form.state_province}
                onChange={handleChange}
                fullWidth
              />
            </Grid>

            <Grid size={{xs:12, md:6}}>
              <TextField
                id="f-country"
                label="Country"
                placeholder="Canada"
                value={form.country}
                onChange={handleChange}
                fullWidth
              />
            </Grid>

            <Grid size={{xs:12, md:6}}>
              <TextField
                id="f-postal_code"
                label="Postal Code"
                placeholder="BA4 3J7"
                value={form.postal_code}
                onChange={handleChange}
                fullWidth
              />
            </Grid>

            {/* Date + Time */}
            <Grid size={{xs:12, md:6}}>
              <TextField
                id="f-date"
                label="Date"
                type="date"
                value={form.date}
                onChange={handleChange}
                required
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            <Grid size={{xs:12, md:6}}>
              <TextField
                id="f-time"
                label="Time (local)"
                type="time"
                value={form.time}
                onChange={handleChange}
                required
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            {/* Agent Selection */}
            <Grid size={{ xs: 12 }}>
              <Box display="flex" alignItems="flex-end" gap={2}>
                <AgentSelector
                  agents={agents}
                  selectedRep={form.rep}
                  loading={loadingAgents}
                  onChange={(agentId: string) => setForm(prev => ({ ...prev, rep: agentId }))}
                  onSearch={handleSearchAgents}
                  disabledSearch={!form.postal_code || !form.date || !form.time}
                />
              </Box>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} color="secondary">
            Cancel
          </Button>
          <Button type="submit" variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}