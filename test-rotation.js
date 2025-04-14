// Test script for rotation pattern
console.log('Testing rotation pattern:');

for (let round = 1; round <= 4; round++) {
  console.log(`\nRound ${round}:`);
  
  // Show matchups in a clear format
  let matchups = '  ';
  
  for (let position = 0; position < 4; position++) {
    // Home team position looking for away opponent
    const awayPosition = (position + (round - 1)) % 4;
    const awayLetter = String.fromCharCode(65 + awayPosition);
    
    // Away team position looking for home opponent
    const homePosition = (position - (round - 1) + 4) % 4;
    const homeNumber = homePosition + 1;
    
    matchups += `${position + 1}v${awayLetter}  `;
  }
  
  console.log(matchups);
} 