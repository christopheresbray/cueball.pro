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
  Container,
  Button,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PendingIcon from '@mui/icons-material/Pending';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DateRangeIcon from '@mui/icons-material/DateRange';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { useAuth } from '../../context/AuthContext';
import { getTeamMatches, getTeam, getVenue, Match, getTeamByPlayerId, getMatches, Team, getCurrentSeason } from '../../services/databaseService';

// Match status types
type MatchStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

// Extended Match interface to include additional fields
interface ExtendedMatch extends Match {
  homeTeamName: string;
  awayTeamName: string;
  venueName: string;
  formattedDate: string;
  homeScore?: number;
  awayScore?: number;
}

const TeamMatches: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [matches, setMatches] = useState<ExtendedMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userTeam, setUserTeam] = useState<Team | null>(null);

  useEffect(() => {
    const fetchMatches = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError('');

        // Get the user's team if they are a captain
        if (userRole === 'captain') {
          const team = await getTeamByPlayerId(user.uid);
          if (team) {
            setUserTeam(team);
          }
        }

        // Get current season
        const currentSeason = await getCurrentSeason();
        if (!currentSeason) {
          setError('No active season found');
          return;
        }

        // Get all matches for the current season
        const allMatches = await getMatches(currentSeason.id!);
        
        // Get team and venue details for each match
        const matchesWithDetails = await Promise.all(
          allMatches.map(async (match) => {
            const [homeTeam, awayTeam, venue] = await Promise.all([
              getTeam(match.homeTeamId),
              getTeam(match.awayTeamId),
              getVenue(match.venueId),
            ]);

            return {
              ...match,
              homeTeamName: homeTeam?.name || 'Unknown Team',
              awayTeamName: awayTeam?.name || 'Unknown Team',
              venueName: venue?.name || 'Unknown Venue',
              formattedDate: match.scheduledDate?.toDate().toLocaleDateString() || 'Date not specified',
            };
          })
        );

        setMatches(matchesWithDetails);
      } catch (err: any) {
        setError(err.message || 'Failed to load matches');
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [user, userRole]);

  const handleEditMatch = (matchId: string) => {
    navigate(`/team/match/${matchId}`);
  };

  const handleScoreMatch = (matchId: string) => {
    navigate(`/team/match/${matchId}/score`);
  };

  const handleTeamSelect = async (teamId: string) => {
    const team = await getTeam(teamId);
    if (team) {
      setUserTeam(team);
    }
  };

  // Helper to get status chip
  const getStatusChip = (status: MatchStatus) => {
    switch(status) {
      case 'scheduled':
        return <Chip 
          icon={<AccessTimeIcon />} 
          label="Scheduled" 
          color="primary" 
          size="small" 
          variant="outlined"
        />;
      case 'in_progress':
        return <Chip 
          icon={<PendingIcon />} 
          label="In Progress" 
          color="warning" 
          size="small" 
        />;
      case 'completed':
        return <Chip 
          icon={<CheckCircleOutlineIcon />} 
          label="Completed" 
          color="success" 
          size="small" 
        />;
      case 'cancelled':
        return <Chip 
          label="Cancelled" 
          color="error" 
          size="small" 
        />;
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Team Matches
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Paper>
          <List>
            {matches.map((match, index) => (
              <React.Fragment key={match.id}>
                {index > 0 && <Divider />}
                <ListItem>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6">
                          {match.homeTeamName} vs {match.awayTeamName}
                        </Typography>
                        {getStatusChip(match.status)}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          <DateRangeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                          <Typography component="span" variant="body2" color="text.secondary">
                            {match.formattedDate || 'Date not specified'}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          <LocationOnIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                          <Typography component="span" variant="body2" color="text.secondary">
                            {match.venueName || 'Venue not specified'}
                          </Typography>
                        </Box>
                        
                        {(match.status === 'completed' || match.status === 'in_progress') && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2" fontWeight="medium">
                              Score: {match.homeTeamName} {match.homeScore || 0} - {match.awayScore || 0} {match.awayTeamName}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    {match.status === 'scheduled' && (
                      <IconButton
                        edge="end"
                        aria-label="edit"
                        onClick={() => handleEditMatch(match.id!)}
                      >
                        <EditIcon />
                      </IconButton>
                    )}
                    {match.status === 'in_progress' && match.homeTeamId === userTeam?.id && (
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => handleScoreMatch(match.id!)}
                        startIcon={<EditIcon />}
                      >
                        Score Match
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate(`/team/match/${match.id}`)}
                      sx={{ mr: 1 }}
                    >
                      VIEW DETAILS
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
    </Container>
  );
};

export default TeamMatches;