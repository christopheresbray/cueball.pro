import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Button, Menu, MenuItem, Typography } from '@mui/material';
import { SportsEsports as GameIcon } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { Match, Team, getMatches, getTeams, getCurrentSeason } from '../../services/databaseService';
import { useState, useEffect } from 'react';

interface LiveMatchBannerProps {
  currentMatchId?: string;
}

const LiveMatchBanner: React.FC<LiveMatchBannerProps> = ({ currentMatchId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeMatches, setActiveMatches] = useState<Match[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [teams, setTeams] = useState<Record<string, { name: string }>>({});
  const [userTeams, setUserTeams] = useState<Team[]>([]);

  // Don't show the banner on scoring pages
  const isOnScoringPage = location.pathname.includes('/team/match/') && !location.pathname.endsWith('/lineup');

  useEffect(() => {
    const fetchActiveMatches = async () => {
      if (!user) {
        setDebugInfo('No user logged in');
        return;
      }

      try {
        console.log('Fetching active matches for user:', user.uid);
        
        // Get current season first
        const currentSeason = await getCurrentSeason();
        if (!currentSeason?.id) {
          setDebugInfo('No current season found');
          return;
        }
        console.log('Current season:', currentSeason.id);

        // Get all teams for the current season
        const allTeams = await getTeams(currentSeason.id);
        console.log('All teams:', allTeams.map(team => ({
          id: team.id,
          name: team.name,
          captainUserId: team.captainUserId
        })));

        // Create a map of team IDs to team names for easy lookup
        const teamsMap = allTeams.reduce((acc, team) => {
          if (team.id) {
            acc[team.id] = { name: team.name };
          }
          return acc;
        }, {} as Record<string, { name: string }>);
        setTeams(teamsMap);

        // Find teams where user is captain
        const userTeamsList = allTeams.filter(team => team.captainUserId === user.uid);
        console.log('User teams:', userTeamsList.map(team => ({
          id: team.id,
          name: team.name,
          captainUserId: team.captainUserId
        })));
        setUserTeams(userTeamsList);

        if (userTeamsList.length === 0) {
          setDebugInfo('User is not a captain of any team');
          return;
        }

        // Get all matches for the current season
        const matches = await getMatches(currentSeason.id);
        console.log('All matches:', matches.length);
        
        // Filter for matches that are in progress and involve the user's teams
        const userMatches = matches.filter(match => {
          const isInProgress = match.status === 'in_progress';
          const involvesUserTeam = userTeamsList.some(team => 
            team.id === match.homeTeamId || team.id === match.awayTeamId
          );
          
          if (isInProgress && involvesUserTeam) {
            const userTeam = userTeamsList.find(team => 
              team.id === match.homeTeamId || team.id === match.awayTeamId
            );
            const isHomeTeam = userTeam?.id === match.homeTeamId;
            const opponentTeamId = isHomeTeam ? match.awayTeamId : match.homeTeamId;
            
            console.log('Found active match:', {
              matchId: match.id,
              status: match.status,
              userTeam: {
                id: userTeam?.id,
                name: userTeam?.name,
                isHomeTeam
              },
              opponentTeam: {
                id: opponentTeamId,
                name: teamsMap[opponentTeamId]?.name
              }
            });
          }
          
          return isInProgress && involvesUserTeam;
        });

        console.log('Active matches for user:', userMatches.map(match => {
          const userTeam = userTeamsList.find(team => 
            team.id === match.homeTeamId || team.id === match.awayTeamId
          );
          const isHomeTeam = userTeam?.id === match.homeTeamId;
          const opponentTeamId = isHomeTeam ? match.awayTeamId : match.homeTeamId;
          
          return {
            id: match.id,
            userTeam: {
              id: userTeam?.id,
              name: userTeam?.name,
              isHomeTeam
            },
            opponentTeam: {
              id: opponentTeamId,
              name: teamsMap[opponentTeamId]?.name
            },
            status: match.status
          };
        }));
        
        setActiveMatches(userMatches);
        setDebugInfo(`Found ${userMatches.length} active matches`);
      } catch (error) {
        console.error('Error fetching active matches:', error);
        setDebugInfo(`Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    fetchActiveMatches();
  }, [user]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMatchSelect = (matchId: string) => {
    // Navigate directly to the scoring page
    navigate(`/team/match/${matchId}/score`);
    handleClose();
  };

  // Don't show the banner if there are no active matches or if we're on a scoring page
  if (activeMatches.length === 0 || isOnScoringPage) {
    return null;
  }

  // If there's only one active match and we're not on the match page, show a simple button
  if (activeMatches.length === 1 && activeMatches[0].id !== currentMatchId) {
    const match = activeMatches[0];
    const userTeam = userTeams.find(team => 
      team.id === match.homeTeamId || team.id === match.awayTeamId
    );
    const isHomeTeam = userTeam?.id === match.homeTeamId;
    const opponentTeamId = isHomeTeam ? match.awayTeamId : match.homeTeamId;
    
    return (
      <Box 
        sx={{ 
          bgcolor: 'primary.main', 
          color: 'white', 
          py: 1, 
          px: 2, 
          display: 'flex', 
          justifyContent: 'center',
          alignItems: 'center',
          gap: 1,
          position: 'fixed',
          top: '64px', // Position below the navbar
          left: 0,
          right: 0,
          zIndex: 1100, // Below navbar's z-index
          boxShadow: 1
        }}
      >
        <GameIcon sx={{ color: 'secondary.main' }} />
        <Button
          variant="contained"
          color="secondary"
          onClick={() => handleMatchSelect(match.id!)}
          sx={{ 
            textTransform: 'none',
            fontWeight: 'bold',
            px: 3,
            '&:hover': {
              bgcolor: 'secondary.dark'
            }
          }}
        >
          Return to Live Match vs {teams[opponentTeamId]?.name || 'Unknown Team'}
        </Button>
      </Box>
    );
  }

  // If there are multiple matches or we're on a match page, show the menu
  return (
    <Box 
      sx={{ 
        bgcolor: 'primary.main', 
        color: 'white', 
        py: 1, 
        px: 2, 
        display: 'flex', 
        justifyContent: 'center',
        alignItems: 'center',
        gap: 1,
        position: 'fixed',
        top: '64px', // Position below the navbar
        left: 0,
        right: 0,
        zIndex: 1100, // Below navbar's z-index
        boxShadow: 1
      }}
    >
      <GameIcon sx={{ color: 'secondary.main' }} />
      <Button
        variant="contained"
        color="secondary"
        onClick={handleClick}
        sx={{ 
          textTransform: 'none',
          fontWeight: 'bold',
          px: 3,
          '&:hover': {
            bgcolor: 'secondary.dark'
          }
        }}
      >
        Return to Live Match
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 200,
          }
        }}
      >
        {activeMatches.map((match) => {
          const userTeam = userTeams.find(team => 
            team.id === match.homeTeamId || team.id === match.awayTeamId
          );
          const isHomeTeam = userTeam?.id === match.homeTeamId;
          const opponentTeamId = isHomeTeam ? match.awayTeamId : match.homeTeamId;
          
          return (
            <MenuItem 
              key={match.id} 
              onClick={() => handleMatchSelect(match.id!)}
              disabled={match.id === currentMatchId}
            >
              vs {teams[opponentTeamId]?.name || 'Unknown Team'}
            </MenuItem>
          );
        })}
      </Menu>
    </Box>
  );
};

export default LiveMatchBanner; 