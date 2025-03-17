import { updateTeamCaptain } from '../services/databaseService';

const CHRIS_BRAY_ID = 'HOfEwnxEnVVODDtkgmJapDCtarV2';
const BSSC_RAIDERS_ID = 'TWhleqWJw08tiURTmDyK';

export const updateBSSCRaidersCaptain = async () => {
  try {
    await updateTeamCaptain(BSSC_RAIDERS_ID, CHRIS_BRAY_ID);
    console.log('Successfully set Chris Bray as captain of BSSC Raiders');
  } catch (error) {
    console.error('Failed to update BSSC Raiders captain:', error);
  }
};

// Execute the update
updateBSSCRaidersCaptain(); 