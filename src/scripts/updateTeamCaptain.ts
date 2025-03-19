// src/scripts/updateTeamCaptain.ts
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config'; // Import the pre-configured db directly

// Replace with your actual team ID and user ID
const TEAM_ID = '43VLdjVwfdeRk0zhJ4Kq'; // BSSC Raiders ID
const USER_ID = 'EC41Jnd7uSe0vbA13LgeyGtqSHQ2'; // Current user ID

export const updateTeamCaptain = async (): Promise<boolean> => {
  try {
    // Update the team document with the new captain ID
    const teamRef = doc(db, 'teams', TEAM_ID);
    await updateDoc(teamRef, { captainId: USER_ID });
    
    console.log(`Team captain for ${TEAM_ID} updated to ${USER_ID}`);
    console.log('Success! The user should now be recognized as the team captain.');
    
    return true;
  } catch (error) {
    console.error('Error updating team captain:', error);
    return false;
  }
};

// Run the function if this file is executed directly
if (typeof window !== 'undefined') {
  updateTeamCaptain();
} 