// src/pages/team/MatchScoringV2Page.tsx

import React from 'react';
import { useParams } from 'react-router-dom';
import MatchScoringPageV2 from '../../components/match-scoring-v2/MatchScoringPageV2';

/**
 * Wrapper page component for V2 match scoring
 * Handles URL parameters and passes them to the main component
 */
const MatchScoringV2Page: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();

  if (!matchId) {
    return (
      <div>
        <h2>Error: Match ID not provided</h2>
        <p>Please navigate to this page with a valid match ID.</p>
      </div>
    );
  }

  return <MatchScoringPageV2 matchId={matchId} />;
};

export default MatchScoringV2Page; 