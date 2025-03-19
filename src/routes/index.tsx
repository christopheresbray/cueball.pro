import React from 'react';
import { RouteObject } from 'react-router-dom';
import Home from '../pages/public/Home';
import Standings from '../pages/public/Standings';
import Fixtures from '../pages/public/Fixtures';
import PlayerStats from '../pages/public/PlayerStats';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ForgotPassword from '../pages/auth/ForgotPassword';
import TeamDashboard from '../pages/team/Dashboard';
import TeamRoster from '../pages/team/TeamRoster';
import TeamMatches from '../pages/team/TeamMatches';
import LineupSubmission from '../pages/team/LineupSubmission';
import AdminDashboard from '../pages/admin/Dashboard';
import ScheduleMatches from '../pages/admin/ScheduleMatches';
import ManageVenues from '../pages/admin/ManageVenues';
import ManageTeams from '../pages/admin/ManageTeams';
import SeasonManager from '../pages/admin/SeasonManager';
import CreateSeason from '../pages/admin/CreateSeason';

// Define route types for better organization
type AppRoute = {
  path: string;
  element: React.ReactNode;
  requiresAuth?: boolean;
  allowedRoles?: string[];
};

// Public routes
export const publicRoutes: AppRoute[] = [
  { path: '/', element: <Home /> },
  { path: '/standings', element: <Standings /> },
  { path: '/fixtures', element: <Fixtures /> },
  { path: '/players', element: <PlayerStats /> },
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  { path: '/forgot-password', element: <ForgotPassword /> },
];

// Team routes
export const teamRoutes: AppRoute[] = [
  { 
    path: '/team',
    element: <TeamDashboard />,
    requiresAuth: true
  },
  {
    path: '/team/roster',
    element: <TeamRoster />,
    requiresAuth: true
  },
  {
    path: '/team/matches',
    element: <TeamMatches />,
    requiresAuth: true
  },
  {
    path: '/team/match/:matchId',
    element: <LineupSubmission />,
    requiresAuth: true,
    allowedRoles: ['captain']
  },
];

// Admin routes
export const adminRoutes: AppRoute[] = [
  {
    path: '/admin',
    element: <AdminDashboard />,
    requiresAuth: true,
    allowedRoles: ['admin']
  },
  {
    path: '/admin/dashboard',
    element: <AdminDashboard />,
    requiresAuth: true,
    allowedRoles: ['admin']
  },
  {
    path: '/admin/schedule-matches',
    element: <ScheduleMatches />,
    requiresAuth: true,
    allowedRoles: ['admin']
  },
  {
    path: '/admin/venues',
    element: <ManageVenues />,
    requiresAuth: true,
    allowedRoles: ['admin']
  },
  {
    path: '/admin/teams',
    element: <ManageTeams />,
    requiresAuth: true,
    allowedRoles: ['admin']
  },
  {
    path: '/admin/seasons',
    element: <SeasonManager />,
    requiresAuth: true,
    allowedRoles: ['admin']
  },
  {
    path: '/admin/seasons/create',
    element: <CreateSeason />,
    requiresAuth: true,
    allowedRoles: ['admin']
  },
];

// Combine all routes
export const routes: AppRoute[] = [
  ...publicRoutes,
  ...teamRoutes,
  ...adminRoutes,
]; 