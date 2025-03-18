// src/App.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/layout/Header';
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
import ScheduleMatches from './pages/admin/ScheduleMatches';
import ManageVenues from './pages/admin/ManageVenues';
import ManageTeams from './pages/admin/ManageTeams';
import SeasonManager from './pages/admin/SeasonManager';
import CreateSeason from './pages/admin/CreateSeason';
import { Box } from '@mui/material';

const ProtectedRoute: React.FC<{ 
  children: React.ReactNode, 
  allowedRoles?: string[] 
}> = ({ children, allowedRoles = [] }) => {
  const { user, userRole, isAdmin, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Special case for admin routes
  if (allowedRoles.includes('admin') && isAdmin) {
    return <>{children}</>;
  }
  
  // For other roles
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole || '')) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  return (
    <>
      <Header />
      <Box sx={{ paddingTop: '64px' }}>
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
          <Route 
            path="/admin/schedule-matches" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ScheduleMatches />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/venues" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ManageVenues />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/teams" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ManageTeams />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/seasons" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <SeasonManager />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/seasons/create" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <CreateSeason />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Box>
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;