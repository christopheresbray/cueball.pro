// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Auth components
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Admin components
import AdminDashboard from './pages/admin/Dashboard';
import CreateSeason from './pages/admin/CreateSeason';
import ManageTeams from './pages/admin/ManageTeams';
import ManagePlayers from './pages/admin/ManagePlayers';
import ScheduleMatches from './pages/admin/ScheduleMatches';

// Team components
import TeamDashboard from './pages/team/Dashboard';
import MatchScorecard from './pages/team/MatchScorecard';

// Public components
import Home from './pages/public/Home';
import Standings from './pages/public/Standings';
import PlayerStats from './pages/public/PlayerStats';

// Auth context
import { AuthProvider, useAuth } from './context/AuthContext';

// Protected route component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, userRole } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/" />;
  }
  
  return children;
};

// Theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1b5e20', // Green color for pool table felt
    },
    secondary: {
      main: '#795548', // Brown color for pool cue
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/standings" element={<Standings />} />
            <Route path="/players" element={<PlayerStats />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Admin routes */}
            <Route path="/admin" element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/season/create" element={
              <ProtectedRoute requiredRole="admin">
                <CreateSeason />
              </ProtectedRoute>
            } />
            <Route path="/admin/teams" element={
              <ProtectedRoute requiredRole="admin">
                <ManageTeams />
              </ProtectedRoute>
            } />
            <Route path="/admin/players" element={
              <ProtectedRoute requiredRole="admin">
                <ManagePlayers />
              </ProtectedRoute>
            } />
            <Route path="/admin/schedule" element={
              <ProtectedRoute requiredRole="admin">
                <ScheduleMatches />
              </ProtectedRoute>
            } />
            
            {/* Team routes */}
            <Route path="/team" element={
              <ProtectedRoute requiredRole="captain">
                <TeamDashboard />
              </ProtectedRoute>
            } />
            <Route path="/match/:matchId" element={
              <ProtectedRoute requiredRole="captain">
                <MatchScorecard />
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;