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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Visibility as ViewIcon,
  Schedule as ScheduleIcon,
  DateRange as DateRangeIcon,
  Person as PersonIcon
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
  agent_email: string;
  reviewer_name?: string;
  created_time: string;
  updated_time: string;
}

const BASE_URL = import.meta.env.VITE_BASE_API_URL;

interface Props {
  onLogout: () => void;
  userRole: 'dispatcher' | 'admin';
}

export default function TimeOffManagement({ onLogout, userRole }: Props) {
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState<TimeOffRequest | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [submitting, setSubmitting] = useState(false);

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

  const handleReviewRequest = async () => {
    if (!selectedRequest) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`${BASE_URL}/time-off/requests/${selectedRequest.requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ action: reviewAction }),
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        await fetchTimeOffRequests();
        setIsReviewModalOpen(false);
        setSelectedRequest(null);
      } else {
        setError(data.error || `Failed to ${reviewAction} request`);
      }
    } catch (err) {
      setError(`Failed to ${reviewAction} request`);
      console.error(`Error ${reviewAction}ing request:`, err);
    } finally {
      setSubmitting(false);
    }
  };

  const openReviewModal = (request: TimeOffRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setReviewAction(action);
    setIsReviewModalOpen(true);
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '';
    return new Date(`1970-01-01T${timeString}`).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Filter requests based on status and tab
  const getFilteredRequests = () => {
    switch (tabValue) {
      case 0: return requests.filter(r => r.status === 'pending');
      case 1: return requests.filter(r => r.status === 'approved');
      case 2: return requests.filter(r => r.status === 'rejected');
      case 3: return requests.filter(r => r.status === 'cancelled');
      default: return requests;
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;
  const cancelledCount = requests.filter(r => r.status === 'cancelled').length;

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
          {userRole === 'admin' ? 'All Time-Off Requests' : 'Team Time-Off Requests'}
        </Typography>
        <Chip 
          label={`${pendingCount} Pending Review`} 
          color={pendingCount > 0 ? 'warning' : 'default'}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Status Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label={`Pending (${pendingCount})`} />
          <Tab label={`Approved (${approvedCount})`} />
          <Tab label={`Rejected (${rejectedCount})`} />
          <Tab label={`Cancelled (${cancelledCount})`} />
        </Tabs>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Agent</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Requested</TableCell>
              {tabValue !== 0 && <TableCell>Reviewer</TableCell>}
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {getFilteredRequests().map((request) => (
              <TableRow key={request.requestId}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {request.agent_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {request.agent_email}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
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
                <TableCell>
                  <Typography variant="body2" sx={{ maxWidth: 200, wordWrap: 'break-word' }}>
                    {request.reason || 'No reason provided'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={request.status.toUpperCase()} 
                    color={getStatusColor(request.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="caption">
                    {formatDateTime(request.created_time)}
                  </Typography>
                </TableCell>
                {tabValue !== 0 && (
                  <TableCell>{request.reviewer_name || 'System'}</TableCell>
                )}
                <TableCell align="right">
                  {request.status === 'pending' && (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton 
                        onClick={() => openReviewModal(request, 'approve')}
                        size="small"
                        color="success"
                        title="Approve"
                      >
                        <CheckIcon />
                      </IconButton>
                      <IconButton 
                        onClick={() => openReviewModal(request, 'reject')}
                        size="small"
                        color="error"
                        title="Reject"
                      >
                        <CloseIcon />
                      </IconButton>
                    </Box>
                  )}
                  {request.status !== 'pending' && (
                    <IconButton 
                      size="small"
                      color="primary"
                      title="View Details"
                      disabled
                    >
                      <ViewIcon />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {getFilteredRequests().length === 0 && (
              <TableRow>
                <TableCell colSpan={tabValue !== 0 ? 8 : 7} align="center">
                  <Typography color="textSecondary">
                    No {tabValue === 0 ? 'pending' : tabValue === 1 ? 'approved' : tabValue === 2 ? 'rejected' : 'cancelled'} requests found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Review Request Modal */}
      <Dialog open={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {reviewAction === 'approve' ? 'Approve' : 'Reject'} Time-Off Request
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Request Details:
              </Typography>
              <Box sx={{ pl: 2, mb: 2 }}>
                <Typography variant="body2">
                  <strong>Agent:</strong> {selectedRequest.agent_name}
                </Typography>
                <Typography variant="body2">
                  <strong>Date:</strong> {formatDate(selectedRequest.request_date)}
                </Typography>
                <Typography variant="body2">
                  <strong>Duration:</strong> {selectedRequest.is_full_day 
                    ? 'Full Day' 
                    : `${formatTime(selectedRequest.start_time)} - ${formatTime(selectedRequest.end_time)}`
                  }
                </Typography>
                <Typography variant="body2">
                  <strong>Reason:</strong> {selectedRequest.reason || 'No reason provided'}
                </Typography>
                <Typography variant="body2">
                  <strong>Requested:</strong> {formatDateTime(selectedRequest.created_time)}
                </Typography>
              </Box>
              
              <Alert 
                severity={reviewAction === 'approve' ? 'success' : 'warning'}
                sx={{ mb: 2 }}
              >
                {reviewAction === 'approve' 
                  ? 'This agent will be marked as unavailable during the requested time period.'
                  : 'This request will be rejected and the agent will be notified.'
                }
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsReviewModalOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleReviewRequest} 
            variant="contained"
            color={reviewAction === 'approve' ? 'success' : 'error'}
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={20} /> : (reviewAction === 'approve' ? 'Approve' : 'Reject')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}