const fs = require('fs');
const path = require('path');

// Function to read a file synchronously and return its content
function readFileSync(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
}

// Function to write a file synchronously
function writeFileSync(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    return false;
  }
}

// Path to the MatchScoring.tsx file
const filePath = path.join(__dirname, 'src', 'pages', 'team', 'MatchScoring.tsx');

// Read the file
const content = readFileSync(filePath);
if (!content) {
  console.error('Failed to read the file content');
  process.exit(1);
}

// Create a backup of the file
const backupPath = path.join(__dirname, 'src', 'pages', 'team', 'MatchScoring.tsx.bak2');
if (!writeFileSync(backupPath, content)) {
  console.error('Failed to create a backup file');
  process.exit(1);
}

// 1. Replace the "Match is in progress" box with null
let modifiedContent = content.replace(
  /\) : \(\s*match\?\.status === 'completed' && \(/g,
  ') : null /*'
);

modifiedContent = modifiedContent.replace(
  /\s*\)\s*\)\s*\}/g,
  '} */'
);

// 2. Remove the Instructions Panel
const instructionsPanelStart = '          {/* Instructions Panel */}';
const restOfUIStart = '          {/* Rest of the UI components */}';

const startPos = modifiedContent.indexOf(instructionsPanelStart);
const endPos = modifiedContent.indexOf(restOfUIStart);

if (startPos !== -1 && endPos !== -1) {
  modifiedContent = modifiedContent.slice(0, startPos) + modifiedContent.slice(endPos);
  console.log('Successfully removed Instructions Panel');
} else {
  console.error('Could not find Instructions Panel section');
}

// Write the modified content back to the file
if (writeFileSync(filePath, modifiedContent)) {
  console.log('Successfully updated the MatchScoring.tsx file');
} else {
  console.error('Failed to update the file');
}

// Function to check if a file exists
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    console.error(`Error checking if file exists ${filePath}:`, error);
    return false;
  }
}

// Log file verification
if (fileExists(filePath)) {
  console.log(`File exists: ${filePath}`);
  console.log(`File size: ${fs.statSync(filePath).size} bytes`);
} else {
  console.error(`File does not exist: ${filePath}`);
} 