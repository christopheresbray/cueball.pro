import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/public/Home';

// Placeholder components - you'll need to create these
const Standings = () => <div>Standings Page</div>;
const Fixtures = () => <div>Fixtures Page</div>;
const PlayerStats = () => <div>Player Stats Page</div>;
const Login = () => <div>Login Page</div>;
const Register = () => <div>Register Page</div>;
const ForgotPassword = () => <div>Forgot Password Page</div>;
const AdminDashboard = () => <div>Admin Dashboard</div>;

// Temporary ProtectedRoute component
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode, 
  allowedRoles?: string[] 
}> = ({ children }) => <>{children}</>;

const App: React.FC = () => {
  return (
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
      
      {/* Fallback Route */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default App;