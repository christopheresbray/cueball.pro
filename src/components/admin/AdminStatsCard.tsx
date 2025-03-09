// src/components/admin/AdminStatsCard.tsx
import React from 'react';
import { 
  Paper, 
  Box, 
  Typography, 
  useTheme 
} from '@mui/material';

interface AdminStatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
}

const AdminStatsCard: React.FC<AdminStatsCardProps> = ({ 
  title, 
  value, 
  icon 
}) => {
  const theme = useTheme();
  
  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 3, 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[4]
        }
      }}
    >
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems="flex-start"
      >
        <Box>
          <Typography variant="h4" component="div" fontWeight="bold">
            {value}
          </Typography>
          
          <Typography 
            variant="subtitle1" 
            color="text.secondary" 
            sx={{ mt: 1 }}
          >
            {title}
          </Typography>
        </Box>
        
        <Box>
          {icon}
        </Box>
      </Box>
    </Paper>
  );
};

export default AdminStatsCard;