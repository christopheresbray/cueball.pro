const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'team', 'MatchScoring.tsx');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Define the pattern to remove (the Instructions Panel)
const startMarker = '          {/* Instructions Panel */}';
const endMarker = '          {/* Rest of the UI components */}';
const patternToRemove = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`, 'g');

// Replace the pattern with just the end marker
content = content.replace(patternToRemove, endMarker);

// Also remove the "Match is in progress" message in the Box
const inProgressMsgStart = `<Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>`;
const inProgressMsgEnd = `</Box>`;
const inProgressBlock = `              ${inProgressMsgStart}
                <Typography variant="body2" color="text.secondary" align="center">
                  {match?.status === 'in_progress' ? 
                    'Match is in progress. Lineups are locked and scoring is enabled.' : 
                    'Match is completed. All scores have been recorded.'}
                </Typography>
              ${inProgressMsgEnd}`;

const completedOnlyBlock = `              match?.status === 'completed' && (
                ${inProgressMsgStart}
                  <Typography variant="body2" color="text.secondary" align="center">
                    Match is completed. All scores have been recorded.
                  </Typography>
                ${inProgressMsgEnd}
              )`;

content = content.replace(inProgressBlock, completedOnlyBlock);

// Write the updated content back to the file
fs.writeFileSync(filePath, content);

console.log('Successfully removed instructions panel from MatchScoring.tsx'); 