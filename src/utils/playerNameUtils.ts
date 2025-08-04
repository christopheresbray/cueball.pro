// src/utils/playerNameUtils.ts

interface Player {
  name?: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Returns the shorter of two space-efficient name formats:
 * 1. "First Initial. Last Name" (e.g., "J. Smith")
 * 2. "First Name Last Initial" (e.g., "John S.")
 * 
 * This minimizes display space while maintaining readability.
 */
export const getPlayerDisplayName = (player: Player): string => {
  // If we have a full name, use it
  if (player.name) {
    const name = player.name.trim();
    if (name.length <= 12) return name; // Short names don't need truncation
    
    // For longer names, try both formats and pick the shorter one
    const parts = name.split(' ');
    if (parts.length >= 2) {
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ');
      
      const format1 = `${firstName.charAt(0)}. ${lastName}`; // "J. Smith"
      const format2 = `${firstName} ${lastName.charAt(0)}.`; // "John S."
      
      return format1.length <= format2.length ? format1 : format2;
    }
    
    return name; // Fallback for single-word names
  }
  
  // If we have separate firstName and lastName
  if (player.firstName && player.lastName) {
    const firstName = player.firstName.trim();
    const lastName = player.lastName.trim();
    
    const format1 = `${firstName.charAt(0)}. ${lastName}`; // "J. Smith"
    const format2 = `${firstName} ${lastName.charAt(0)}.`; // "John S."
    
    return format1.length <= format2.length ? format1 : format2;
  }
  
  // Fallbacks for partial data
  if (player.firstName) return player.firstName;
  if (player.lastName) return player.lastName;
  
  return 'Unknown Player';
};

/**
 * Legacy function for backward compatibility
 * @deprecated Use getPlayerDisplayName instead
 */
export const getPlayerName = (player: Player): string => {
  return getPlayerDisplayName(player);
}; 