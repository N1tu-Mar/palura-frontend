import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { updateParentProfile } from '../services/parentProfileService';

export default function CreateParentProfile({ parentEmail, onProfileCreated, onSkip }) {
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    setLoading(true);

    try {
      const result = await updateParentProfile(parentEmail, {
        name,
      });

      if (result.success) {
        onProfileCreated(result.parent);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Create parent profile error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView 
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.container}>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>
          Let's set up your parent account
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Your Name *</Text>
          <TextInput
            style={[styles.input, error && styles.inputError]}
            value={name}
            onChangeText={(text) => {
              setName(text);
              setError(null);
            }}
            placeholder="Enter your name"
            placeholderTextColor="#94a3b8"
            maxLength={50}
            editable={!loading}
            autoCapitalize="words"
          />
          <Text style={styles.helperText}>
            {name.length}/50 characters
          </Text>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            (loading || !name.trim()) && styles.buttonDisabled,
            pressed && !loading && styles.buttonPressed,
          ]}
          onPress={handleSubmit}
          disabled={loading || !name.trim()}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </Pressable>

        {onSkip && (
          <Pressable
            style={({ pressed }) => [styles.skipButton, pressed && styles.skipButtonPressed]}
            onPress={onSkip}
            disabled={loading}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
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
  helperText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
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
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonPressed: {
    opacity: 0.6,
  },
  skipButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
});

