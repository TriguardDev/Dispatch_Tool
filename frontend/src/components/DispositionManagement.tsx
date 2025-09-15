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
  IconButton,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';

interface DispositionType {
  typeCode: string;
  description: string;
  created_time: string;
  updated_time: string;
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function DispositionManagement() {
  const [dispositionTypes, setDispositionTypes] = useState<DispositionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<DispositionType | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    typeCode: '',
    description: ''
  });

  const fetchDispositionTypes = async () => {
    try {
      const res = await fetch(`${BASE_URL}/disposition-types`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        setDispositionTypes(data.success ? data.data : []);
      } else {
        setError('Failed to fetch disposition types');
      }
    } catch (err) {
      setError('Failed to fetch disposition types');
      console.error('Error fetching disposition types:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDispositionTypes();
  }, []);

  const handleCreateType = async () => {
    try {
      const res = await fetch(`${BASE_URL}/disposition-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        await fetchDispositionTypes();
        setIsCreateModalOpen(false);
        resetForm();
        setError('');
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to create disposition type');
      }
    } catch (err) {
      setError('Failed to create disposition type');
      console.error('Error creating disposition type:', err);
    }
  };

  const handleEditType = (dispositionType: DispositionType) => {
    setEditingType(dispositionType);
    setFormData({
      typeCode: dispositionType.typeCode,
      description: dispositionType.description
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateType = async () => {
    if (!editingType) return;

    try {
      const res = await fetch(`${BASE_URL}/disposition-types/${editingType.typeCode}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ description: formData.description }),
      });

      if (res.ok) {
        await fetchDispositionTypes();
        setIsEditModalOpen(false);
        setEditingType(null);
        resetForm();
        setError('');
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to update disposition type');
      }
    } catch (err) {
      setError('Failed to update disposition type');
      console.error('Error updating disposition type:', err);
    }
  };

  const handleDeleteType = async (typeCode: string, description: string) => {
    if (!window.confirm(`Are you sure you want to delete disposition type "${description}"?`)) return;

    try {
      const res = await fetch(`${BASE_URL}/disposition-types/${typeCode}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        await fetchDispositionTypes();
        setError('');
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to delete disposition type');
      }
    } catch (err) {
      setError('Failed to delete disposition type');
      console.error('Error deleting disposition type:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      typeCode: '',
      description: ''
    });
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    resetForm();
    setError('');
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingType(null);
    resetForm();
    setError('');
  };

  const formatTypeCode = (input: string) => {
    // Convert to uppercase and replace spaces with underscores
    return input.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
  };

  const handleTypeCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTypeCode(e.target.value);
    setFormData({ ...formData, typeCode: formatted });
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
          Disposition Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Create Disposition Type
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
              <TableCell>Type Code</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Updated</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dispositionTypes.map((type) => (
              <TableRow key={type.typeCode}>
                <TableCell>
                  <Chip 
                    label={type.typeCode} 
                    variant="outlined" 
                    size="small"
                    icon={<AssignmentIcon />}
                  />
                </TableCell>
                <TableCell>{type.description}</TableCell>
                <TableCell>
                  {type.created_time ? new Date(type.created_time).toLocaleDateString() : 'N/A'}
                </TableCell>
                <TableCell>
                  {type.updated_time ? new Date(type.updated_time).toLocaleDateString() : 'N/A'}
                </TableCell>
                <TableCell align="right">
                  <IconButton 
                    onClick={() => handleEditType(type)}
                    size="small"
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    onClick={() => handleDeleteType(type.typeCode, type.description)}
                    size="small"
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {dispositionTypes.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="textSecondary">No disposition types found</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Disposition Type Modal */}
      <Dialog open={isCreateModalOpen} onClose={handleCloseCreateModal} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Disposition Type</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Type Code"
            value={formData.typeCode}
            onChange={handleTypeCodeChange}
            margin="normal"
            required
            helperText="Alphanumeric characters and underscores only. Will be converted to uppercase."
            placeholder="SOLD_CASH_PIF"
          />
          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
            required
            multiline
            rows={2}
            placeholder="Sold - Cash Deal (Paid in Full)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateModal}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateType} 
            variant="contained"
            disabled={!formData.typeCode.trim() || !formData.description.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Disposition Type Modal */}
      <Dialog open={isEditModalOpen} onClose={handleCloseEditModal} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Disposition Type</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Type Code"
            value={formData.typeCode}
            margin="normal"
            disabled
            helperText="Type code cannot be changed"
          />
          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
            required
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditModal}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateType} 
            variant="contained"
            disabled={!formData.description.trim()}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}