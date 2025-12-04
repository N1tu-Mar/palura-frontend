import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { completeSignup } from '../services/authService';
import { getRemainingAttempts } from '../services/otpService';
import { trackEvent } from '../services/analyticsService';

export default function OTPVerification({ email, expiresAt, otp: devOTP, onSuccess, onBack }) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(5);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const inputRefs = useRef([]);

  // Calculate time remaining
  useEffect(() => {
    if (!expiresAt) return;

    const updateTimeRemaining = () => {
      const now = Date.now();
      const remaining = Math.max(0, expiresAt - now);
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // Load remaining attempts
  useEffect(() => {
    const loadAttempts = async () => {
      const attempts = await getRemainingAttempts(email);
      setRemainingAttempts(attempts);
    };
    loadAttempts();
  }, [email]);

  // Auto-fill OTP in development
  useEffect(() => {
    if (devOTP && __DEV__) {
      const digits = devOTP.split('');
      setOtp(digits);
    }
  }, [devOTP]);

  const handleOTPChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newOTP = [...otp];
    newOTP[index] = value;
    setOtp(newOTP);
    setError(null);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index, key) => {
    // Handle backspace
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (text) => {
    // Extract 6 digits from pasted text
    const digits = text.replace(/\D/g, '').slice(0, 6).split('');
    if (digits.length === 6) {
      const newOTP = [...otp];
      digits.forEach((digit, i) => {
        newOTP[i] = digit;
      });
      setOtp(newOTP);
      setError(null);
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async () => {
    const otpString = otp.join('');
    
    if (otpString.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await completeSignup(email, otpString);

      if (result.success) {
        // Track success
        await trackEvent('auth_signup_success', { email });
        
        // Call parent callback with session
        onSuccess(result.session, result.parent);
      } else {
        setError(result.error);
        
        // Update remaining attempts
        const attempts = await getRemainingAttempts(email);
        setRemainingAttempts(attempts);
      }
    } catch (err) {
      console.error('OTP verification error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isExpired = timeRemaining === '0:00';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter Verification Code</Text>
      <Text style={styles.subtitle}>
        We sent a 6-digit code to{'\n'}
        <Text style={styles.email}>{email}</Text>
      </Text>

      {devOTP && __DEV__ && (
        <View style={styles.devBanner}>
          <Text style={styles.devText}>Dev Mode: OTP is {devOTP}</Text>
        </View>
      )}

      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            style={[styles.otpInput, error && styles.otpInputError]}
            value={digit}
            onChangeText={(value) => handleOTPChange(index, value)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
            onTextInput={(e) => {
              // Handle paste
              if (e.nativeEvent.text.length > 1) {
                handlePaste(e.nativeEvent.text);
              }
            }}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            editable={!loading && !isExpired}
          />
        ))}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {timeRemaining && (
        <Text style={[styles.timer, isExpired && styles.timerExpired]}>
          {isExpired ? 'Code expired' : `Expires in ${timeRemaining}`}
        </Text>
      )}

      {remainingAttempts < 5 && (
        <Text style={styles.attemptsText}>
          {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining
        </Text>
      )}

      <Pressable
        style={({ pressed }) => [
          styles.button,
          (loading || isExpired || otp.join('').length !== 6) && styles.buttonDisabled,
          pressed && !loading && styles.buttonPressed,
        ]}
        onPress={handleSubmit}
        disabled={loading || isExpired || otp.join('').length !== 6}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Verify</Text>
        )}
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        onPress={onBack}
        disabled={loading}
      >
        <Text style={styles.backButtonText}>← Back to email</Text>
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
  email: {
    fontWeight: '600',
    color: '#334155',
  },
  devBanner: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fbbf24',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  devText: {
    fontSize: 14,
    color: '#92400e',
    textAlign: 'center',
    fontWeight: '600',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  otpInput: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: '#1e293b',
  },
  otpInputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    marginBottom: 8,
    textAlign: 'center',
  },
  timer: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 8,
  },
  timerExpired: {
    color: '#ef4444',
    fontWeight: '600',
  },
  attemptsText: {
    fontSize: 14,
    color: '#f59e0b',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
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
  backButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  backButtonPressed: {
    opacity: 0.6,
  },
  backButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
});

