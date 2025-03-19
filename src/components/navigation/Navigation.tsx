import React from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import { DesktopNavigation } from './DesktopNavigation';
import { MobileNavigation } from './MobileNavigation';

export const Navigation: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return isMobile ? <MobileNavigation /> : <DesktopNavigation />;
}; 