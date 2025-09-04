import { Card, CardContent, Typography, Box, Chip } from '@mui/material';

interface QueueCardProps {
  title: string;
  badgeColor: string;
  count: number;
  children?: React.ReactNode;
}

// Map Tailwind classes to Material-UI chip colors
const getChipColor = (badgeColor: string): 'primary' | 'secondary' | 'success' | 'warning' | 'error' => {
  if (badgeColor.includes('blue')) return 'primary';
  if (badgeColor.includes('yellow') || badgeColor.includes('amber')) return 'warning';
  if (badgeColor.includes('green') || badgeColor.includes('emerald')) return 'success';
  return 'secondary';
};

export default function QueueCard({ title, badgeColor, count, children }: QueueCardProps) {
  const chipColor = getChipColor(badgeColor);

  return (
    <Card variant="outlined" sx={{ height: 'fit-content' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight="600">
            {title}
          </Typography>
          <Chip 
            label={count} 
            color={chipColor}
            size="small"
            variant="filled"
          />
        </Box>
        
        <Box 
          sx={{ 
            maxHeight: '60vh', 
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}
        >
          {children || (
            <Typography variant="body2" color="text.secondary" fontStyle="italic">
              No items yet
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
