import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, CircularProgress, Alert } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { Team, Player, Season, getTeams, getPlayersForTeam, getCurrentSeason } from '../../services/databaseService';

const TeamRoster: React.FC = () => {
  const { user } = useAuth();

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const fetchInitialData = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const season = await getCurrentSeason();
      if (!season) {
        throw new Error('No active season found.');
      }
      setCurrentSeason(season);

      const allTeams = await getTeams(season.id!);
      const captainTeams = allTeams.filter(team => team.captainId === user.uid);
      setTeams(captainTeams);

      if (captainTeams.length > 0) {
        const team = captainTeams[0];
        setSelectedTeam(team);
        const teamPlayers = await getPlayersForTeam(team.id!, season.id!);
        setPlayers(teamPlayers);
      } else {
        setSelectedTeam(null);
        setPlayers([]);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading data.');
      setCurrentSeason(null);
      setSelectedTeam(null);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [user]);

  return (
    <Container>
      <Box my={4}>
        <Typography variant="h4">Team Roster</Typography>
  
        {loading && <CircularProgress sx={{ mt: 3 }} />}
  
        {!loading && error && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {error}
          </Alert>
        )}
  
        {!loading && !error && currentSeason && (
          <>
            <Typography variant="h6" sx={{ mt: 2 }}>
              Season: {currentSeason.name}
            </Typography>
  
            {selectedTeam ? (
              <>
                <Typography variant="h5" sx={{ mt: 2 }}>
                  {selectedTeam.name}
                </Typography>
                <Paper elevation={2} sx={{ mt: 2, p: 2 }}>
                  {players.length > 0 ? (
                    players.map(player => (
                    <Typography key={player.id}>{player.firstName} {player.lastName}</Typography>
                    ))
                  ) : (
                    <Typography>No players found in your team roster.</Typography>
                  )}
                </Paper>
              </>
            ) : (
              <Alert severity="warning" sx={{ mt: 3 }}>
                You are not captain of any team this season.
              </Alert>
            )}
          </>
        )}
  
        {!loading && !error && !currentSeason && (
          <Alert severity="info" sx={{ mt: 3 }}>
            No active season found.
          </Alert>
        )}
      </Box>
    </Container>
  );  
}
export default TeamRoster;
