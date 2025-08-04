// src/utils/playerNameUtils.ts

/**
 * Formats a player name to minimize space usage by choosing the shorter of:
 * 1. First initial and surname (e.g., "J. Smith")
 * 2. First name and first letter of surname (e.g., "John S")
 */
export const getCompactPlayerName = (player: {
  name?: string;
  firstName?: string;
  lastName?: string;
}): string => {
  // If a full name is already set, parse it
  if (player.name && player.name.trim()) {
    const parts = player.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ');
      return getCompactNameFromParts(firstName, lastName);
    }
    return player.name; // Return as-is if single name
  }

  // Use firstName and lastName if available
  if (player.firstName && player.lastName) {
    return getCompactNameFromParts(player.firstName.trim(), player.lastName.trim());
  }

  // Fallback to whatever we have
  if (player.firstName) return player.firstName;
  if (player.lastName) return player.lastName;
  
  return 'Unknown Player';
};

/**
 * Helper function to determine the shorter format between:
 * 1. "F. LastName" (first initial + surname)
 * 2. "FirstName L" (first name + last initial)
 */
const getCompactNameFromParts = (firstName: string, lastName: string): string => {
  // Format 1: First initial + surname (e.g., "J. Smith")
  const format1 = `${firstName.charAt(0)}. ${lastName}`;
  
  // Format 2: First name + last initial (e.g., "John S")
  const format2 = `${firstName} ${lastName.charAt(0)}`;
  
  // Return the shorter format
  return format1.length <= format2.length ? format1 : format2;
};

/**
 * For compatibility with existing code that expects a player ID lookup
 */
export const getCompactPlayerNameById = (
  playerId: string,
  players: Array<{ id?: string; name?: string; firstName?: string; lastName?: string }>
): string => {
  if (!playerId || playerId === 'vacant') return 'Sit Out';
  
  const player = players.find(p => p.id === playerId);
  
  if (player) {
    return getCompactPlayerName(player);
  }
  
  return playerId; // Fallback to ID if player not found
};