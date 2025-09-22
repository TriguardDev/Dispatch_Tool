import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  Alert,
  Chip,
  Menu,
  MenuItem,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Business as BusinessIcon
} from '@mui/icons-material';

interface Region {
  regionId: number;
  name: string;
  description: string;
  is_global: boolean;
  team_count: number;
  booking_count: number;
  created_time: string;
  updated_time: string;
}

interface Team {
  teamId: number;
  name: string;
  description: string;
  region_id: number;
  region_name: string;
  region_is_global: boolean;
}

interface RegionFormData {
  name: string;
  description: string;
  is_global: boolean;
}

const RegionManagement: React.FC = () => {
  const [regions, setRegions] = useState<Region[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Form and selection states
  const [formData, setFormData] = useState<RegionFormData>({
    name: '',
    description: '',
    is_global: false
  });
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const fetchRegions = async () => {
    try {
      const BASE_URL = import.meta.env.VITE_BASE_API_URL;
      const response = await fetch(`${BASE_URL}/regions`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch regions');
      }
      
      const data = await response.json();
      if (data.success) {
        setRegions(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch regions');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch regions');
    }
  };

  const fetchTeams = async () => {
    try {
      const BASE_URL = import.meta.env.VITE_BASE_API_URL;
      const response = await fetch(`${BASE_URL}/teams`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }
      
      const data = await response.json();
      if (data.success) {
        setTeams(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch teams');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch teams');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchRegions(), fetchTeams()]);
      setLoading(false);
    };
    
    loadData();
  }, []);

  const handleCreateRegion = async () => {
    try {
      const BASE_URL = import.meta.env.VITE_BASE_API_URL;
      const response = await fetch(`${BASE_URL}/regions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (data.success) {
        setSuccess('Region created successfully');
        setCreateDialogOpen(false);
        setFormData({ name: '', description: '', is_global: false });
        await fetchRegions();
      } else {
        throw new Error(data.error || 'Failed to create region');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create region');
    }
  };

  const handleUpdateRegion = async () => {
    if (!selectedRegion) return;
    
    try {
      const response = await fetch(`/api/regions/${selectedRegion.regionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (data.success) {
        setSuccess('Region updated successfully');
        setEditDialogOpen(false);
        setSelectedRegion(null);
        setFormData({ name: '', description: '', is_global: false });
        await fetchRegions();
      } else {
        throw new Error(data.error || 'Failed to update region');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update region');
    }
  };

  const handleDeleteRegion = async () => {
    if (!selectedRegion) return;
    
    try {
      const response = await fetch(`/api/regions/${selectedRegion.regionId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      const data = await response.json();
      if (data.success) {
        setSuccess(data.message || 'Region deleted successfully');
        setDeleteDialogOpen(false);
        setSelectedRegion(null);
        await Promise.all([fetchRegions(), fetchTeams()]);
      } else {
        throw new Error(data.error || 'Failed to delete region');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete region');
    }
  };


  const openEditDialog = (region: Region) => {
    setSelectedRegion(region);
    setFormData({
      name: region.name,
      description: region.description || '',
      is_global: region.is_global
    });
    setEditDialogOpen(true);
    setMenuAnchor(null);
  };

  const openDeleteDialog = (region: Region) => {
    setSelectedRegion(region);
    setDeleteDialogOpen(true);
    setMenuAnchor(null);
  };


  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Region Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Region
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Teams</TableCell>
              <TableCell>Bookings</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {regions.map((region) => (
              <TableRow key={region.regionId}>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <BusinessIcon color={region.is_global ? "primary" : "action"} />
                    {region.name}
                  </Box>
                </TableCell>
                <TableCell>{region.description || 'No description'}</TableCell>
                <TableCell>
                  <Chip 
                    label={region.is_global ? 'Global' : 'Regional'} 
                    color={region.is_global ? 'primary' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{region.team_count}</TableCell>
                <TableCell>{region.booking_count}</TableCell>
                <TableCell>
                  {new Date(region.created_time).toLocaleDateString()}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    onClick={(e) => {
                      setSelectedRegion(region);
                      setMenuAnchor(e.currentTarget);
                    }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Actions Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => openEditDialog(selectedRegion!)}>
          <EditIcon sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        {selectedRegion && !selectedRegion.is_global && (
          <MenuItem onClick={() => openDeleteDialog(selectedRegion)}>
            <DeleteIcon sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        )}
      </Menu>

      {/* Create Region Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Region</DialogTitle>
        <DialogContent>
          <TextField
            label="Region Name"
            fullWidth
            margin="normal"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <TextField
            label="Description"
            fullWidth
            margin="normal"
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.is_global}
                onChange={(e) => setFormData({ ...formData, is_global: e.target.checked })}
              />
            }
            label="Global Region (accessible by all teams)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateRegion} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Region Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Region</DialogTitle>
        <DialogContent>
          <TextField
            label="Region Name"
            fullWidth
            margin="normal"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <TextField
            label="Description"
            fullWidth
            margin="normal"
            multiline
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          {selectedRegion && !selectedRegion.is_global && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.is_global}
                  onChange={(e) => setFormData({ ...formData, is_global: e.target.checked })}
                />
              }
              label="Global Region (accessible by all teams)"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateRegion} variant="contained">
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Region</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the region "{selectedRegion?.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            All teams and bookings in this region will be moved to the Global region.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteRegion} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default RegionManagement;