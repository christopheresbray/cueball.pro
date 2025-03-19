import { useState, useEffect, useCallback } from 'react';
import { getAuth, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

interface User {
  uid: string;
  email: string | null;
  name: string;
  role: string;
  isCaptain: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const auth = getAuth();
    const db = getFirestore();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch additional user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const userData = userDoc.data();

          // Check if user is a captain of any team
          const teamsQuery = query(
            collection(db, 'teams'),
            where('captainId', '==', firebaseUser.uid)
          );
          const teamsSnapshot = await getDocs(teamsQuery);
          const isCaptain = !teamsSnapshot.empty;

          console.log(`User ${firebaseUser.uid} captain status:`, isCaptain);
          console.log(`Teams where user is captain:`, teamsSnapshot.docs.map(doc => doc.data().name));

          const user: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: userData?.name || userData?.displayName || firebaseUser.displayName || 'Unknown',
            role: userData?.role || 'player',
            isCaptain: isCaptain,
          };

          setAuthState({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          console.error('Error fetching user data:', error);
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } else {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    const auth = getAuth();
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, []);

  return {
    ...authState,
    signOut,
  };
}; 