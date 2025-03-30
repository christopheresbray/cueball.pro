const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'team', 'MatchScoring.tsx');

// Read the file
fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }

  // Find the instructions panel section to remove
  const instructionsPanelStart = '          {/* Instructions Panel */}';
  const restOfUIStart = '          {/* Rest of the UI components */}';
  
  // Find the positions in the file
  const startPos = data.indexOf(instructionsPanelStart);
  const endPos = data.indexOf(restOfUIStart);
  
  if (startPos === -1 || endPos === -1) {
    console.error('Could not find Instructions Panel section');
    return;
  }

  // Create the updated content by removing the section
  const updatedContent = data.slice(0, startPos) + data.slice(endPos);
  
  // Write the file back
  fs.writeFile(filePath, updatedContent, 'utf8', (err) => {
    if (err) {
      console.error('Error writing file:', err);
      return;
    }
    console.log('Successfully removed Instructions Panel section');
  });
}); 