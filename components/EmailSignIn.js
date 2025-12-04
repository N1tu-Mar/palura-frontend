import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { validateEmail } from '../utils/emailValidation';
import { startSignup } from '../services/authService';
import { trackEvent } from '../services/analyticsService';

export default function EmailSignIn({ onOTPSent }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    
    // Validate email
    const validation = validateEmail(email);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setLoading(true);
    
    try {
      const result = await startSignup(email.trim());
      
      console.log('[EmailSignIn] Signup result:', { success: result.success, hasOtp: !!result.otp });
      
      if (result.success) {
        // Track success
        await trackEvent('auth_signup_started', { email: email.trim().toLowerCase() });
        
        // Call parent callback with email and expiry
        const otpData = {
          email: email.trim().toLowerCase(),
          expiresAt: result.expiresAt,
        };
        
        // In development, pass OTP for testing
        if (result.otp) {
          otpData.otp = result.otp;
          console.log('[EmailSignIn] Passing OTP to OTPVerification:', result.otp);
        }
        
        onOTPSent(otpData);
      } else {
        console.error('[EmailSignIn] Signup failed:', result.error);
        setError(result.error);
      }
    } catch (err) {
      console.error('[EmailSignIn] Signup error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Your Account</Text>
      <Text style={styles.subtitle}>
        Enter your email address to receive a one-time code
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, error && styles.inputError]}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setError(null); // Clear error when user types
          }}
          placeholder="your.email@example.com"
          placeholderTextColor="#94a3b8"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          (loading || !email.trim()) && styles.buttonDisabled,
          pressed && !loading && styles.buttonPressed,
        ]}
        onPress={handleSubmit}
        disabled={loading || !email.trim()}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Continue</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1e293b',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    marginTop: 8,
  },
  button: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonDisabled: {
    backgroundColor: '#cbd5e1',
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

