import React, { createContext, useState, useEffect, useContext } from 'react';
import { getSession, getParentFromSession } from '../services/authService';
import { getChildren } from '../services/childProfileService';
import { storageService } from '../services/storageService';

const AuthContext = createContext(null);

const SESSION_STORAGE_KEY = 'current_session_token';

export function AuthProvider({ children: childrenProp }) {
  const [session, setSession] = useState(null);
  const [parent, setParent] = useState(null);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load session on mount
  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const token = await storageService.getItem(SESSION_STORAGE_KEY);
      
      if (token) {
        const currentSession = await getSession(token);
        
        if (currentSession) {
          const parentData = await getParentFromSession(token);
          const childrenData = await getChildren(currentSession.parentEmail);
          
          setSession(currentSession);
          setParent(parentData);
          setChildren(childrenData);
        } else {
          // Session expired or invalid, clear it
          await storageService.removeItem(SESSION_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (sessionData, parentData) => {
    setSession(sessionData);
    setParent(parentData);
    await storageService.setItem(SESSION_STORAGE_KEY, sessionData.accessToken);
    
    // Load children
    const childrenData = await getChildren(sessionData.parentEmail);
    setChildren(childrenData);
  };

  const signOut = async () => {
    setSession(null);
    setParent(null);
    setChildren([]);
    await storageService.removeItem(SESSION_STORAGE_KEY);
  };

  const refreshChildren = async () => {
    if (session) {
      const childrenData = await getChildren(session.parentEmail);
      setChildren(childrenData);
    }
  };

  const refreshParent = async () => {
    if (session) {
      const parentData = await getParentFromSession(session.accessToken);
      setParent(parentData);
    }
  };

  const value = {
    session,
    parent,
    children,
    loading,
    signIn,
    signOut,
    refreshChildren,
    refreshParent,
    isAuthenticated: !!session,
  };

  return <AuthContext.Provider value={value}>{childrenProp}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

