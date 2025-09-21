import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  FormControlLabel,
  Switch,
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
  InputLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  DateRange as DateRangeIcon
} from '@mui/icons-material';

interface TimeOffRequest {
  requestId: number;
  agentId: number;
  request_date: string;
  start_time?: string;
  end_time?: string;
  is_full_day: boolean;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  agent_name: string;
  reviewer_name?: string;
  created_time: string;
  updated_time: string;
}

const BASE_URL = import.meta.env.VITE_BASE_API_URL;

interface Props {
  onLogout: () => void;
}

export default function TimeOffRequest({ onLogout }: Props) {
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    request_date: '',
    start_time: '',
    end_time: '',
    is_full_day: false,
    reason: ''
  });

  const fetchTimeOffRequests = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/time-off/requests`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        setRequests(data.success ? data.data : []);
      } else if (res.status === 401) {
        onLogout();
      } else {
        setError('Failed to fetch time-off requests');
      }
    } catch (err) {
      setError('Failed to fetch time-off requests');
      console.error('Error fetching time-off requests:', err);
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => {
    fetchTimeOffRequests();
  }, [fetchTimeOffRequests]);

  const handleCreateRequest = async () => {
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`${BASE_URL}/time-off/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        await fetchTimeOffRequests();
        setIsCreateModalOpen(false);
        resetForm();
      } else {
        setError(data.error || 'Failed to create time-off request');
      }
    } catch (err) {
      setError('Failed to create time-off request');
      console.error('Error creating time-off request:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId: number) => {
    if (!window.confirm('Are you sure you want to cancel this time-off request?')) return;

    try {
      const res = await fetch(`${BASE_URL}/time-off/requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'cancel' }),
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        await fetchTimeOffRequests();
      } else {
        setError(data.error || 'Failed to cancel request');
      }
    } catch (err) {
      setError('Failed to cancel request');
      console.error('Error cancelling request:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      request_date: '',
      start_time: '',
      end_time: '',
      is_full_day: false,
      reason: ''
    });
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    resetForm();
    setError('');
  };

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 10; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(timeString);
      }
    }
    return options;
  };

  const getEndTimeOptions = () => {
    if (!formData.start_time) return [];
    
    const startHour = parseInt(formData.start_time.split(':')[0]);
    const startMinute = parseInt(formData.start_time.split(':')[1]);
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = startTotalMinutes + 120; // Add 2 hours
    
    const endHour = Math.floor(endTotalMinutes / 60);
    const endMinute = endTotalMinutes % 60;
    
    if (endHour > 20) return []; // Past business hours
    
    return [`${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '';
    return new Date(`1970-01-01T${timeString}`).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          My Time-Off Requests
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Request Time-Off
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Reviewer</TableCell>
              <TableCell>Requested</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.requestId}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DateRangeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    {formatDate(request.request_date)}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    {request.is_full_day 
                      ? 'Full Day' 
                      : `${formatTime(request.start_time)} - ${formatTime(request.end_time)}`
                    }
                  </Box>
                </TableCell>
                <TableCell>{request.reason || 'No reason provided'}</TableCell>
                <TableCell>
                  <Chip 
                    label={request.status.toUpperCase()} 
                    color={getStatusColor(request.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{request.reviewer_name || 'Pending'}</TableCell>
                <TableCell>{formatDate(request.created_time)}</TableCell>
                <TableCell align="right">
                  {(request.status === 'pending' || request.status === 'approved') && (
                    <IconButton 
                      onClick={() => handleCancelRequest(request.requestId)}
                      size="small"
                      color="error"
                      title="Cancel Request"
                    >
                      <CancelIcon />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {requests.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="textSecondary">No time-off requests found</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Time-Off Request Modal */}
      <Dialog open={isCreateModalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <DialogTitle>Request Time-Off</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Date"
            type="date"
            value={formData.request_date}
            onChange={(e) => setFormData({ ...formData, request_date: e.target.value })}
            margin="normal"
            required
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: new Date(Date.now() + 86400000).toISOString().split('T')[0] }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={formData.is_full_day}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  is_full_day: e.target.checked,
                  start_time: '',
                  end_time: ''
                })}
              />
            }
            label="Full Day"
            sx={{ mt: 2, mb: 1 }}
          />

          {!formData.is_full_day && (
            <>
              <FormControl fullWidth margin="normal">
                <InputLabel>Start Time</InputLabel>
                <Select
                  value={formData.start_time}
                  label="Start Time"
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    start_time: e.target.value,
                    end_time: '' // Reset end time when start time changes
                  })}
                >
                  {generateTimeOptions().map((time) => (
                    <MenuItem key={time} value={time}>
                      {formatTime(time)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth margin="normal" disabled={!formData.start_time}>
                <InputLabel>End Time (2 hours later)</InputLabel>
                <Select
                  value={formData.end_time}
                  label="End Time (2 hours later)"
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                >
                  {getEndTimeOptions().map((time) => (
                    <MenuItem key={time} value={time}>
                      {formatTime(time)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {formData.start_time && getEndTimeOptions().length === 0 && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  Selected start time would extend past business hours (8:00 PM)
                </Alert>
              )}
            </>
          )}

          <TextField
            fullWidth
            label="Reason (Optional)"
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            margin="normal"
            multiline
            rows={3}
            placeholder="Personal appointment, vacation, etc."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateRequest} 
            variant="contained"
            disabled={
              submitting || 
              !formData.request_date ||
              (!formData.is_full_day && (!formData.start_time || !formData.end_time))
            }
          >
            {submitting ? <CircularProgress size={20} /> : 'Submit Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}