import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
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
  Card,
  CardContent,
  Grid,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Collapse
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  DateRange as DateRangeIcon
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
  agent_email: string;
  reviewer_name?: string;
  slots: TimesheetSlot[];
}

const BASE_URL = import.meta.env.VITE_BASE_API_URL;

interface Props {
  onLogout: () => void;
  userRole: 'dispatcher' | 'admin';
}

const DAY_LABELS = {
  monday: 'Monday',
  tuesday: 'Tuesday', 
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday'
};

const DAYS_OF_WEEK = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

export default function TimesheetManagement({ onLogout, userRole }: Props) {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewing, setReviewing] = useState<number | null>(null);
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const fetchPendingTimesheets = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/timesheet/pending`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        setTimesheets(data.success ? data.data : []);
      } else if (res.status === 401) {
        onLogout();
      } else {
        setError('Failed to fetch timesheets');
      }
    } catch (err) {
      setError('Failed to fetch timesheets');
      console.error('Error fetching timesheets:', err);
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => {
    fetchPendingTimesheets();
  }, [fetchPendingTimesheets]);

  const handleReviewTimesheet = async (timesheetId: number, action: 'approve' | 'reject') => {
    setReviewing(timesheetId);
    setError('');

    try {
      const res = await fetch(`${BASE_URL}/timesheet/${timesheetId}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        await fetchPendingTimesheets();
        setIsDetailModalOpen(false);
      } else {
        setError(data.error || `Failed to ${action} timesheet`);
      }
    } catch (err) {
      setError(`Failed to ${action} timesheet`);
      console.error(`Error ${action}ing timesheet:`, err);
    } finally {
      setReviewing(null);
    }
  };

  const handleViewDetails = (timesheet: Timesheet) => {
    setSelectedTimesheet(timesheet);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedTimesheet(null);
  };

  const toggleRowExpansion = (timesheetId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(timesheetId)) {
      newExpanded.delete(timesheetId);
    } else {
      newExpanded.add(timesheetId);
    }
    setExpandedRows(newExpanded);
  };

  const groupSlotsByDay = (slots: TimesheetSlot[]) => {
    const grouped: { [key: string]: TimesheetSlot[] } = {};
    DAYS_OF_WEEK.forEach(day => {
      grouped[day] = slots.filter(slot => slot.day_of_week === day)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
    });
    return grouped;
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

  const getWeekEndDate = (weekStartDate: string) => {
    const startDate = new Date(weekStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    return endDate;
  };

  const getTotalHours = (slots: TimesheetSlot[]) => {
    return slots.length * 2; // Each slot is 2 hours
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
          Timesheet Approvals
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {timesheets.length === 0 ? (
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                All Caught Up!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No pending timesheet approvals at this time.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell>Agent</TableCell>
                <TableCell>Week</TableCell>
                <TableCell>Total Hours</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {timesheets.map((timesheet) => {
                const weekEnd = getWeekEndDate(timesheet.week_start_date);
                const isExpanded = expandedRows.has(timesheet.timesheet_id);
                
                return (
                  <>
                    <TableRow key={timesheet.timesheet_id}>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => toggleRowExpansion(timesheet.timesheet_id)}
                        >
                          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {timesheet.agent_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {timesheet.agent_email}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <DateRangeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Box>
                            <Typography variant="body2">
                              {formatDate(timesheet.week_start_date)} - {formatDate(weekEnd.toISOString().split('T')[0])}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2">
                            {getTotalHours(timesheet.slots)} hours ({timesheet.slots.length} slots)
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{formatDate(timesheet.submitted_at)}</TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleViewDetails(timesheet)}
                          >
                            View Details
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<CheckCircleIcon />}
                            onClick={() => handleReviewTimesheet(timesheet.timesheet_id, 'approve')}
                            disabled={reviewing === timesheet.timesheet_id}
                          >
                            {reviewing === timesheet.timesheet_id ? <CircularProgress size={16} /> : 'Approve'}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<CancelIcon />}
                            onClick={() => handleReviewTimesheet(timesheet.timesheet_id, 'reject')}
                            disabled={reviewing === timesheet.timesheet_id}
                          >
                            Reject
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded row content */}
                    <TableRow>
                      <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ margin: 2 }}>
                            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
                              Scheduled Hours
                            </Typography>
                            <Grid container spacing={1}>
                              {Object.entries(groupSlotsByDay(timesheet.slots)).map(([day, daySlots]) => (
                                <Grid size={{xs: 12, sm: 6, md: 3}} key={day}>
                                  <Paper sx={{ p: 1.5, height: '100%', bgcolor: 'background.default' }}>
                                    <Typography variant="caption" fontWeight="bold" display="block">
                                      {DAY_LABELS[day as keyof typeof DAY_LABELS]}
                                    </Typography>
                                    {daySlots.length > 0 ? (
                                      daySlots.map((slot, index) => (
                                        <Typography key={index} variant="caption" display="block" color="text.secondary">
                                          {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                        </Typography>
                                      ))
                                    ) : (
                                      <Typography variant="caption" color="text.secondary">
                                        Not scheduled
                                      </Typography>
                                    )}
                                  </Paper>
                                </Grid>
                              ))}
                            </Grid>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Detail Modal */}
      <Dialog open={isDetailModalOpen} onClose={handleCloseDetailModal} maxWidth="md" fullWidth>
        {selectedTimesheet && (
          <>
            <DialogTitle>
              <Box>
                <Typography variant="h6">
                  {selectedTimesheet.agent_name}'s Timesheet
                </Typography>
                <Typography variant="subtitle2" color="text.secondary">
                  Week of {formatDate(selectedTimesheet.week_start_date)} - {formatDate(getWeekEndDate(selectedTimesheet.week_start_date).toISOString().split('T')[0])}
                </Typography>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Agent: {selectedTimesheet.agent_email} • 
                  Submitted: {formatDate(selectedTimesheet.submitted_at)} • 
                  Total Hours: {getTotalHours(selectedTimesheet.slots)}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                Scheduled Hours
              </Typography>

              <Grid container spacing={2}>
                {Object.entries(groupSlotsByDay(selectedTimesheet.slots)).map(([day, daySlots]) => (
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
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDetailModal}>
                Close
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<CancelIcon />}
                onClick={() => handleReviewTimesheet(selectedTimesheet.timesheet_id, 'reject')}
                disabled={reviewing === selectedTimesheet.timesheet_id}
              >
                Reject
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={() => handleReviewTimesheet(selectedTimesheet.timesheet_id, 'approve')}
                disabled={reviewing === selectedTimesheet.timesheet_id}
              >
                {reviewing === selectedTimesheet.timesheet_id ? <CircularProgress size={16} /> : 'Approve'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}