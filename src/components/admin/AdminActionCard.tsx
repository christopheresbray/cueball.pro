// src/components/admin/AdminActionCard.tsx
import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  CardActions, 
  Button, 
  Box,
  useTheme
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { ArrowForward as ArrowForwardIcon } from '@mui/icons-material';

interface AdminActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  link: string;
}

const AdminActionCard: React.FC<AdminActionCardProps> = ({ 
  title, 
  description, 
  icon, 
  link 
}) => {
  const theme = useTheme();
  
  return (
    <Card 
      sx={{ 
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
      <CardContent sx={{ flexGrow: 1 }}>
        <Box 
          display="flex" 
          alignItems="center" 
          mb={2}
        >
          {icon}
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ ml: 1 }}
          >
            {title}
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
      
      <CardActions>
        <Button 
          size="small" 
          color="primary" 
          component={RouterLink} 
          to={link}
          endIcon={<ArrowForwardIcon />}
        >
          Go
        </Button>
      </CardActions>
    </Card>
  );
};

export default AdminActionCard;