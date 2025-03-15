// src/pages/team/TeamMatches.tsx
import React, { useEffect, useState } from 'react';
import {
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Box,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PendingIcon from '@mui/icons-material/Pending';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DateRangeIcon from '@mui/icons-material/DateRange';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { useAuth } from '../../context/AuthContext';
import { getTeamMatches, getTeam, getVenue, Match } from '../../services/databaseService';

type MatchStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

const formatDate = (timestamp: any) => {
  const date = timestamp?.toDate ? timestamp.toDate() : new Date();
  return date.toLocaleDateString('en-AU', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const TeamMatches: React.FC = () => {
  const [matches, setMatches] = useState<(Match & {
    homeTeamName: string;
    awayTeamName: string;
    venueName: string;
    formattedDate: string;
  })[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMatches = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const userTeamMatches = await getTeamMatches(user.uid);

        const enhancedMatches = await Promise.all(
          userTeamMatches.map(async (match: Match) => {
            const homeTeam = await getTeam(match.homeTeamId);
            const awayTeam = await getTeam(match.awayTeamId);
            const venue = await getVenue(match.venueId);

            return {
              ...match,
              homeTeamName: homeTeam?.name || 'Unknown Team',
              awayTeamName: awayTeam?.name || 'Unknown Team',
              venueName: venue?.name || 'Unknown Venue',
              formattedDate: formatDate(match.scheduledDate),
            };
          })
        );

        enhancedMatches.sort((a, b) => a.scheduledDate.seconds - b.scheduledDate.seconds);
        setMatches(enhancedMatches);
      } catch (err) {
        console.error('Error loading matches:', err);
        setError('Unable to load matches.');
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [user]);

  const handleEditMatch = (matchId: string) => {
    navigate(`/team/match/${matchId}`);
  };

  const getStatusChip = (status: MatchStatus) => {
    const chipProps: Record<MatchStatus, { icon?: React.ReactElement; label: string; color: "primary" | "warning" | "success" | "error"; variant?: "outlined" }> = {
      scheduled: { icon: <AccessTimeIcon />, label: 'Scheduled', color: 'primary', variant: 'outlined' },
      in_progress: { icon: <PendingIcon />, label: 'In Progress', color: 'warning' },
      completed: { icon: <CheckCircleOutlineIcon />, label: 'Completed', color: 'success' },
      cancelled: { label: 'Cancelled', color: 'error' },
    };

    const { icon, label, color, variant } = chipProps[status];
    return (
      <Chip
        icon={icon}
        label={label}
        color={color}
        size="small"
        variant={variant}
      />
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (matches.length === 0) {
    return <Alert severity="info">No matches found.</Alert>;
  }

  return (
    <Paper sx={{ p: 3, mt: 2 }}>
      <Typography variant="h6" gutterBottom>Your Matches</Typography>
      <List>
        {matches.map((match, index) => (
          <React.Fragment key={match.id}>
            {index > 0 && <Divider />}
            <ListItem
              secondaryAction={
                <IconButton onClick={() => handleEditMatch(match.id!)} disabled={match.status === 'completed'}>
                  <EditIcon />
                </IconButton>
              }
            >
              <ListItemText
                primary={`${match.homeTeamName} vs ${match.awayTeamName}`}
                secondary={
                  <Box>
                    <Box display="flex" alignItems="center">
                      <DateRangeIcon fontSize="small" sx={{ mr: 1 }} />
                      <Typography variant="body2">{match.formattedDate}</Typography>
                    </Box>
                    <Box display="flex" alignItems="center">
                      <LocationOnIcon fontSize="small" sx={{ mr: 1 }} />
                      <Typography variant="body2">{match.venueName}</Typography>
                    </Box>
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                {getStatusChip(match.status)}
              </ListItemSecondaryAction>
            </ListItem>
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
};

export default TeamMatches;