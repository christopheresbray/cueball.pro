// src/components/team/MatchDetails.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Match, Team, Venue, getMatch, getTeam, getVenue } from '../../services/databaseService';
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
  const [match, setMatch] = useState<ExtendedMatch | null>(null);
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        // Calculate scores from frame results if available
        const homeScore = matchDoc.frameResults ? 
          Object.values(matchDoc.frameResults).filter(f => f.winnerId === matchDoc.homeTeamId).length : 0;
        const awayScore = matchDoc.frameResults ? 
          Object.values(matchDoc.frameResults).filter(f => f.winnerId === matchDoc.awayTeamId).length : 0;

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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch match details');
      } finally {
        setLoading(false);
      }
    };

    fetchMatchDetails();
  }, [matchId]);

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

  return (
    <Box p={3}>
      <Card>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h4" gutterBottom>
                Match Details
              </Typography>
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
