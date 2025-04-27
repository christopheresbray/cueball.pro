// src/components/team/MatchDetails.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import { Match, Team, Venue, getMatch, getTeam, getVenue, isUserTeamCaptain, Frame } from '../../services/databaseService';
import { useAuth } from '../../context/AuthContext';
import { Timestamp } from 'firebase/firestore';

interface ExtendedMatch extends Match {
  homeTeamName?: string;
  awayTeamName?: string;
  venueName?: string;
  homeScore?: number;
  awayScore?: number;
}

const MatchDetails: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [match, setMatch] = useState<ExtendedMatch | null>(null);
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHomeCaptain, setIsHomeCaptain] = useState(false);
  const [isAwayCaptain, setIsAwayCaptain] = useState(false);

  useEffect(() => {
    const fetchMatchDetails = async () => {
      try {
        if (!matchId) {
          throw new Error('No match ID provided');
        }

        const matchDoc = await getMatch(matchId);
        if (!matchDoc) {
          throw new Error('Match not found');
        }

        const [homeTeamDoc, awayTeamDoc, venueDoc] = await Promise.all([
          getTeam(matchDoc.homeTeamId),
          getTeam(matchDoc.awayTeamId),
          getVenue(matchDoc.venueId),
        ]);

        // Calculate scores using the correct 'frames' array and Frame type
        const homeScore = matchDoc.frames ? 
          matchDoc.frames.filter((f: Frame) => f.winnerPlayerId === matchDoc.homeTeamId).length : 0;
        const awayScore = matchDoc.frames ? 
          matchDoc.frames.filter((f: Frame) => f.winnerPlayerId === matchDoc.awayTeamId).length : 0;

        setMatch({
          ...matchDoc,
          homeTeamName: homeTeamDoc?.name,
          awayTeamName: awayTeamDoc?.name,
          venueName: venueDoc?.name,
          homeScore,
          awayScore
        });
        setHomeTeam(homeTeamDoc);
        setAwayTeam(awayTeamDoc);
        setVenue(venueDoc);

        // Check if current user is a team captain for either team
        if (user) {
          if (homeTeamDoc) {
            const isHomeTeamCaptain = await isUserTeamCaptain(user.uid, homeTeamDoc.id!, matchDoc.seasonId);
            setIsHomeCaptain(isHomeTeamCaptain);
          }
          
          if (awayTeamDoc) {
            const isAwayTeamCaptain = await isUserTeamCaptain(user.uid, awayTeamDoc.id!, matchDoc.seasonId);
            setIsAwayCaptain(isAwayTeamCaptain);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch match details');
      } finally {
        setLoading(false);
      }
    };

    fetchMatchDetails();
  }, [matchId, user]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !match || !homeTeam || !awayTeam || !venue) {
    return (
      <Box p={3}>
        <Alert severity="error">
          {error || 'Failed to load match details'}
        </Alert>
      </Box>
    );
  }

  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    return date.toLocaleString();
  };

  const handleScoreMatch = () => {
    if (matchId) {
      navigate(`/team/match/${matchId}/score`);
    }
  };

  const handleManageLineup = () => {
    if (matchId) {
      navigate(`/team/match/${matchId}/lineup`);
    }
  };

  return (
    <Box p={3}>
      <Card>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h4" gutterBottom>
                  Match Details
                </Typography>
                <Box>
                  {(isHomeCaptain || isAwayCaptain) && match?.status === 'scheduled' && (
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={handleManageLineup}
                      sx={{ mr: 1 }}
                    >
                      Set Lineup
                    </Button>
                  )}
                  {(isHomeCaptain || isAwayCaptain) && match?.status === 'in_progress' && (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleScoreMatch}
                    >
                      Score Match
                    </Button>
                  )}
                </Box>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                {homeTeam.name}
              </Typography>
              <Typography variant="h3">
                {match.homeScore ?? '-'}
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                {awayTeam.name}
              </Typography>
              <Typography variant="h3">
                {match.awayScore ?? '-'}
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Box mt={2}>
                <Chip
                  label={match.status}
                  color={
                    match.status === 'completed'
                      ? 'success'
                      : match.status === 'in_progress'
                      ? 'warning'
                      : 'default'
                  }
                  sx={{ mr: 1 }}
                />
                <Typography variant="body1" color="text.secondary">
                  {formatDate(match.scheduledDate)}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Venue
              </Typography>
              <Typography variant="body1">
                {venue.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {venue.address}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MatchDetails;
