import React, { lazy, Suspense } from 'react';
import { Navigate, Location } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';

// Lazy loaded components with fallback
const Home = lazy(() => import('./pages/public/Home'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const Profile = lazy(() => import('./pages/auth/Profile'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const ManageTeams = lazy(() => import('./pages/admin/ManageTeams'));
const ManageVenues = lazy(() => import('./pages/admin/ManageVenues'));
const SeasonManager = lazy(() => import('./pages/admin/SeasonManager'));
const CreateSeason = lazy(() => import('./pages/admin/CreateSeason'));
const ManagePlayers = lazy(() => import('./pages/admin/ManagePlayers'));
const ScheduleMatches = lazy(() => import('./pages/admin/ScheduleMatches'));
const TeamDashboard = lazy(() => import('./pages/team/Dashboard'));
const TeamRoster = lazy(() => import('./pages/team/TeamRoster'));
const TeamMatches = lazy(() => import('./pages/team/TeamMatches'));
const LineupSubmission = lazy(() => import('./pages/team/LineupSubmission'));
const MatchScoringRefactored = lazy(() => import('./pages/team/MatchScoringRefactored'));
const MatchScoringV2Page = lazy(() => import('./pages/team/MatchScoringV2Page'));
const LiveMatches = lazy(() => import('./pages/public/LiveMatches'));
const Standings = lazy(() => import('./pages/public/Standings'));
const Fixtures = lazy(() => import('./pages/public/Fixtures'));
const PlayerStats = lazy(() => import('./pages/public/PlayerStats'));
const MatchDetails = lazy(() => import('./components/team/MatchDetails'));

// Loader component for Suspense fallback
const LoadingFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
    <CircularProgress />
  </Box>
);

// Wrap component with Suspense
const withSuspense = (Component: React.ComponentType<any>) => (
  <Suspense fallback={<LoadingFallback />}>
    <Component />
  </Suspense>
);

// Define route types for better organization
type AppRoute = {
  path: string;
  element: React.ReactNode;
  requiresAuth?: boolean;
  allowedRoles?: string[];
};

// Public routes
export const publicRoutes: AppRoute[] = [
  { path: '/', element: withSuspense(Home) },
  { path: '/live', element: withSuspense(LiveMatches) },
  { path: '/standings', element: withSuspense(Standings) },
  { path: '/fixtures', element: withSuspense(Fixtures) },
  { path: '/players', element: withSuspense(PlayerStats) },
  { path: '/login', element: withSuspense(Login) },
  { path: '/register', element: withSuspense(Register) },
  { path: '/forgot-password', element: withSuspense(ForgotPassword) },
  { path: '/profile', element: withSuspense(Profile), requiresAuth: true },
  { 
    path: '/matches/:matchId',
    element: <Navigate to="/team/match/:matchId" replace />
  }
];

// Team routes
export const teamRoutes: AppRoute[] = [
  {
    path: '/team',
    element: withSuspense(TeamDashboard),
    requiresAuth: true,
    allowedRoles: ['captain', 'player']
  },
  {
    path: '/team/roster',
    element: withSuspense(TeamRoster),
    requiresAuth: true,
    allowedRoles: ['captain']
  },
  {
    path: '/team/matches',
    element: withSuspense(TeamMatches),
    requiresAuth: true,
    allowedRoles: ['captain', 'player']
  },
  {
    path: '/team/match/:matchId',
    element: withSuspense(MatchDetails),
    requiresAuth: true,
    allowedRoles: ['captain', 'player']
  },
  {
    path: '/team/match/:matchId/lineup',
    element: withSuspense(LineupSubmission),
    requiresAuth: true,
    allowedRoles: ['captain']
  },
  {
    path: '/team/match/:matchId/score',
    element: withSuspense(MatchScoringRefactored),
    requiresAuth: true,
    allowedRoles: ['captain']
  },
  {
    path: '/team/match/:matchId/score-v2',
    element: withSuspense(MatchScoringV2Page),
    requiresAuth: true,
    allowedRoles: ['captain']
  }
];

// Admin routes
export const adminRoutes: AppRoute[] = [
  {
    path: '/admin',
    element: withSuspense(Dashboard),
    requiresAuth: true,
    allowedRoles: ['admin']
  },
  {
    path: '/admin/teams',
    element: withSuspense(ManageTeams),
    requiresAuth: true,
    allowedRoles: ['admin']
  },
  {
    path: '/admin/schedule-matches',
    element: withSuspense(ScheduleMatches),
    requiresAuth: true,
    allowedRoles: ['admin']
  },
  {
    path: '/admin/venues',
    element: withSuspense(ManageVenues),
    requiresAuth: true,
    allowedRoles: ['admin']
  },
  {
    path: '/admin/seasons',
    element: withSuspense(SeasonManager),
    requiresAuth: true,
    allowedRoles: ['admin']
  },
  {
    path: '/admin/seasons/create',
    element: withSuspense(CreateSeason),
    requiresAuth: true,
    allowedRoles: ['admin']
  },
  {
    path: '/admin/seasons/edit/:id',
    element: withSuspense(CreateSeason),
    requiresAuth: true,
    allowedRoles: ['admin']
  },
  {
    path: '/admin/players',
    element: withSuspense(ManagePlayers),
    requiresAuth: true,
    allowedRoles: ['admin']
  }
];

// Combine all routes
export const routes: AppRoute[] = [
  ...publicRoutes.filter(route => route.path !== '/'),  // Filter out home route
  ...teamRoutes,
  ...adminRoutes,
  { path: '/', element: withSuspense(Home) },  // Add home route at the end
  { path: '*', element: <Navigate to="/" replace /> }  // Add catch-all route
]; 