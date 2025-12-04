import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import EmailSignIn from './EmailSignIn';
import OTPVerification from './OTPVerification';

const AUTH_STEPS = {
  EMAIL: 'email',
  OTP: 'otp',
};

export default function AuthFlow({ onAuthSuccess }) {
  const [step, setStep] = useState(AUTH_STEPS.EMAIL);
  const [email, setEmail] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [devOTP, setDevOTP] = useState(null);

  const handleOTPSent = (data) => {
    setEmail(data.email);
    setExpiresAt(data.expiresAt);
    if (data.otp) {
      setDevOTP(data.otp);
    }
    setStep(AUTH_STEPS.OTP);
  };

  const handleOTPBack = () => {
    setStep(AUTH_STEPS.EMAIL);
    setEmail(null);
    setExpiresAt(null);
    setDevOTP(null);
  };

  const handleOTPSuccess = (session, parent) => {
    // Pass session and parent to parent component
    onAuthSuccess(session, parent);
  };

  return (
    <ScrollView 
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.container}>
        {step === AUTH_STEPS.EMAIL && (
          <EmailSignIn onOTPSent={handleOTPSent} />
        )}
        
        {step === AUTH_STEPS.OTP && (
          <OTPVerification
            email={email}
            expiresAt={expiresAt}
            otp={devOTP}
            onSuccess={handleOTPSuccess}
            onBack={handleOTPBack}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    alignItems: 'center',
  },
});

