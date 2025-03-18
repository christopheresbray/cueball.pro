// src/context/AuthContext.tsx
import React from 'react';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { Team } from '../services/databaseService';

interface AuthContextType {
  user: User | null;
  currentUser: User | null;
  userRole: string | null;
  isAdmin: boolean;
  loading: boolean;
  impersonatedTeam: Team | null;
  setImpersonatedTeam: (team: Team | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [impersonatedTeam, setImpersonatedTeam] = useState<Team | null>(null);

  // Reset impersonation when user changes or logs out
  useEffect(() => {
    if (!user) {
      setImpersonatedTeam(null);
    }
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setImpersonatedTeam(null); // Reset impersonation on auth state change
      
      if (currentUser) {
        try {
          // First check if the user is an admin (in any league's adminIds)
          const leaguesQuery = query(
            collection(db, 'leagues'),
            where('adminIds', 'array-contains', currentUser.uid)
          );
          
          const leaguesSnapshot = await getDocs(leaguesQuery);
          
          if (!leaguesSnapshot.empty) {
            // User is an admin of at least one league
            setUserRole('admin');
            setIsAdmin(true);
          } else {
            // Check if user is a captain of any team
            const teamsQuery = query(
              collection(db, 'teams'),
              where('captainId', '==', currentUser.uid)
            );
            
            const teamsSnapshot = await getDocs(teamsQuery);
            
            if (!teamsSnapshot.empty) {
              // User is a captain
              setUserRole('captain');
              setIsAdmin(false);
            } else {
              // Check if user is a player
              const userDocRef = doc(db, 'users', currentUser.uid);
              const userDoc = await getDoc(userDocRef);
              
              if (userDoc.exists()) {
                const role = userDoc.data().role;
                setUserRole(role);
                setIsAdmin(role === 'admin');
              } else {
                // Default to 'user' role
                setUserRole('user');
                setIsAdmin(false);
              }
            }
          }
        } catch (error) {
          console.error('Error determining user role:', error);
          setUserRole('user');
          setIsAdmin(false);
        }
      } else {
        setUserRole(null);
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email: string, password: string) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    return user;
  };

  const logout = async () => {
    setImpersonatedTeam(null); // Reset impersonation on logout
    return signOut(auth);
  };

  const value: AuthContextType = {
    user,
    currentUser: user,
    userRole,
    isAdmin,
    loading,
    impersonatedTeam,
    setImpersonatedTeam,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;