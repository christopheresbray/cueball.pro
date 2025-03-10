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
  CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PendingIcon from '@mui/icons-material/Pending';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DateRangeIcon from '@mui/icons-material/DateRange';
import LocationOnIcon from '@mui/icons-material/LocationOn';

// Match status types
type MatchStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

// Match interface
interface Match {
  id: string;
  date: Date | Timestamp;
  formattedDate?: string;
  venue: string;
  venueName?: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
}

// Function to convert Firestore timestamp to Date and formatted string
const processTimestamp = (timestamp: any): { date: Date, formattedDate: string } => {
  let date: Date;
  
  // Check if it's a Firestore Timestamp
  if (timestamp && typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  } 
  // Check if it's already a Date object
  else if (timestamp instanceof Date) {
    date = timestamp;
  } 
  // Default to current date if invalid
  else {
    date = new Date();
    console.warn('Invalid date format in match data');
  }
  
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return { date, formattedDate };
};

const TeamMatches: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMatches = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // First, get the user's team ID(s)
        let teamIds: string[] = [];
        
        if (userRole === 'admin') {
          // Admins can see all matches
          const teamsSnapshot = await getDocs(collection(db, 'teams'));
          teamIds = teamsSnapshot.docs.map(doc => doc.id);
        } else {
          // Get team IDs where the user is a captain or member
          const userTeamsQuery = query(
            collection(db, 'team_players'),
            where('playerId', '==', user.uid)
          );
          const userTeamsSnapshot = await getDocs(userTeamsQuery);
          teamIds = userTeamsSnapshot.docs.map(doc => doc.data().teamId);
        }
        
        if (teamIds.length === 0) {
          setMatches([]);
          setLoading(false);
          return;
        }
        
        // Get matches where the user's team is home or away
        const matchesQuery = query(
          collection(db, 'matches'),
          where('homeTeamId', 'in', teamIds)
        );
        
        const awayMatchesQuery = query(
          collection(db, 'matches'),
          where('awayTeamId', 'in', teamIds)
        );
        
        const [homeMatchesSnapshot, awayMatchesSnapshot] = await Promise.all([
          getDocs(matchesQuery),
          getDocs(awayMatchesQuery)
        ]);
        
        // Combine and process matches
        const uniqueMatches = new Map<string, Match>();
        
        // Process home matches
        for (const docSnapshot of homeMatchesSnapshot.docs) {
          const matchData = docSnapshot.data() as Match;
          
          // Process the date properly
          if (matchData.date) {
            const processedDate = processTimestamp(matchData.date);
            matchData.date = processedDate.date;
            matchData.formattedDate = processedDate.formattedDate;
          }
          
          // Fetch venue name if we have the venue ID
          if (matchData.venue) {
            try {
              const venueDoc = await getDoc(doc(db, 'venues', matchData.venue));
              if (venueDoc.exists()) {
                matchData.venueName = venueDoc.data().name;
              }
            } catch (err) {
              console.error('Error fetching venue:', err);
            }
          }
          
          uniqueMatches.set(docSnapshot.id, {
            ...matchData,
            id: docSnapshot.id
          });
        }
        
        // Process away matches
        for (const docSnapshot of awayMatchesSnapshot.docs) {
          if (!uniqueMatches.has(docSnapshot.id)) {
            const matchData = docSnapshot.data() as Match;
            
            // Process the date properly
            if (matchData.date) {
              const processedDate = processTimestamp(matchData.date);
              matchData.date = processedDate.date;
              matchData.formattedDate = processedDate.formattedDate;
            }
            
            // Fetch venue name if we have the venue ID
            if (matchData.venue) {
              try {
                const venueDoc = await getDoc(doc(db, 'venues', matchData.venue));
                if (venueDoc.exists()) {
                  matchData.venueName = venueDoc.data().name;
                }
              } catch (err) {
                console.error('Error fetching venue:', err);
              }
            }
            
            uniqueMatches.set(docSnapshot.id, {
              ...matchData,
              id: docSnapshot.id
            });
          }
        }
        
        // Convert to array and sort by date (recent first)
        const sortedMatches = Array.from(uniqueMatches.values()).sort((a, b) => {
          // Sort by status first (scheduled > in_progress > completed) and then by date
          if (a.status === 'scheduled' && b.status !== 'scheduled') return -1;
          if (a.status === 'in_progress' && b.status === 'completed') return -1;
          if (a.status !== 'scheduled' && b.status === 'scheduled') return 1;
          if (a.status === 'completed' && b.status === 'in_progress') return 1;
          
          // Then sort by date
          const dateA = a.date instanceof Date ? a.date : new Date();
          const dateB = b.date instanceof Date ? b.date : new Date();
          return dateA > dateB ? -1 : 1;
        });
        
        setMatches(sortedMatches);
      } catch (err) {
        console.error('Error fetching matches:', err);
        setError('Failed to load matches. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMatches();
  }, [user, userRole]);

  const handleEditMatch = (matchId: string) => {
    navigate(`/team/match/${matchId}`);
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }
  
  if (matches.length === 0) {
    return (
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Your Matches
        </Typography>
        <Alert severity="info">
          No matches found. You are not currently assigned to any teams or there are no scheduled matches.
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Your Matches
      </Typography>
      
      <List>
        {matches.map((match, index) => (
          <React.Fragment key={match.id}>
            {index > 0 && <Divider component="li" />}
            <ListItem
              alignItems="flex-start"
              secondaryAction={
                <IconButton 
                  edge="end" 
                  aria-label="edit" 
                  onClick={() => handleEditMatch(match.id)}
                  disabled={match.status === 'cancelled'}
                >
                  <EditIcon />
                </IconButton>
              }
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 2 }}>
                    <Typography component="span" variant="subtitle1">
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
            </ListItem>
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
}

export default TeamMatches;