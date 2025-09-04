import { Box, TextField, Select, MenuItem, FormControl, InputLabel, Button } from "@mui/material";
import Grid from '@mui/material/Grid';

interface FiltersProps {
  onNewAppt: () => void;
}

export default function Filters({ onNewAppt }: FiltersProps) {
  return (
    <Box sx={{ mb: 3 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid size={{ xs: 12, md: 2 }}>
          <TextField
            type="date"
            label="Date"
            fullWidth
            size="small"
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select defaultValue="" label="Status">
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="scheduled">Scheduled</MenuItem>
              <MenuItem value="en-route">En Route</MenuItem>
              <MenuItem value="on-site">On Site</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="canceled">Canceled</MenuItem>
              <MenuItem value="no-show">No Show</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid size={{ xs: 12, md: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Agent</InputLabel>
            <Select defaultValue="" label="Agent">
              <MenuItem value="">All Agents</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <TextField
            placeholder="Search name, address, notes"
            fullWidth
            size="small"
            label="Search"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Sort by</InputLabel>
            <Select defaultValue="start" label="Sort by">
              <MenuItem value="start">Sort by Start</MenuItem>
              <MenuItem value="status">Sort by Status</MenuItem>
              <MenuItem value="rep">Sort by Rep</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid size={{ xs: 12, md: 1 }}>
          <Button 
            variant="contained" 
            onClick={onNewAppt}
            fullWidth
            sx={{ whiteSpace: 'nowrap' }}
          >
            + New Appt
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}
