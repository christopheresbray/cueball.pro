import React, { useState } from 'react';
import {
  BottomNavigation,
  BottomNavigationAction,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { navigationItems, NavItem } from './config';

export const MobileNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = (open: boolean) => {
    setDrawerOpen(open);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    toggleDrawer(false);
  };

  const filteredItems = navigationItems.filter(item => {
    if (item.requiresAuth && !isAuthenticated) return false;
    if (item.allowedRoles && (!user || !item.allowedRoles.includes(user.role))) return false;
    if (!item.requiresAuth && isAuthenticated && item.path === '/login') return false;
    return true;
  });

  const mobileItems = filteredItems.filter(item => item.showInMobile);
  const drawerItems = filteredItems.filter(item => !item.showInMobile);

  return (
    <>
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => toggleDrawer(false)}
      >
        <Box sx={{ width: 250, pt: 2 }}>
          <Typography variant="h6" sx={{ px: 2, mb: 2 }}>
            Menu
          </Typography>
          <Divider />
          <List>
            {drawerItems.map((item: NavItem) => (
              <ListItem
                button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
              >
                <ListItemIcon>
                  <item.icon />
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }}>
        <BottomNavigation
          value={location.pathname}
          onChange={(_, newValue) => {
            if (newValue === 'menu') {
              toggleDrawer(true);
            } else {
              navigate(newValue);
            }
          }}
          showLabels
        >
          <BottomNavigationAction
            label="Menu"
            value="menu"
            icon={<MenuIcon />}
          />
          {mobileItems.map((item: NavItem) => (
            <BottomNavigationAction
              key={item.path}
              label={item.label}
              value={item.path}
              icon={<item.icon />}
            />
          ))}
        </BottomNavigation>
      </Box>
    </>
  );
}; 