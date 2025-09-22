import React, { useState, useEffect, useCallback } from 'react';
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
  IconButton,
  Collapse,
  Card,
  CardContent,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TablePagination
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Schedule as ScheduleIcon,
  DateRange as DateRangeIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon
} from '@mui/icons-material';

interface TimesheetSlot {
  day_of_week: string;
  start_time: string;
  end_time: string;
}

interface TimesheetHistory {
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

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

const BASE_URL = import.meta.env.VITE_BASE_API_URL;

interface Props {
  onLogout: () => void;
  userRole: 'field_agent' | 'dispatcher' | 'admin';
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

export default function TimesheetHistory({ onLogout, userRole }: Props) {
  const [timesheets, setTimesheets] = useState<TimesheetHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false
  });

  const fetchTimesheetHistory = useCallback(async (page = 1, status = '', limit = 10) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      if (status) {
        params.append('status', status);
      }
      
      const res = await fetch(`${BASE_URL}/timesheet/history?${params}`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTimesheets(data.data);
          setPagination(data.pagination);
        } else {
          setError('Failed to fetch timesheet history');
        }
      } else if (res.status === 401) {
        onLogout();
      } else {
        setError('Failed to fetch timesheet history');
      }
    } catch (err) {
      setError('Failed to fetch timesheet history');
      console.error('Error fetching timesheet history:', err);
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => {
    fetchTimesheetHistory(1, statusFilter, pagination.limit);
  }, [fetchTimesheetHistory, statusFilter, pagination.limit]);

  const handlePageChange = (event: unknown, newPage: number) => {
    fetchTimesheetHistory(newPage + 1, statusFilter, pagination.limit);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLimit = parseInt(event.target.value, 10);
    fetchTimesheetHistory(1, statusFilter, newLimit);
  };

  const handleStatusFilterChange = (event: { target: { value: string } }) => {
    const newStatus = event.target.value;
    setStatusFilter(newStatus);
    fetchTimesheetHistory(1, newStatus, pagination.limit);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <PendingIcon />;
      case 'approved': return <CheckCircleIcon />;
      case 'rejected': return <CancelIcon />;
      default: return <PendingIcon />;
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

  const getWeekEndDate = (weekStartDate: string) => {
    const startDate = new Date(weekStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    return endDate;
  };

  const groupSlotsByDay = (slots: TimesheetSlot[]) => {
    const grouped: { [key: string]: TimesheetSlot[] } = {};
    DAYS_OF_WEEK.forEach(day => {
      grouped[day] = slots.filter(slot => slot.day_of_week === day)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
    });
    return grouped;
  };

  const getTotalHours = (slots: TimesheetSlot[]) => {
    return slots.length * 2; // Each slot is 2 hours
  };

  if (loading && timesheets.length === 0) {
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
          Timesheet History
        </Typography>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Filter by Status</InputLabel>
          <Select
            value={statusFilter}
            label="Filter by Status"
            onChange={handleStatusFilterChange}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
          </Select>
        </FormControl>
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
              <DateRangeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No Timesheets Found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {statusFilter 
                  ? `No ${statusFilter} timesheets found`
                  : 'No timesheet history available'
                }
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell />
                  {userRole !== 'field_agent' && <TableCell>Agent</TableCell>}
                  <TableCell>Week</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Total Hours</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell>Reviewer</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {timesheets.map((timesheet) => {
                  const weekEnd = getWeekEndDate(timesheet.week_start_date);
                  const isExpanded = expandedRows.has(timesheet.timesheet_id);
                  
                  return (
                    <React.Fragment key={timesheet.timesheet_id}>
                      <TableRow>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => toggleRowExpansion(timesheet.timesheet_id)}
                          >
                            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        </TableCell>
                        {userRole !== 'field_agent' && (
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
                        )}
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
                          <Chip 
                            label={timesheet.status.toUpperCase()} 
                            color={getStatusColor(timesheet.status)}
                            icon={getStatusIcon(timesheet.status)}
                            size="small"
                          />
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
                        <TableCell>
                          {timesheet.reviewer_name || (timesheet.status === 'pending' ? 'Pending' : 'N/A')}
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded row content */}
                      <TableRow>
                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={userRole !== 'field_agent' ? 7 : 6}>
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 2 }}>
                              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
                                Scheduled Hours
                              </Typography>
                              <Grid container spacing={1}>
                                {Object.entries(groupSlotsByDay(timesheet.slots)).map(([day, daySlots]) => (
                                  <Grid size={{xs: 12, sm: 6, md: 3}} key={`${timesheet.timesheet_id}-${day}`}>
                                    <Paper sx={{ p: 1.5, height: '100%', bgcolor: 'background.default' }}>
                                      <Typography variant="caption" fontWeight="bold" display="block">
                                        {DAY_LABELS[day as keyof typeof DAY_LABELS]}
                                      </Typography>
                                      {daySlots.length > 0 ? (
                                        daySlots.map((slot, index) => (
                                          <Typography key={`${timesheet.timesheet_id}-${day}-${index}`} variant="caption" display="block" color="text.secondary">
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
                              
                              {timesheet.reviewed_at && (
                                <Box sx={{ mt: 2, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                                  <Typography variant="caption" color="text.secondary">
                                    {timesheet.status === 'approved' ? 'Approved' : 'Rejected'} by {timesheet.reviewer_name} on {formatDate(timesheet.reviewed_at)}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={pagination.total}
            page={pagination.page - 1}
            onPageChange={handlePageChange}
            rowsPerPage={pagination.limit}
            onRowsPerPageChange={handleRowsPerPageChange}
            rowsPerPageOptions={[5, 10, 25, 50]}
            sx={{ mt: 2 }}
          />
        </>
      )}
    </Box>
  );
}