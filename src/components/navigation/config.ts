import {
  Home as HomeIcon,
  Leaderboard as LeaderboardIcon,
  CalendarMonth as CalendarIcon,
  People as PeopleIcon,
  Dashboard as DashboardIcon,
  Login as LoginIcon,
  Sports as SportsIcon,
  SportsBar as SportsBarIcon,
  Person as PersonIcon,
  ExitToApp as ExitToAppIcon,
  SportsScore as SportsScoreIcon,
} from '@mui/icons-material';

export interface NavItem {
  label: string;
  path: string;
  icon: any;
  requiresAuth?: boolean;
  allowedRoles?: string[];
  showInHeader?: boolean;
  showInMobile?: boolean;
  showInQuickAccess?: boolean;
}

export const navigationItems: NavItem[] = [
  {
    label: 'Home',
    path: '/',
    icon: HomeIcon,
    showInHeader: true,
    showInMobile: true,
  },
  {
    label: 'Live Matches',
    path: '/live',
    icon: SportsScoreIcon,
    showInHeader: true,
    showInMobile: true,
  },
  {
    label: 'Standings',
    path: '/standings',
    icon: LeaderboardIcon,
    showInHeader: true,
    showInMobile: true,
  },
  {
    label: 'Fixtures',
    path: '/fixtures',
    icon: CalendarIcon,
    showInHeader: true,
    showInMobile: true,
  },
  {
    label: 'Teams',
    path: '/teams',
    icon: PeopleIcon,
    showInHeader: true,
    showInMobile: true,
  },
  {
    label: 'Login',
    path: '/login',
    icon: LoginIcon,
    showInHeader: true,
    showInMobile: true,
  },
  {
    label: 'Team Dashboard',
    path: '/team',
    icon: SportsBarIcon,
    requiresAuth: true,
    allowedRoles: ['captain', 'admin', 'player'],
    showInHeader: true,
    showInMobile: true,
    showInQuickAccess: true,
  },
  {
    label: 'Enter Results',
    path: '/team/matches',
    icon: SportsIcon,
    requiresAuth: true,
    allowedRoles: ['captain', 'admin'],
    showInHeader: true,
    showInQuickAccess: true,
  },
  {
    label: 'Admin Dashboard',
    path: '/admin',
    icon: DashboardIcon,
    requiresAuth: true,
    allowedRoles: ['admin'],
    showInHeader: true,
  },
  {
    label: 'Profile',
    path: '/profile',
    icon: PersonIcon,
    requiresAuth: true,
    showInHeader: true,
  },
  {
    label: 'Logout',
    path: '/logout',
    icon: ExitToAppIcon,
    requiresAuth: true,
    showInHeader: true,
  },
]; 