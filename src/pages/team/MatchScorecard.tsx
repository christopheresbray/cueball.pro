// src/pages/team/MatchScorecard.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Typography, Paper, Button, Grid, Select, MenuItem, FormControl, InputLabel, Alert } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { getMatch, getPlayers, updateMatch, addPlayerToTeam } from '../../services/databaseService';

const MatchScorecard: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const { user } = useAuth();
  const [match, setMatch] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [lineup, setLineup] = useState<string[]>(['', '', '', '']);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!matchId) return;
      const matchData = await getMatch(matchId);
      if (matchData) {
        setMatch(matchData);
        const teamPlayers = await getPlayers(matchData.homeTeamId);
        setPlayers(teamPlayers);
        if (matchData.homeLineup) setLineup(matchData.homeLineup);
      } else {
        setError('Match not found.');
      }
    };
  
    fetchData();
  }, [matchId]);

  const handleLineupChange = (index: number, playerId: string) => {
    const updatedLineup = [...lineup];
    updatedLineup[index] = playerId;
    setLineup(updatedLineup);
  };

  const handleAddNewPlayer = async () => {
    const playerName = prompt("Enter new player's name:");
    if (!playerName || !match) return;

    const newPlayer = await addPlayerToTeam(match.homeTeamId, playerName);
    setPlayers([...players, newPlayer]);
  };

  const handleStartMatch = async () => {
    if (lineup.some(id => !id)) {
      setError('Please select all four players before starting the match.');
      return;
    }

    await updateMatch(matchId!, { homeLineup: lineup, status: 'in_progress' });
    setMatch({ ...match, status: 'in_progress' });
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>Team Lineup Selection</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={2}>
          {lineup.map((playerId, idx) => (
            <Grid item xs={12} sm={6} key={idx}>
              <FormControl fullWidth>
                <InputLabel>{`Player ${idx + 1}`}</InputLabel>
                <Select
                  value={playerId}
                  label={`Player ${idx + 1}`}
                  onChange={(e) => handleLineupChange(idx, e.target.value as string)}
                  disabled={match?.status !== 'scheduled'}
                >
                  {players.map(player => (
                    <MenuItem key={player.id} value={player.id}>{player.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          ))}
        </Grid>

        {match?.status === 'scheduled' && (
          <>
            <Button variant="outlined" sx={{ mt: 2, mr: 2 }} onClick={handleAddNewPlayer}>
              Add New Player
            </Button>
            <Button variant="contained" sx={{ mt: 2 }} onClick={handleStartMatch}>
              Start Match
            </Button>
          </>
        )}

        {match?.status !== 'scheduled' && (
          <Alert severity="info" sx={{ mt: 2 }}>Match has started. Player selection locked.</Alert>
        )}
      </Paper>
    </Container>
  );
};

export default MatchScorecard;
