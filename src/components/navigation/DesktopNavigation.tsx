import React from 'react';
import {
  AppBar,
  Toolbar,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { navigationItems, NavItem } from './config';
import { SportsBar as LogoIcon } from '@mui/icons-material';
import { Person as PersonIcon } from '@mui/icons-material';

export const DesktopNavigation: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    handleMenuClose();
  };

  const filteredItems = navigationItems.filter(item => {
    if (!item.showInHeader) return false;
    if (item.requiresAuth && !isAuthenticated) return false;
    if (item.allowedRoles && (!user || !item.allowedRoles.includes(user.role))) return false;
    if (!item.requiresAuth && isAuthenticated && item.path === '/login') return false;
    return true;
  });

  const mainItems = filteredItems.filter(item => !item.requiresAuth);
  const authItems = filteredItems.filter(item => item.requiresAuth);

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          onClick={() => navigate('/')}
          sx={{ mr: 2 }}
        >
          <LogoIcon />
        </IconButton>
        
        <Typography variant="h6" sx={{ flexGrow: 0, mr: 4 }}>
          Cueball Pro
        </Typography>

        <Box sx={{ flexGrow: 1, display: 'flex', gap: 2 }}>
          {mainItems.map((item: NavItem) => (
            <Button
              key={item.path}
              color="inherit"
              onClick={() => handleNavigation(item.path)}
              startIcon={<item.icon />}
            >
              {item.label}
            </Button>
          ))}
        </Box>

        {isAuthenticated && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body1">
              {user?.role === 'admin' ? 'Admin' : `${user?.name}${user?.isCaptain ? ' (Captain)' : ''}`}
            </Typography>
            <Button
              color="inherit"
              onClick={handleMenuOpen}
              startIcon={<PersonIcon />}
            >
              Account
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={() => handleNavigation('/profile')}>Profile</MenuItem>
              <MenuItem onClick={() => handleNavigation('/logout')}>Logout</MenuItem>
            </Menu>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}; 