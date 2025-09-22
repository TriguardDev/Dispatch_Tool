import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  MenuItem,
  Select,
  InputLabel,
  Card,
  CardContent,
  Grid,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  DateRange as DateRangeIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

interface TimesheetSlot {
  day_of_week: string;
  start_time: string;
  end_time: string;
}

interface Timesheet {
  timesheet_id: number;
  agentId: number;
  week_start_date: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_by?: number;
  reviewer_type?: string;
  reviewed_at?: string;
  agent_name: string;
  reviewer_name?: string;
  slots: TimesheetSlot[];
  target_week_type?: 'current' | 'next' | 'future';
}

const BASE_URL = import.meta.env.VITE_BASE_API_URL;

interface Props {
  onLogout: () => void;
}

const DAYS_OF_WEEK = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

const DAY_LABELS = {
  monday: 'Monday',
  tuesday: 'Tuesday', 
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday'
};

export default function TimesheetSubmission({ onLogout }: Props) {
  const [currentTimesheet, setCurrentTimesheet] = useState<Timesheet | null>(null);
  const [targetWeekType, setTargetWeekType] = useState<'current' | 'next' | 'future'>('current');
  const [targetWeekStart, setTargetWeekStart] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form states for new timesheet
  const [slots, setSlots] = useState<TimesheetSlot[]>([]);
  const [newSlot, setNewSlot] = useState({
    day_of_week: '',
    start_time: '',
    end_time: ''
  });

  const fetchCurrentTimesheet = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/timesheet/current`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCurrentTimesheet(data.data);
          setTargetWeekType(data.target_week_type || 'current');
          if (data.data) {
            setTargetWeekStart(data.data.week_start_date);
          } else if (data.target_week_start) {
            setTargetWeekStart(data.target_week_start);
          }
        } else {
          setCurrentTimesheet(null);
        }
      } else if (res.status === 401) {
        onLogout();
      } else {
        setError('Failed to fetch timesheet');
      }
    } catch (err) {
      setError('Failed to fetch timesheet');
      console.error('Error fetching timesheet:', err);
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => {
    fetchCurrentTimesheet();
  }, [fetchCurrentTimesheet]);

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 10; hour <= 18; hour += 2) { // 2-hour intervals from 10am to 6pm (last slot 6-8pm)
      const timeString = `${hour.toString().padStart(2, '0')}:00`;
      options.push(timeString);
    }
    return options;
  };

  const getEndTime = (startTime: string) => {
    if (!startTime) return '';
    const hour = parseInt(startTime.split(':')[0]);
    const endHour = hour + 2;
    return `${endHour.toString().padStart(2, '0')}:00`;
  };

  const handleAddSlot = () => {
    if (!newSlot.day_of_week || !newSlot.start_time) {
      setError('Please select day and start time');
      return;
    }

    const endTime = getEndTime(newSlot.start_time);
    const endHour = parseInt(endTime.split(':')[0]);
    
    if (endHour > 20) {
      setError('Time slot would extend past business hours (8:00 PM)');
      return;
    }

    // Check for duplicates
    const duplicate = slots.find(slot => 
      slot.day_of_week === newSlot.day_of_week && 
      slot.start_time === newSlot.start_time
    );
    
    if (duplicate) {
      setError('This time slot already exists');
      return;
    }

    const slotToAdd: TimesheetSlot = {
      day_of_week: newSlot.day_of_week,
      start_time: newSlot.start_time,
      end_time: endTime
    };

    setSlots([...slots, slotToAdd]);
    setNewSlot({ day_of_week: '', start_time: '', end_time: '' });
    setError(''); // Clear error on successful add
  };

  const handleRemoveSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const handleSubmitTimesheet = async () => {
    if (slots.length === 0) {
      setError('Please add at least one time slot');
      return;
    }

    setSubmitting(true);
    setError(''); // Clear any previous errors

    try {
      const res = await fetch(`${BASE_URL}/timesheet/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ slots }),
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        await fetchCurrentTimesheet();
        setIsSubmitModalOpen(false);
        setSlots([]);
        setError(''); // Clear error on success
      } else {
        const errorMessage = data.error || 'Failed to submit timesheet';
        setError(errorMessage);
        console.error('Server error:', errorMessage);
      }
    } catch (err) {
      const errorMessage = 'Network error: Failed to submit timesheet';
      setError(errorMessage);
      console.error('Network error submitting timesheet:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setIsSubmitModalOpen(false);
    setSlots([]);
    setNewSlot({ day_of_week: '', start_time: '', end_time: '' });
    // Don't clear error here - let it persist so user can see it
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (timeString: string) => {
    return new Date(`1970-01-01T${timeString}`).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getTargetWeekDates = () => {
    if (!targetWeekStart) {
      const today = new Date();
      return { startDate: today, endDate: today };
    }
    
    const startDate = new Date(targetWeekStart);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    return { startDate, endDate };
  };

  const getWeekTypeDisplay = () => {
    if (targetWeekType === 'current') return 'This Week';
    if (targetWeekType === 'next') return 'Next Week';
    return 'Future Week';
  };

  const groupSlotsByDay = (slots: TimesheetSlot[]) => {
    const grouped: { [key: string]: TimesheetSlot[] } = {};
    DAYS_OF_WEEK.forEach(day => {
      grouped[day] = slots.filter(slot => slot.day_of_week === day)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
    });
    return grouped;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  const { startDate, endDate } = getTargetWeekDates();

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Weekly Timesheet
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {getWeekTypeDisplay()}: {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
          </Typography>
        </Box>
        {!currentTimesheet && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIsSubmitModalOpen(true)}
          >
            Submit Timesheet
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}


      {currentTimesheet ? (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Submitted Timesheet
              </Typography>
              <Chip 
                label={currentTimesheet.status.toUpperCase()} 
                color={getStatusColor(currentTimesheet.status)}
                icon={currentTimesheet.status === 'approved' ? <CheckCircleIcon /> : <ScheduleIcon />}
              />
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Submitted: {formatDate(currentTimesheet.submitted_at)}
              {currentTimesheet.reviewer_name && ` • Reviewed by: ${currentTimesheet.reviewer_name}`}
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
              Scheduled Hours
            </Typography>

            <Grid container spacing={2}>
              {Object.entries(groupSlotsByDay(currentTimesheet.slots)).map(([day, daySlots]) => (
                <Grid size={{xs: 12, sm: 6, md: 4}} key={day}>
                  <Paper sx={{ p: 2, height: '100%' }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                      {DAY_LABELS[day as keyof typeof DAY_LABELS]}
                    </Typography>
                    {daySlots.length > 0 ? (
                      daySlots.map((slot, index) => (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2">
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          </Typography>
                        </Box>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Not scheduled
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <DateRangeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No Timesheet Submitted
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Submit your availability for {getWeekTypeDisplay().toLowerCase()}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Submit Timesheet Modal */}
      <Dialog open={isSubmitModalOpen} onClose={handleCloseModal} maxWidth="md" fullWidth>
        <DialogTitle>Submit Weekly Timesheet</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select your available 2-hour time slots for {getWeekTypeDisplay().toLowerCase()}: {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {/* Add New Slot */}
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2, mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>Add Time Slot</Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{xs: 12, sm: 4}}>
                <FormControl fullWidth>
                  <InputLabel>Day</InputLabel>
                  <Select
                    value={newSlot.day_of_week}
                    label="Day"
                    onChange={(e) => setNewSlot({ ...newSlot, day_of_week: e.target.value })}
                  >
                    {DAYS_OF_WEEK.map((day) => (
                      <MenuItem key={day} value={day}>
                        {DAY_LABELS[day as keyof typeof DAY_LABELS]}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{xs: 12, sm: 4}}>
                <FormControl fullWidth>
                  <InputLabel>Start Time</InputLabel>
                  <Select
                    value={newSlot.start_time}
                    label="Start Time"
                    onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                  >
                    {generateTimeOptions().map((time) => (
                      <MenuItem key={time} value={time}>
                        {formatTime(time)} - {formatTime(getEndTime(time))}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{xs: 12, sm: 4}}>
                <Button
                  variant="outlined"
                  onClick={handleAddSlot}
                  disabled={!newSlot.day_of_week || !newSlot.start_time}
                  fullWidth
                >
                  Add Slot
                </Button>
              </Grid>
            </Grid>
          </Box>

          {/* Current Slots */}
          {slots.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Selected Time Slots ({slots.length})
              </Typography>
              <TableContainer component={Paper} sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Day</TableCell>
                      <TableCell>Time</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {slots
                      .sort((a, b) => {
                        const dayOrder = DAYS_OF_WEEK.indexOf(a.day_of_week) - DAYS_OF_WEEK.indexOf(b.day_of_week);
                        return dayOrder !== 0 ? dayOrder : a.start_time.localeCompare(b.start_time);
                      })
                      .map((slot, index) => (
                        <TableRow key={index}>
                          <TableCell>{DAY_LABELS[slot.day_of_week as keyof typeof DAY_LABELS]}</TableCell>
                          <TableCell>{formatTime(slot.start_time)} - {formatTime(slot.end_time)}</TableCell>
                          <TableCell align="right">
                            <IconButton
                              onClick={() => handleRemoveSlot(index)}
                              size="small"
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitTimesheet} 
            variant="contained"
            disabled={submitting || slots.length === 0}
          >
            {submitting ? <CircularProgress size={20} /> : `Submit ${slots.length} Time Slots`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}