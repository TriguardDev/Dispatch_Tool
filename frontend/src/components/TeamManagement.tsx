import { useState, useEffect } from 'react';
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
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  SupervisorAccount as SupervisorIcon,
  ExpandMore as ExpandMoreIcon,
  PersonAdd as PersonAddIcon
} from '@mui/icons-material';

interface Team {
  teamId: number;
  name: string;
  description?: string;
  dispatchers: TeamMember[];
  agents: TeamMember[];
  memberCount: number;
  created_time: string;
  updated_time: string;
}

interface TeamMember {
  id: number;
  name: string;
  email: string;
  phone?: string;
  status?: string;
  type?: 'dispatcher' | 'agent';
}

interface UnassignedMembers {
  dispatchers: TeamMember[];
  agents: TeamMember[];
  total: number;
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function TeamManagement() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [unassignedMembers, setUnassignedMembers] = useState<UnassignedMembers>({
    dispatchers: [],
    agents: [],
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const [assignData, setAssignData] = useState({
    memberId: '',
    memberType: 'agent' as 'dispatcher' | 'agent'
  });

  const fetchTeams = async () => {
    try {
      const res = await fetch(`${BASE_URL}/teams`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        setTeams(data.success ? data.data : []);
      } else {
        setError('Failed to fetch teams');
      }
    } catch (err) {
      setError('Failed to fetch teams');
      console.error('Error fetching teams:', err);
    }
  };

  const fetchUnassignedMembers = async () => {
    try {
      const res = await fetch(`${BASE_URL}/teams/unassigned`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        setUnassignedMembers(data.success ? data.data : { dispatchers: [], agents: [], total: 0 });
      }
    } catch (err) {
      console.error('Error fetching unassigned members:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    
    try {
      await Promise.all([fetchTeams(), fetchUnassignedMembers()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTeam = async () => {
    try {
      const res = await fetch(`${BASE_URL}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        await fetchData();
        setIsCreateModalOpen(false);
        resetForm();
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to create team');
      }
    } catch (err) {
      setError('Failed to create team');
      console.error('Error creating team:', err);
    }
  };

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      description: team.description || ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateTeam = async () => {
    if (!editingTeam) return;

    try {
      const res = await fetch(`${BASE_URL}/teams/${editingTeam.teamId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        await fetchData();
        setIsEditModalOpen(false);
        setEditingTeam(null);
        resetForm();
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to update team');
      }
    } catch (err) {
      setError('Failed to update team');
      console.error('Error updating team:', err);
    }
  };

  const handleDeleteTeam = async (teamId: number, teamName: string) => {
    if (!window.confirm(`Are you sure you want to delete team "${teamName}"? All members will be unassigned.`)) return;

    try {
      const res = await fetch(`${BASE_URL}/teams/${teamId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        await fetchData();
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to delete team');
      }
    } catch (err) {
      setError('Failed to delete team');
      console.error('Error deleting team:', err);
    }
  };

  const handleAssignMember = async () => {
    if (!selectedTeam || !assignData.memberId) return;

    try {
      const res = await fetch(`${BASE_URL}/teams/${selectedTeam.teamId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          type: assignData.memberType,
          memberId: parseInt(assignData.memberId)
        }),
      });

      if (res.ok) {
        await fetchData();
        setIsAssignModalOpen(false);
        setSelectedTeam(null);
        resetAssignForm();
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to assign member');
      }
    } catch (err) {
      setError('Failed to assign member');
      console.error('Error assigning member:', err);
    }
  };

  const handleRemoveMember = async (teamId: number, memberType: 'dispatcher' | 'agent', memberId: number) => {
    if (!window.confirm('Are you sure you want to remove this member from the team?')) return;

    try {
      const res = await fetch(`${BASE_URL}/teams/${teamId}/members/${memberType}/${memberId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        await fetchData();
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to remove member');
      }
    } catch (err) {
      setError('Failed to remove member');
      console.error('Error removing member:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: ''
    });
  };

  const resetAssignForm = () => {
    setAssignData({
      memberId: '',
      memberType: 'agent'
    });
  };

  const openAssignModal = (team: Team) => {
    setSelectedTeam(team);
    resetAssignForm();
    setIsAssignModalOpen(true);
  };

  const getAvailableMembers = () => {
    return assignData.memberType === 'dispatcher' 
      ? unassignedMembers.dispatchers 
      : unassignedMembers.agents;
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
          Team Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Create Team
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Unassigned Members Summary */}
      {unassignedMembers.total > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">
            {unassignedMembers.total} unassigned members: {unassignedMembers.dispatchers.length} dispatchers, {unassignedMembers.agents.length} agents
          </Typography>
        </Alert>
      )}

      {/* Teams Grid */}
      <Grid container spacing={3}>
        {teams.map((team) => (
          <Grid key={team.teamId} size={{xs: 12, md: 6, lg: 4}}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <GroupIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" component="h2" fontWeight="bold">
                    {team.name}
                  </Typography>
                  <Chip 
                    label={team.memberCount} 
                    size="small" 
                    color="primary" 
                    sx={{ ml: 'auto' }}
                  />
                </Box>
                
                {team.description && (
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    {team.description}
                  </Typography>
                )}

                {/* Warning for teams without dispatcher */}
                {team.dispatchers.length === 0 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    This team has no dispatcher assigned
                  </Alert>
                )}

                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">
                      Team Members ({team.memberCount})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {/* Dispatchers */}
                    {team.dispatchers.length > 0 && (
                      <>
                        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <SupervisorIcon sx={{ mr: 1, fontSize: 16 }} />
                          Dispatchers
                        </Typography>
                        <List dense>
                          {team.dispatchers.map((dispatcher) => (
                            <ListItem key={`dispatcher-${dispatcher.id}`} sx={{ pl: 0 }}>
                              <ListItemText 
                                primary={dispatcher.name}
                                secondary={dispatcher.email}
                              />
                              <ListItemSecondaryAction>
                                <IconButton 
                                  size="small" 
                                  color="error"
                                  onClick={() => handleRemoveMember(team.teamId, 'dispatcher', dispatcher.id)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </ListItemSecondaryAction>
                            </ListItem>
                          ))}
                        </List>
                        <Divider sx={{ my: 1 }} />
                      </>
                    )}

                    {/* Agents */}
                    {team.agents.length > 0 && (
                      <>
                        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <PersonIcon sx={{ mr: 1, fontSize: 16 }} />
                          Field Agents
                        </Typography>
                        <List dense>
                          {team.agents.map((agent) => (
                            <ListItem key={`agent-${agent.id}`} sx={{ pl: 0 }}>
                              <ListItemText 
                                primary={agent.name}
                                secondary={`${agent.email} • ${agent.status || 'N/A'}`}
                              />
                              <ListItemSecondaryAction>
                                <IconButton 
                                  size="small" 
                                  color="error"
                                  onClick={() => handleRemoveMember(team.teamId, 'agent', agent.id)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </ListItemSecondaryAction>
                            </ListItem>
                          ))}
                        </List>
                      </>
                    )}

                    {team.memberCount === 0 && (
                      <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 2 }}>
                        No members assigned
                      </Typography>
                    )}
                  </AccordionDetails>
                </Accordion>
              </CardContent>

              <CardActions>
                <Button 
                  size="small" 
                  startIcon={<PersonAddIcon />}
                  onClick={() => openAssignModal(team)}
                  disabled={false}
                >
                  Assign ({unassignedMembers.total})
                </Button>
                <Button 
                  size="small" 
                  startIcon={<EditIcon />}
                  onClick={() => handleEditTeam(team)}
                >
                  Edit
                </Button>
                <Button 
                  size="small" 
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => handleDeleteTeam(team.teamId, team.name)}
                >
                  Delete
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}

        {teams.length === 0 && (
          <Grid size={{xs: 12}}>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="textSecondary">
                No teams found
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Create your first team to get started
              </Typography>
            </Box>
          </Grid>
        )}
      </Grid>

      {/* Create Team Modal */}
      <Dialog open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Team</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Team Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setIsCreateModalOpen(false); resetForm(); }}>
            Cancel
          </Button>
          <Button onClick={handleCreateTeam} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Team Modal */}
      <Dialog open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Team</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Team Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setIsEditModalOpen(false); setEditingTeam(null); resetForm(); }}>
            Cancel
          </Button>
          <Button onClick={handleUpdateTeam} variant="contained">
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Member Modal */}
      <Dialog open={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Member to {selectedTeam?.name}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Member Type</InputLabel>
            <Select
              value={assignData.memberType}
              label="Member Type"
              onChange={(e) => setAssignData({ ...assignData, memberType: e.target.value as 'dispatcher' | 'agent', memberId: '' })}
            >
              <MenuItem value="dispatcher">Dispatcher</MenuItem>
              <MenuItem value="agent">Field Agent</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Member</InputLabel>
            <Select
              value={assignData.memberId}
              label="Select Member"
              onChange={(e) => setAssignData({ ...assignData, memberId: e.target.value })}
            >
              {getAvailableMembers().map((member) => (
                <MenuItem key={member.id} value={member.id.toString()}>
                  {member.name} ({member.email})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {getAvailableMembers().length === 0 && (
            <Alert severity="info">
              No unassigned {assignData.memberType === 'dispatcher' ? 'dispatchers' : 'agents'} available
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setIsAssignModalOpen(false); setSelectedTeam(null); resetAssignForm(); }}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssignMember} 
            variant="contained"
            disabled={!assignData.memberId || getAvailableMembers().length === 0}
          >
            Assign
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}