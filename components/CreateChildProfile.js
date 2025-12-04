import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { createChild, canCreateChild } from '../services/childProfileService';

// Common language options (simplified for MVP)
const LANGUAGE_OPTIONS = [
  'English (US)',
  'English (UK)',
  'Spanish',
  'French',
  'German',
  'Mandarin',
  'Other',
];

export default function CreateChildProfile({ parentEmail, onChildCreated, onSkip }) {
  const [nickname, setNickname] = useState('');
  const [dob, setDob] = useState('');
  const [languageProfile, setLanguageProfile] = useState('');
  const [customLanguage, setCustomLanguage] = useState('');
  const [showCustomLanguage, setShowCustomLanguage] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [canCreate, setCanCreate] = useState(true);

  // Check if parent can create more children
  useEffect(() => {
    const checkCanCreate = async () => {
      const result = await canCreateChild(parentEmail);
      setCanCreate(result);
    };
    checkCanCreate();
  }, [parentEmail]);

  // Calculate max date (14 years ago) and min date (2 years ago)
  const today = new Date();
  const maxDate = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate());
  const minDate = new Date(today.getFullYear() - 14, today.getMonth(), today.getDate());

  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleLanguageChange = (language) => {
    if (language === 'Other') {
      setShowCustomLanguage(true);
      setLanguageProfile('');
    } else {
      setShowCustomLanguage(false);
      setLanguageProfile(language);
      setCustomLanguage('');
    }
  };

  const handleSubmit = async () => {
    setError(null);

    // Use custom language if provided
    const finalLanguage = showCustomLanguage && customLanguage.trim()
      ? customLanguage.trim()
      : languageProfile;

    setLoading(true);

    try {
      const result = await createChild(parentEmail, {
        nickname,
        dob,
        languageProfile: finalLanguage,
      });

      if (result.success) {
        onChildCreated(result.child);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Create child error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!canCreate) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Maximum Children Reached</Text>
        <Text style={styles.subtitle}>
          You have reached the maximum of 5 children per account.
        </Text>
        {onSkip && (
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={onSkip}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <ScrollView 
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.container}>
        <Text style={styles.title}>Create Child Profile</Text>
        <Text style={styles.subtitle}>
          Add your child's information to get started
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Nickname *</Text>
          <TextInput
            style={[styles.input, error && styles.inputError]}
            value={nickname}
            onChangeText={(text) => {
              setNickname(text);
              setError(null);
            }}
            placeholder="Enter nickname (2-20 characters)"
            placeholderTextColor="#94a3b8"
            maxLength={20}
            editable={!loading}
          />
          <Text style={styles.helperText}>
            {nickname.length}/20 characters
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Date of Birth *</Text>
          <TextInput
            style={[styles.input, error && styles.inputError]}
            value={dob}
            onChangeText={(text) => {
              setDob(text);
              setError(null);
            }}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#94a3b8"
            editable={!loading}
            {...(Platform.OS === 'web' && {
              type: 'date',
              max: formatDateForInput(maxDate),
              min: formatDateForInput(minDate),
            })}
          />
          <Text style={styles.helperText}>
            Child must be between 2 and 14 years old
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Language Profile *</Text>
          <View style={styles.languageOptions}>
            {LANGUAGE_OPTIONS.map((lang) => (
              <Pressable
                key={lang}
                style={({ pressed }) => [
                  styles.languageOption,
                  languageProfile === lang && styles.languageOptionSelected,
                  pressed && styles.languageOptionPressed,
                ]}
                onPress={() => handleLanguageChange(lang)}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.languageOptionText,
                    languageProfile === lang && styles.languageOptionTextSelected,
                  ]}
                >
                  {lang}
                </Text>
              </Pressable>
            ))}
          </View>

          {showCustomLanguage && (
            <TextInput
              style={[styles.input, styles.customLanguageInput, error && styles.inputError]}
              value={customLanguage}
              onChangeText={(text) => {
                setCustomLanguage(text);
                setError(null);
              }}
              placeholder="Enter custom language"
              placeholderTextColor="#94a3b8"
              editable={!loading}
            />
          )}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            (loading || !nickname.trim() || !dob || !(languageProfile || customLanguage.trim())) && styles.buttonDisabled,
            pressed && !loading && styles.buttonPressed,
          ]}
          onPress={handleSubmit}
          disabled={loading || !nickname.trim() || !dob || !(languageProfile || customLanguage.trim())}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Create Profile</Text>
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
  languageOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  languageOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  languageOptionSelected: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  languageOptionPressed: {
    opacity: 0.7,
  },
  languageOptionText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  languageOptionTextSelected: {
    color: '#ffffff',
  },
  customLanguageInput: {
    marginTop: 8,
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

