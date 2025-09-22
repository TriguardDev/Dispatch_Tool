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
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  SupervisorAccount as SupervisorIcon,
  Group as GroupIcon,
  Assignment as AssignmentIcon,
  SwapHoriz as SwapIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';
import PhoneInput from './PhoneInput';
import TeamManagement from './TeamManagement';
import DispositionManagement from './DispositionManagement';
import RegionManagement from './RegionManagement';

interface User {
  id: number;
  name: string;
  email: string;
  status?: string;
  role?: string;
  phone?: string;
  created_time?: string;
  updated_time?: string;
}

interface Dispatcher extends User {
  dispatcherId: number;
  location_id?: number;
  street_number?: string;
  street_name?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
}

interface Agent extends User {
  agentId: number;
  location_id?: number;
  street_number?: string;
  street_name?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`user-tabpanel-${index}`}
      aria-labelledby={`user-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

const BASE_URL = import.meta.env.VITE_BASE_API_URL;

export default function AdminManagement() {
  const [tabValue, setTabValue] = useState(0);
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRoleSwitchModalOpen, setIsRoleSwitchModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [switchingUser, setSwitchingUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<'dispatcher' | 'field_agent'>('dispatcher');
  const [targetRole, setTargetRole] = useState<'admin' | 'dispatcher' | 'field_agent'>('dispatcher');
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    status: 'available',
    location_id: null as number | null,
    street_number: '',
    street_name: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: 'USA'
  });

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Fetch dispatchers
      const dispatcherRes = await fetch(`${BASE_URL}/dispatchers`, {
        credentials: 'include'
      });
      
      if (dispatcherRes.ok) {
        const responseText = await dispatcherRes.text();
        console.log('Dispatcher response:', responseText);
        try {
          const dispatcherData = JSON.parse(responseText);
          const dispatchers = dispatcherData.success ? dispatcherData.data.map((d: Dispatcher) => ({ ...d, id: d.dispatcherId })) : [];
          console.log(dispatchers)
          setDispatchers(dispatchers);
        } catch (parseError) {
          console.error('Failed to parse dispatcher response:', parseError);
          setError('Invalid response from dispatchers endpoint');
        }
      } else {
        console.error('Dispatcher request failed:', dispatcherRes.status, dispatcherRes.statusText);
      }
      
      // Fetch agents  
      const agentRes = await fetch(`${BASE_URL}/agents`, {
        credentials: 'include'
      });
      
      if (agentRes.ok) {
        const responseText = await agentRes.text();
        console.log('Agent response:', responseText);
        try {
          const agentData = JSON.parse(responseText);
          const agents = agentData.success ? agentData.data.map((a: Agent) => ({ ...a, id: a.agentId })) : [];
          setAgents(agents);
        } catch (parseError) {
          console.error('Failed to parse agent response:', parseError);
          setError('Invalid response from agents endpoint');
        }
      } else {
        console.error('Agent request failed:', agentRes.status, agentRes.statusText);
      }

      // Fetch all users with roles
      const allUsersRes = await fetch(`${BASE_URL}/users/all-roles`, {
        credentials: 'include'
      });
      
      if (allUsersRes.ok) {
        const responseText = await allUsersRes.text();
        console.log('All users response:', responseText);
        try {
          const allUsersData = JSON.parse(responseText);
          const users = allUsersData.success ? allUsersData.data : [];
          setAllUsers(users);
        } catch (parseError) {
          console.error('Failed to parse all users response:', parseError);
          setError('Invalid response from users endpoint');
        }
      } else {
        console.error('All users request failed:', allUsersRes.status, allUsersRes.statusText);
      }
      
    } catch (err) {
      setError('Failed to fetch users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCreateUser = async () => {
    try {
      const endpoint = userType === 'dispatcher' ? `${BASE_URL}/dispatchers` : `${BASE_URL}/agents`;
      const payload = userType === 'dispatcher' 
        ? { 
            name: formData.name, 
            email: formData.email,
            phone: formData.phone || null,
            location_id: formData.location_id,
            street_number: formData.street_number,
            street_name: formData.street_name,
            city: formData.city,
            state_province: formData.state_province,
            postal_code: formData.postal_code,
            country: formData.country
          }
        : { 
            name: formData.name, 
            email: formData.email, 
            phone: formData.phone, 
            status: formData.status,
            location_id: formData.location_id,
            street_number: formData.street_number,
            street_name: formData.street_name,
            city: formData.city,
            state_province: formData.state_province,
            postal_code: formData.postal_code,
            country: formData.country
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchUsers(); // Refresh data
        setIsCreateModalOpen(false);
        resetForm();
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to create user');
      }
    } catch (err) {
      setError('Failed to create user');
      console.error('Error creating user:', err);
    }
  };

  const handleEditUser = (user: User, type: 'dispatcher' | 'field_agent') => {
    setEditingUser(user);
    setUserType(type);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      phone: user.phone || '',
      status: user.status || 'available',
      location_id: (user as Dispatcher | Agent).location_id || null,
      street_number: (user as Dispatcher | Agent).street_number || '',
      street_name: (user as Dispatcher | Agent).street_name || '',
      city: (user as Dispatcher | Agent).city || '',
      state_province: (user as Dispatcher | Agent).state_province || '',
      postal_code: (user as Dispatcher | Agent).postal_code || '',
      country: (user as Dispatcher | Agent).country || 'USA'
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      const endpoint = userType === 'dispatcher' 
        ? `${BASE_URL}/dispatchers/${editingUser.id}`
        : `${BASE_URL}/agents/${editingUser.id}`;
      
      const payload: Record<string, unknown> = { name: formData.name, email: formData.email };
      if (formData.password) payload.password = formData.password;
      if (userType === 'field_agent') {
        if (formData.phone) payload.phone = formData.phone;
        if (formData.status) payload.status = formData.status;
        payload.location_id = formData.location_id;
        payload.street_number = formData.street_number;
        payload.street_name = formData.street_name;
        payload.city = formData.city;
        payload.state_province = formData.state_province;
        payload.postal_code = formData.postal_code;
        payload.country = formData.country;
      } else if (userType === 'dispatcher') {
        payload.phone = formData.phone || null;
        payload.location_id = formData.location_id;
        payload.street_number = formData.street_number;
        payload.street_name = formData.street_name;
        payload.city = formData.city;
        payload.state_province = formData.state_province;
        payload.postal_code = formData.postal_code;
        payload.country = formData.country;
      }

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchUsers(); // Refresh data
        setIsEditModalOpen(false);
        setEditingUser(null);
        resetForm();
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to update user');
      }
    } catch (err) {
      setError('Failed to update user');
      console.error('Error updating user:', err);
    }
  };

  const handleDeleteUser = async (userId: number, type: 'dispatcher' | 'field_agent') => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      const endpoint = type === 'dispatcher' 
        ? `${BASE_URL}/dispatchers/${userId}`
        : `${BASE_URL}/agents/${userId}`;

      const res = await fetch(endpoint, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        await fetchUsers(); // Refresh data
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to delete user');
      }
    } catch (err) {
      setError('Failed to delete user');
      console.error('Error deleting user:', err);
    }
  };

  const handleRoleSwitch = (user: User) => {
    setSwitchingUser(user);
    // Set default target role (different from current role)
    const roleOrder = ['field_agent', 'dispatcher', 'admin'];
    const currentIndex = roleOrder.indexOf(user.role || 'field_agent');
    const nextIndex = (currentIndex + 1) % roleOrder.length;
    setTargetRole(roleOrder[nextIndex] as 'admin' | 'dispatcher' | 'field_agent');
    setIsRoleSwitchModalOpen(true);
  };

  const handleRoleSwitchConfirm = async () => {
    if (!switchingUser) return;

    try {
      const res = await fetch(`${BASE_URL}/users/${switchingUser.id}/switch-role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          current_role: switchingUser.role,
          target_role: targetRole,
        }),
      });

      if (res.ok) {
        await fetchUsers(); // Refresh all data
        setIsRoleSwitchModalOpen(false);
        setSwitchingUser(null);
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to switch user role');
      }
    } catch (err) {
      setError('Failed to switch user role');
      console.error('Error switching user role:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      status: 'available',
      location_id: null,
      street_number: '',
      street_name: '',
      city: '',
      state_province: '',
      postal_code: '',
      country: 'USA'
    });
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    resetForm();
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingUser(null);
    resetForm();
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
          User Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Create User
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* User Type Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="user management tabs">
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SwapIcon />
                <span>All Users ({allUsers.length})</span>
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SupervisorIcon />
                <span>Dispatchers ({dispatchers.length})</span>
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon />
                <span>Field Agents ({agents.length})</span>
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GroupIcon />
                <span>Teams</span>
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AssignmentIcon />
                <span>Dispositions</span>
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AdminIcon />
                <span>Regions</span>
              </Box>
            } 
          />
        </Tabs>
      </Box>

      {/* All Users Tab */}
      <TabPanel value={tabValue} index={0}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allUsers.map((user) => (
                <TableRow key={`${user.role}-${user.id}`}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip 
                      label={user.role?.replace('_', ' ').toUpperCase() || 'Unknown'} 
                      color={
                        user.role === 'admin' ? 'error' : 
                        user.role === 'dispatcher' ? 'primary' : 
                        'default'
                      }
                      size="small"
                      icon={
                        user.role === 'admin' ? <AdminIcon /> :
                        user.role === 'dispatcher' ? <SupervisorIcon /> :
                        <PersonIcon />
                      }
                    />
                  </TableCell>
                  <TableCell>{user.phone || 'N/A'}</TableCell>
                  <TableCell>
                    {user.status ? (
                      <Chip 
                        label={user.status} 
                        color={user.status === 'available' ? 'success' : 'default'}
                        size="small"
                      />
                    ) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {user.created_time ? new Date(user.created_time).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton 
                      onClick={() => handleRoleSwitch(user)}
                      size="small"
                      color="primary"
                      title="Switch Role"
                    >
                      <SwapIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {allUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="textSecondary">No users found</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Dispatchers Tab */}
      <TabPanel value={tabValue} index={1}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dispatchers.map((dispatcher) => (
                <TableRow key={dispatcher.id}>
                  <TableCell>{dispatcher.name}</TableCell>
                  <TableCell>{dispatcher.email}</TableCell>
                  <TableCell>{dispatcher.phone || 'N/A'}</TableCell>
                  <TableCell>
                    {dispatcher.street_number && dispatcher.street_name
                      ? `${dispatcher.street_number} ${dispatcher.street_name}, ${dispatcher.city}, ${dispatcher.state_province}`
                      : 'N/A'
                    }
                  </TableCell>
                  <TableCell>
                    {dispatcher.created_time ? new Date(dispatcher.created_time).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton 
                      onClick={() => handleEditUser(dispatcher, 'dispatcher')}
                      size="small"
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      onClick={() => handleDeleteUser(dispatcher.id, 'dispatcher')}
                      size="small"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {dispatchers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="textSecondary">No dispatchers found</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Field Agents Tab */}
      <TabPanel value={tabValue} index={2}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {agents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell>{agent.name}</TableCell>
                  <TableCell>{agent.email}</TableCell>
                  <TableCell>{agent.phone || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={agent.status || 'N/A'} 
                      color={agent.status === 'available' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {agent.created_time ? new Date(agent.created_time).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton 
                      onClick={() => handleEditUser(agent, 'field_agent')}
                      size="small"
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      onClick={() => handleDeleteUser(agent.id, 'field_agent')}
                      size="small"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {agents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="textSecondary">No field agents found</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Teams Tab */}
      <TabPanel value={tabValue} index={3}>
        <TeamManagement />
      </TabPanel>

      {/* Dispositions Tab */}
      <TabPanel value={tabValue} index={4}>
        <DispositionManagement />
      </TabPanel>

      {/* Regions Tab */}
      <TabPanel value={tabValue} index={5}>
        <RegionManagement />
      </TabPanel>

      {/* Create User Modal */}
      <Dialog open={isCreateModalOpen} onClose={handleCloseCreateModal} maxWidth="sm" fullWidth>
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>User Type</InputLabel>
              <Select
                value={userType}
                label="User Type"
                onChange={(e) => setUserType(e.target.value as 'dispatcher' | 'field_agent')}
              >
                <MenuItem value="dispatcher">Dispatcher</MenuItem>
                <MenuItem value="field_agent">Field Agent</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              required
            />

            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              margin="normal"
              required
            />

            <Alert severity="info" sx={{ mt: 2 }}>
              Default password "Room2025!" will be set automatically. Users can reset their password after first login.
            </Alert>


            {userType === 'dispatcher' && (
              <>
                <Box sx={{ mt: 2, mb: 1 }}>
                  <PhoneInput
                    value={formData.phone}
                    onChange={(value) => setFormData({ ...formData, phone: value })}
                    label="Phone"
                    fullWidth
                  />
                </Box>
                
                <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Location (Optional)</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 2 }}>
                  <TextField
                    label="Street Number"
                    value={formData.street_number}
                    onChange={(e) => setFormData({ ...formData, street_number: e.target.value })}
                    margin="normal"
                  />
                  <TextField
                    label="Street Name"
                    value={formData.street_name}
                    onChange={(e) => setFormData({ ...formData, street_name: e.target.value })}
                    margin="normal"
                  />
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 2 }}>
                  <TextField
                    label="City"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    margin="normal"
                  />
                  <TextField
                    label="State"
                    value={formData.state_province}
                    onChange={(e) => setFormData({ ...formData, state_province: e.target.value })}
                    margin="normal"
                  />
                  <TextField
                    label="Zip Code"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    margin="normal"
                  />
                </Box>
                <TextField
                  fullWidth
                  label="Country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  margin="normal"
                />
              </>
            )}
            
            {userType === 'field_agent' && (
              <>
                <Box sx={{ mt: 2, mb: 1 }}>
                  <PhoneInput
                    value={formData.phone}
                    onChange={(value) => setFormData({ ...formData, phone: value })}
                    label="Phone"
                    fullWidth
                  />
                </Box>

                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    label="Status"
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <MenuItem value="available">Available</MenuItem>
                    <MenuItem value="unavailable">Unavailable</MenuItem>
                  </Select>
                </FormControl>

                <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Location (Optional)</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 2 }}>
                  <TextField
                    label="Street Number"
                    value={formData.street_number}
                    onChange={(e) => setFormData({ ...formData, street_number: e.target.value })}
                    margin="normal"
                  />
                  <TextField
                    label="Street Name"
                    value={formData.street_name}
                    onChange={(e) => setFormData({ ...formData, street_name: e.target.value })}
                    margin="normal"
                  />
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 2 }}>
                  <TextField
                    label="City"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    margin="normal"
                  />
                  <TextField
                    label="State"
                    value={formData.state_province}
                    onChange={(e) => setFormData({ ...formData, state_province: e.target.value })}
                    margin="normal"
                  />
                  <TextField
                    label="Zip Code"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    margin="normal"
                  />
                </Box>
                <TextField
                  fullWidth
                  label="Country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  margin="normal"
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateModal}>Cancel</Button>
          <Button onClick={handleCreateUser} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onClose={handleCloseEditModal} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
            />

            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              margin="normal"
            />

            <TextField
              fullWidth
              label="Password (leave blank to keep current)"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              margin="normal"
            />

            {userType === 'dispatcher' && (
              <>
                <Box sx={{ mt: 2, mb: 1 }}>
                  <PhoneInput
                    value={formData.phone}
                    onChange={(value) => setFormData({ ...formData, phone: value })}
                    label="Phone"
                    fullWidth
                  />
                </Box>
                
                <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Location (Optional)</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 2 }}>
                  <TextField
                    label="Street Number"
                    value={formData.street_number}
                    onChange={(e) => setFormData({ ...formData, street_number: e.target.value })}
                    margin="normal"
                  />
                  <TextField
                    label="Street Name"
                    value={formData.street_name}
                    onChange={(e) => setFormData({ ...formData, street_name: e.target.value })}
                    margin="normal"
                  />
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 2 }}>
                  <TextField
                    label="City"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    margin="normal"
                  />
                  <TextField
                    label="State"
                    value={formData.state_province}
                    onChange={(e) => setFormData({ ...formData, state_province: e.target.value })}
                    margin="normal"
                  />
                  <TextField
                    label="Zip Code"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    margin="normal"
                  />
                </Box>
                <TextField
                  fullWidth
                  label="Country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  margin="normal"
                />
              </>
            )}
            
            {userType === 'field_agent' && (
              <>
                <Box sx={{ mt: 2, mb: 1 }}>
                  <PhoneInput
                    value={formData.phone}
                    onChange={(value) => setFormData({ ...formData, phone: value })}
                    label="Phone"
                    fullWidth
                  />
                </Box>

                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    label="Status"
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <MenuItem value="available">Available</MenuItem>
                    <MenuItem value="unavailable">Unavailable</MenuItem>
                    <MenuItem value="accepted">Accepted</MenuItem>
                    <MenuItem value="declined">Declined</MenuItem>
                    <MenuItem value="enroute">En Route</MenuItem>
                  </Select>
                </FormControl>

                <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Location (Optional)</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 2 }}>
                  <TextField
                    label="Street Number"
                    value={formData.street_number}
                    onChange={(e) => setFormData({ ...formData, street_number: e.target.value })}
                    margin="normal"
                  />
                  <TextField
                    label="Street Name"
                    value={formData.street_name}
                    onChange={(e) => setFormData({ ...formData, street_name: e.target.value })}
                    margin="normal"
                  />
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 2 }}>
                  <TextField
                    label="City"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    margin="normal"
                  />
                  <TextField
                    label="State"
                    value={formData.state_province}
                    onChange={(e) => setFormData({ ...formData, state_province: e.target.value })}
                    margin="normal"
                  />
                  <TextField
                    label="Zip Code"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    margin="normal"
                  />
                </Box>
                <TextField
                  fullWidth
                  label="Country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  margin="normal"
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditModal}>Cancel</Button>
          <Button onClick={handleUpdateUser} variant="contained">
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Role Switch Modal */}
      <Dialog 
        open={isRoleSwitchModalOpen} 
        onClose={() => setIsRoleSwitchModalOpen(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Switch User Role</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {switchingUser && (
              <>
                <Typography variant="body1" sx={{ mb: 3 }}>
                  Switch role for <strong>{switchingUser.name}</strong> ({switchingUser.email})?
                </Typography>
                
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Current Role: {' '}
                  <Chip 
                    label={switchingUser.role?.replace('_', ' ').toUpperCase() || 'Unknown'} 
                    color={
                      switchingUser.role === 'admin' ? 'error' : 
                      switchingUser.role === 'dispatcher' ? 'primary' : 
                      'default'
                    }
                    size="small"
                  />
                </Typography>

                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>New Role</InputLabel>
                  <Select
                    value={targetRole}
                    label="New Role"
                    onChange={(e) => setTargetRole(e.target.value as 'admin' | 'dispatcher' | 'field_agent')}
                  >
                    <MenuItem value="field_agent">Field Agent</MenuItem>
                    <MenuItem value="dispatcher">Dispatcher</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                  </Select>
                </FormControl>

                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Warning:</strong> Role switching will move the user between different user tables. 
                    The user will need to log in again after the role change. This action cannot be undone.
                  </Typography>
                </Alert>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsRoleSwitchModalOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleRoleSwitchConfirm} 
            variant="contained" 
            color="primary"
          >
            Switch Role
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}