// src/App.jsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './context/AuthContext';

// Public Pages
import Home from './pages/public/Home';
import Standings from './pages/public/Standings';
import PlayerStats from './pages/public/PlayerStats';
import Fixtures from './pages/public/Fixtures';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import CreateSeason from './pages/admin/CreateSeason';
import ManageTeams from './pages/admin/ManageTeams';
import ManagePlayers from './pages/admin/ManagePlayers';
import ManageVenues from './pages/admin/ManageVenues';
import ScheduleMatches from './pages/admin/ScheduleMatches';

// Team Pages
import TeamDashboard from './pages/team/Dashboard';
import MatchScorecard from './pages/team/MatchScorecard';
import TeamRoster from './pages/team/TeamRoster';

// Layout & Components
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/common/ProtectedRoute';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1e3a8a',
    },
    secondary: {
      main: '#10b981',
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
});

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <MainLayout>
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
                path="/admin/seasons/create" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <CreateSeason />
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
                path="/admin/players" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ManagePlayers />
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
                path="/admin/schedule" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ScheduleMatches />
                  </ProtectedRoute>
                } 
              />
              
              {/* Team Routes */}
              <Route 
                path="/team" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'captain']}>
                    <TeamDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/team/match/:matchId" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'captain']}>
                    <MatchScorecard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/team/roster" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'captain']}>
                    <TeamRoster />
                  </ProtectedRoute>
                } 
              />
              
              {/* Fallback Route */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </MainLayout>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;