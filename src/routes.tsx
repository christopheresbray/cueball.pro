import React from 'react';
import Home from './pages/public/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Profile from './pages/auth/Profile';
import Dashboard from './pages/admin/Dashboard';
import ManageTeams from './pages/admin/ManageTeams';
import ManageVenues from './pages/admin/ManageVenues';
import SeasonManager from './pages/admin/SeasonManager';
import CreateSeason from './pages/admin/CreateSeason';
import ManagePlayers from './pages/admin/ManagePlayers';
import ScheduleMatches from './pages/admin/ScheduleMatches';
import TeamDashboard from './pages/team/Dashboard';
import TeamRoster from './pages/team/TeamRoster';
import TeamMatches from './pages/team/TeamMatches';
import LineupSubmission from './pages/team/LineupSubmission';
import MatchScoring from './pages/team/MatchScoring';
import LiveMatches from './pages/public/LiveMatches';

export const routes = [
  {
    path: '/',
    element: <Home />,
    requiresAuth: false,
  },
  {
    path: '/live',
    element: <LiveMatches />,
    requiresAuth: false,
  },
  {
    path: '/login',
    element: <Login />,
    requiresAuth: false,
  },
  {
    path: '/register',
    element: <Register />,
    requiresAuth: false,
  },
  {
    path: '/profile',
    element: <Profile />,
    requiresAuth: true,
  },
  {
    path: '/admin',
    element: <Dashboard />,
    requiresAuth: true,
    allowedRoles: ['admin'],
  },
  {
    path: '/admin/teams',
    element: <ManageTeams />,
    requiresAuth: true,
    allowedRoles: ['admin'],
  },
  {
    path: '/admin/venues',
    element: <ManageVenues />,
    requiresAuth: true,
    allowedRoles: ['admin'],
  },
  {
    path: '/admin/seasons',
    element: <SeasonManager />,
    requiresAuth: true,
    allowedRoles: ['admin'],
  },
  {
    path: '/admin/create-season',
    element: <CreateSeason />,
    requiresAuth: true,
    allowedRoles: ['admin'],
  },
  {
    path: '/admin/players',
    element: <ManagePlayers />,
    requiresAuth: true,
    allowedRoles: ['admin'],
  },
  {
    path: '/admin/schedule',
    element: <ScheduleMatches />,
    requiresAuth: true,
    allowedRoles: ['admin'],
  },
  {
    path: '/team',
    element: <TeamDashboard />,
    requiresAuth: true,
  },
  {
    path: '/team/roster',
    element: <TeamRoster />,
    requiresAuth: true,
  },
  {
    path: '/team/matches',
    element: <TeamMatches />,
    requiresAuth: true,
  },
  {
    path: '/team/match/:matchId/lineup',
    element: <LineupSubmission />,
    requiresAuth: true,
  },
  {
    path: '/team/match/:matchId/score',
    element: <MatchScoring />,
    requiresAuth: true,
  }
]; 