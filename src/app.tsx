// src/App.tsx
import React from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/public/Home';
import Standings from './pages/public/Standings';
import Fixtures from './pages/public/Fixtures'; 
import PlayerStats from './pages/public/PlayerStats';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import TeamDashboard from './pages/team/Dashboard';
import TeamRoster from './pages/team/TeamRoster';
import MatchScorecard from './pages/team/MatchScorecard';
import AdminDashboard from './pages/admin/Dashboard';

// Temporary ProtectedRoute component
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode, 
  allowedRoles?: string[] 
}> = ({ children }) => <>{children}</>;

const App: React.FC = () => {
  return (
    <AuthProvider>
      <>
        {/* Direct navigation bar that doesn't rely on imported components */}
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          background: '#2196f3', 
          padding: '10px', 
          display: 'flex', 
          justifyContent: 'center',
          gap: '10px',
          zIndex: 1000
        }}>
          <Link to="/" style={{ 
            color: 'white', 
            textDecoration: 'none', 
            padding: '5px 15px', 
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '4px'
          }}>
            Home
          </Link>
          <Link to="/login" style={{ 
            color: 'white', 
            textDecoration: 'none', 
            padding: '5px 15px', 
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '4px',
            fontWeight: 'bold'
          }}>
            Login
          </Link>
          <Link to="/team" style={{ 
            color: 'white', 
            textDecoration: 'none', 
            padding: '5px 15px', 
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '4px'
          }}>
            Team
          </Link>
        </div>

        {/* Add spacing to prevent content from being hidden under the navigation */}
        <div style={{ paddingTop: '50px' }}>
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
        </div>
      </>
    </AuthProvider>
  );
};

export default App;