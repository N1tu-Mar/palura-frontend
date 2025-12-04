import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthFlow from './components/AuthFlow';
import CreateParentProfile from './components/CreateParentProfile';
import CreateChildProfile from './components/CreateChildProfile';
import HomeScreen from './screens/HomeScreen';
import { isParentProfileComplete } from './services/parentProfileService';
import { updateParentProfile } from './services/parentProfileService';

function AppContent() {
  const { session, parent, children, loading, signIn, refreshChildren, refreshParent } = useAuth();
  const [skippedParentProfile, setSkippedParentProfile] = useState(false);

  const handleAuthSuccess = async (sessionData, parentData) => {
    await signIn(sessionData, parentData);
    setSkippedParentProfile(false); // Reset on new sign in
  };

  const handleParentProfileCreated = async () => {
    await refreshParent();
    setSkippedParentProfile(false);
  };

  const handleChildCreated = async () => {
    await refreshChildren();
  };

  const handleSkipParentProfile = async () => {
    // Mark that user skipped parent profile setup
    setSkippedParentProfile(true);
    // Optionally save a flag to parent object
    if (parent) {
      await updateParentProfile(parent.email, { skippedProfileSetup: true });
      await refreshParent();
    }
  };

  const handleSkipChildProfile = () => {
    // Allow user to skip child profile creation and go to home
    // They can create a child profile later
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  // Not authenticated - show auth flow
  if (!session) {
    return (
      <View style={styles.authContainer}>
        <AuthFlow onAuthSuccess={handleAuthSuccess} />
      </View>
    );
  }

  // Authenticated but parent profile incomplete - show parent profile creation
  // Only show if they haven't skipped it
  if (!isParentProfileComplete(parent) && !skippedParentProfile && !parent?.skippedProfileSetup) {
    return (
      <View style={styles.parentProfileContainer}>
        <CreateParentProfile
          parentEmail={parent.email}
          onProfileCreated={handleParentProfileCreated}
          onSkip={handleSkipParentProfile}
        />
      </View>
    );
  }

  // Authenticated but no children - show child profile creation
  if (children.length === 0) {
    return (
      <View style={styles.childProfileContainer}>
        <CreateChildProfile
          parentEmail={parent.email}
          onChildCreated={handleChildCreated}
          onSkip={handleSkipChildProfile}
        />
      </View>
    );
  }

  // Authenticated with children - show home screen
  return <HomeScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  authContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  parentProfileContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  childProfileContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});
