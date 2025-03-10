// src/App.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layout
import NavigationBar from './components/layout/NavigationBar';
import CaptainActionButton from './components/common/CaptainActionButton';
import QuickAccessFooter from './components/layout/QuickAccessFooter';

// Pages
import Home from './pages/public/Home';
import Standings from './pages/public/Standings';
import Fixtures from './pages/public/Fixtures'; 
import PlayerStats from './pages/public/PlayerStats';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import TeamDashboard from './pages/team/Dashboard';
import TeamRoster from './pages/team/TeamRoster';
import TeamMatches from './pages/team/TeamMatches';
import MatchScorecard from './pages/team/MatchScorecard';
import AdminDashboard from './pages/admin/Dashboard';
import { Box, Container } from '@mui/material';

// Temporary ProtectedRoute component
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode, 
  allowedRoles?: string[] 
}> = ({ children }) => <>{children}</>;

const App: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Persistent Navigation */}
      <NavigationBar />
      
      {/* Main Content */}
      <Container component="main" sx={{ flex: 1, py: 3, mb: 8 }}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/standings" element={<Standings />} />
          <Route path="/fixtures" element={<Fixtures />} />
          <Route path="/players" element={<PlayerStats />} />
          
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {/* Team Routes */}
          <Route 
            path="/team" 
            element={
              <ProtectedRoute>
                <TeamDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/team/roster" 
            element={
              <ProtectedRoute>
                <TeamRoster />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/team/matches" 
            element={
              <ProtectedRoute>
                <TeamMatches />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/team/match/:matchId" 
            element={
              <ProtectedRoute>
                <MatchScorecard />
              </ProtectedRoute>
            } 
          />
          
          {/* Admin Routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Container>
      
      {/* Action Button for Captains */}
      <CaptainActionButton />
      
      {/* Footer Navigation */}
      <QuickAccessFooter />
    </Box>
  );
};

export default App;