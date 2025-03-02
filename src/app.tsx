import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import AdminDashboard from './pages/admin/Dashboard';
import ManagePlayers from './pages/admin/ManagePlayers';
import TeamDashboard from './pages/team/Dashboard';
import Home from './pages/public/Home';
import PlayerStats from './pages/public/PlayerStats';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/players" element={<ManagePlayers />} />
        <Route path="/team" element={<TeamDashboard />} />
        <Route path="/stats" element={<PlayerStats />} />
      </Routes>
    </Router>
  );
};

export default App;


 