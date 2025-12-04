// This file contains the original pronunciation practice app
// Moved from App.js to HomeScreen.js

import React, { useRef, useState, useEffect } from 'react';
import { SafeAreaView, View, Text, TextInput, Pressable, StyleSheet, StatusBar, Platform, ActivityIndicator } from 'react-native';
import { analyzeWord } from '../services/pronunciationAnalysis';

// Conditionally import expo modules only on native platforms to avoid web initialization errors
let Speech = null;
let Audio = null;

if (Platform.OS !== 'web') {
  try {
    Speech = require('expo-speech');
    Audio = require('expo-av').Audio;
  } catch (e) {
    console.warn('Failed to load expo-speech or expo-av:', e);
  }
}

// Load template data - using require for React Native compatibility
const templateData = require('../assets/speech/lollipop/template.json');

const DEFAULT_WORD = 'LOLLIPOP';
const DEFAULT_DESC = 'The occurrence of fortunate events by chance.';

// Activity states (from state machine)
const ACTIVITY_STATES = {
  PROMPT_AND_LISTEN: 'PromptAndListen',
  PROCESSING: 'Processing',
  FEEDBACK: 'Feedback',
  COMPLETE: 'Complete'
};

// Practice word data matching the user story
const PRACTICE_WORD = {
  word: 'LOLLIPOP',
  syllableBreak: 'lo-LI-pop',
  targetPhoneme: 'LI',
  position: 'medial'
};

export default function HomeScreen() {
  // Session object - initialized when activity loads
  const [session, setSession] = useState(null);
  
  // Activity state - starts as PromptAndListen
  const [activityState, setActivityState] = useState(ACTIVITY_STATES.PROMPT_AND_LISTEN);
  
  const [word, setWord] = useState(DEFAULT_WORD);
  const [desc, setDesc] = useState(DEFAULT_DESC);
  const speakingRef = useRef(false);
  
  // Recording state: 'idle' (not recording), 'recording' (currently recording), 'recorded' (has a recording)
  const [recordingStatus, setRecordingStatus] = useState('idle');
  const [recording, setRecording] = useState(null);
  const [sound, setSound] = useState(null);
  const recordingUriRef = useRef(null);
  
  // Analysis result state
  const [analysisResult, setAnalysisResult] = useState(null);

  // Initialize session when component mounts (activity loads)
  useEffect(() => {
    initializeSession();
  }, []);

  // Initialize session object with required properties
  const initializeSession = () => {
    const newSession = {
      targetWord: PRACTICE_WORD.word,           // "LOLLIPOP"
      targetPhoneme: PRACTICE_WORD.targetPhoneme, // "LI"
      position: PRACTICE_WORD.position,         // "medial"
      maxAttempts: 5,                           // Maximum attempts allowed
      currentAttempt: 0                         // Track current attempt number
    };
    
    setSession(newSession);
    setActivityState(ACTIVITY_STATES.PROMPT_AND_LISTEN);
    setAnalysisResult(null); // Reset analysis result
    
    console.log('Session initialized:', newSession);
    console.log('Activity state set to:', ACTIVITY_STATES.PROMPT_AND_LISTEN);
  };
  
  // Handle retry - go back to recording
  const handleRetry = () => {
    setAnalysisResult(null);
    setActivityState(ACTIVITY_STATES.PROMPT_AND_LISTEN);
    setRecordingStatus('idle');
    recordingUriRef.current = null;
  };
  
  // Handle continue - move to next word or complete
  const handleContinue = () => {
    if (session && session.currentAttempt >= session.maxAttempts) {
      setActivityState(ACTIVITY_STATES.COMPLETE);
    } else {
      // For MVP, just reset for another attempt
      initializeSession();
    }
  };

  // Cleanup audio resources when component unmounts
  useEffect(() => {
    return () => {
      if (sound && Platform.OS !== 'web') {
        sound.unloadAsync().catch(() => {});
      }
      if (recording && Platform.OS !== 'web' && recording.stopAndUnloadAsync) {
        recording.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, [sound, recording]);

  const speak = (text) => {
    if (!text?.trim()) return;
    if (Platform.OS === 'web') {
      // On web, use Web Speech API
      if (speakingRef.current && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        speakingRef.current = false;
        return;
      }
      if (window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.onstart = () => { speakingRef.current = true; };
        utterance.onend = () => { speakingRef.current = false; };
        utterance.onerror = () => { speakingRef.current = false; };
        window.speechSynthesis.speak(utterance);
      }
      return;
    }
    // Native platforms
    if (!Speech) return;
    if (speakingRef.current) {
      Speech.stop();
      speakingRef.current = false;
      return;
    }
    Speech.speak(text, {
      language: 'en-US',
      onStart: () => { speakingRef.current = true; },
      onDone: () => { speakingRef.current = false; },
      onStopped: () => { speakingRef.current = false; }
    });
  };

  // Request audio permissions and start recording
  const startRecording = async () => {
    try {
      // On web, use MediaRecorder API
      if (Platform.OS === 'web') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm'
          });
          const chunks = [];
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              chunks.push(event.data);
            }
          };
          
          mediaRecorder.onstop = async () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            const uri = URL.createObjectURL(blob);
            recordingUriRef.current = uri;
            setRecordingStatus('idle');
            
            // Transition to PROCESSING state and trigger analysis
            setActivityState(ACTIVITY_STATES.PROCESSING);
            
            // Perform analysis
            try {
              const result = await analyzeWord(uri, templateData);
              setAnalysisResult(result);
              
              // Update session attempt counter
              if (session) {
                setSession({
                  ...session,
                  currentAttempt: session.currentAttempt + 1
                });
              }
              
              // Transition to FEEDBACK state
              setActivityState(ACTIVITY_STATES.FEEDBACK);
            } catch (err) {
              console.error('Analysis failed:', err);
              alert(`Analysis failed: ${err.message || 'Unknown error'}`);
              setActivityState(ACTIVITY_STATES.PROMPT_AND_LISTEN);
            }
            
            stream.getTracks().forEach(track => track.stop());
          };
          
          mediaRecorder.start();
          setRecording({ stop: () => mediaRecorder.stop() }); // Store stop function
          setRecordingStatus('recording');
        } catch (err) {
          console.error('Failed to start web recording', err);
          alert(`Failed to start recording: ${err.message || 'Unknown error'}`);
          setRecordingStatus('idle');
        }
        return;
      }
      
      // Native platforms
      if (!Audio) {
        alert('Audio recording not available');
        return;
      }
      
      // Request permission to use the microphone
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        alert('Permission to access microphone is required!');
        return;
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create a new recording instance
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setRecordingStatus('recording');
    } catch (err) {
      console.error('Failed to start recording', err);
      alert(`Failed to start recording: ${err.message || 'Unknown error'}`);
      setRecordingStatus('idle');
    }
  };

  // Stop recording, save the URI, and trigger analysis
  const stopRecording = async () => {
    if (!recording) return;

    try {
      // On web, recording.stop() is already handled in onstop callback
      if (Platform.OS === 'web') {
        if (recording.stop) {
          recording.stop();
        }
        setRecording(null);
        return;
      }
      
      // Native platforms
      await recording.stopAndUnloadAsync();
      
      // Get the URI where the recording was saved
      const uri = recording.getURI();
      console.log('Recording saved at:', uri);
      recordingUriRef.current = uri;
      
      // Reset audio mode
      if (Audio) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        });
      }
      
      setRecording(null);
      
      // Transition to PROCESSING state and trigger analysis
      setActivityState(ACTIVITY_STATES.PROCESSING);
      setRecordingStatus('idle'); // Reset recording status
      
      // Perform analysis
      try {
        const result = await analyzeWord(uri, templateData);
        setAnalysisResult(result);
        
        // Update session attempt counter
        if (session) {
          setSession({
            ...session,
            currentAttempt: session.currentAttempt + 1
          });
        }
        
        // Transition to FEEDBACK state
        setActivityState(ACTIVITY_STATES.FEEDBACK);
      } catch (err) {
        console.error('Analysis failed:', err);
        alert(`Analysis failed: ${err.message || 'Unknown error'}`);
        // Return to PROMPT_AND_LISTEN state on error
        setActivityState(ACTIVITY_STATES.PROMPT_AND_LISTEN);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
      alert(`Failed to stop recording: ${err.message || 'Unknown error'}`);
      setRecordingStatus('idle');
      setRecording(null);
      setActivityState(ACTIVITY_STATES.PROMPT_AND_LISTEN);
    }
  };

  // Play the recorded audio
  const playRecording = async () => {
    if (!recordingUriRef.current) {
      alert('No recording available');
      return;
    }

    const uri = recordingUriRef.current;

    // On web, ONLY use HTML5 Audio - never touch expo-av Audio.Sound
    if (Platform.OS === 'web') {
      try {
        // Use browser's native Audio API (global Audio constructor)
        // eslint-disable-next-line no-undef
        const audioElement = new Audio(uri);
        audioElement.play().catch((err) => {
          console.error('HTML5 Audio playback failed:', err);
          alert(`Failed to play recording: ${err.message || 'Unknown error'}`);
        });
        return;
      } catch (err) {
        console.error('Failed to create HTML5 audio:', err);
        alert(`Failed to play recording: ${err.message || 'Unknown error'}`);
        return; // Don't fall through to expo-av on web
      }
    }

    // Use expo-av ONLY for native platforms (iOS/Android)
    if (Platform.OS !== 'web' && Audio) {
      try {
        // Clean up any previous sound
        if (sound) {
          try {
            await sound.unloadAsync();
          } catch (e) {
            // Ignore cleanup errors
          }
          setSound(null);
        }
        
        // Create a new sound object from the recording URI
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: uri },
          { shouldPlay: false }
        );
        
        setSound(newSound);
        
        // Set up playback status listener before playing
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish || status.isLoaded === false) {
            // Clean up when playback finishes
            newSound.unloadAsync().catch(() => {});
            setSound(null);
          }
        });
        
        // Play the sound
        await newSound.playAsync();
      } catch (err) {
        console.error('Failed to play recording:', err);
        console.error('Recording URI:', recordingUriRef.current);
        alert(`Failed to play recording: ${err.message || 'Unknown error'}`);
      }
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'} />
      <View style={styles.container}>
        <Text style={styles.title}>Palura · TTS Demo</Text>

        {/* Large word display - integrated into existing UI */}
        {session && (
          <>
            <Text style={styles.largeWord}>{session.targetWord}</Text>
            <Text style={styles.syllableBreak}>{PRACTICE_WORD.syllableBreak}</Text>
            <Text style={styles.label}>Target Phoneme: {session.targetPhoneme} ({session.position})</Text>
          </>
        )}

        <Text style={styles.label}>Word</Text>
        <TextInput
          style={styles.input}
          value={word}
          onChangeText={setWord}
          placeholder="Enter a word"
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={desc}
          onChangeText={setDesc}
          placeholder="Add a description"
          multiline
        />

        <Text style={styles.prompt}>Can you pronounce the medial position?</Text>

        {/* PROCESSING State - Show loading spinner */}
        {activityState === ACTIVITY_STATES.PROCESSING && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#0ea5e9" />
            <Text style={styles.processingText}>Analyzing pronunciation...</Text>
          </View>
        )}

        {/* FEEDBACK State - Show analysis results */}
        {activityState === ACTIVITY_STATES.FEEDBACK && analysisResult && (
          <View style={styles.feedbackContainer}>
            {/* Overall Word Score - Big Ring */}
            <View style={styles.scoreRingContainer}>
              <View style={[styles.scoreRing, { borderColor: analysisResult.overallWordScore >= 70 ? '#10b981' : '#ef4444' }]}>
                <Text style={styles.scoreRingValue}>{analysisResult.overallWordScore}</Text>
                <Text style={styles.scoreRingLabel}>Overall</Text>
              </View>
            </View>

            {/* Target Phoneme Badge with Pass/Fail */}
            <View style={styles.phonemeBadgeContainer}>
              <View style={[
                styles.phonemeBadge,
                analysisResult.decision.target === 'pass' ? styles.phonemeBadgePass : styles.phonemeBadgeFail
              ]}>
                <Text style={styles.phonemeBadgeLabel}>Target Phoneme</Text>
                <Text style={styles.phonemeBadgeScore}>{analysisResult.phonemeScore}</Text>
                <Text style={styles.phonemeBadgeDecision}>
                  {analysisResult.decision.target === 'pass' ? '✓ PASS' : '✗ FAIL'}
                </Text>
              </View>
            </View>

            {/* Detected Phoneme (if different) */}
            {analysisResult.detectedPhoneme && analysisResult.detectedPhoneme !== 'I' && (
              <View style={styles.detectedPhonemeContainer}>
                <Text style={styles.detectedPhonemeLabel}>
                  Detected: {analysisResult.detectedPhoneme} (expected: I)
                </Text>
              </View>
            )}

            {/* Wrong Word Warning */}
            {analysisResult.wrongWord && (
              <View style={styles.warningContainer}>
                <Text style={styles.warningText}>⚠️ Wrong word detected</Text>
              </View>
            )}

            {/* Retry and Continue Buttons */}
            <View style={styles.feedbackButtonRow}>
              <Pressable
                style={({ pressed }) => [styles.feedbackButton, styles.retryButton, pressed && { opacity: 0.8 }]}
                onPress={handleRetry}
              >
                <Text style={styles.buttonText}>🔄 Try Again</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.feedbackButton, styles.continueButton, pressed && { opacity: 0.8 }]}
                onPress={handleContinue}
              >
                <Text style={styles.buttonText}>✓ Continue</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* COMPLETE State */}
        {activityState === ACTIVITY_STATES.COMPLETE && (
          <View style={styles.completeContainer}>
            <Text style={styles.completeText}>🎉 Practice Complete!</Text>
            <Pressable
              style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}
              onPress={initializeSession}
            >
              <Text style={styles.buttonText}>Start Over</Text>
            </Pressable>
          </View>
        )}

        {/* PROMPT_AND_LISTEN State - Show recording controls */}
        {activityState === ACTIVITY_STATES.PROMPT_AND_LISTEN && (
          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}
              onPress={() => speak(word)}
            >
              <Text style={styles.buttonText}>Speak</Text>
            </Pressable>

            {recordingStatus === 'idle' && (
              <Pressable
                style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}
                onPress={startRecording}
              >
                <Text style={styles.buttonText}>🎤 Record</Text>
              </Pressable>
            )}
            
            {recordingStatus === 'recording' && (
              <Pressable
                style={({ pressed }) => [styles.button, styles.stopButton, pressed && { opacity: 0.8 }]}
                onPress={stopRecording}
              >
                <Text style={styles.buttonText}>⏹ Stop</Text>
              </Pressable>
            )}
          </View>
        )}

        <Text style={styles.helper}>Tip: Tap Speak again to stop playback.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0ea5e9' },
  container: {
    flex: 1,
    padding: 20,
    gap: 12,
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24
  },
  title: { fontSize: 22, fontWeight: '700', marginVertical: 8 },
  largeWord: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0ea5e9',
    marginBottom: 8,
    textAlign: 'center'
  },
  syllableBreak: {
    fontSize: 18,
    color: '#64748b',
    marginBottom: 8,
    textAlign: 'center'
  },
  label: { fontSize: 14, color: '#334155' },
  prompt: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center'
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16
  },
  multiline: { height: 90, textAlignVertical: 'top' },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  button: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#0ea5e9',
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 2
  },
  stopButton: {
    backgroundColor: '#ef4444',
  },
  playButton: {
    backgroundColor: '#10b981',
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  helper: { fontSize: 12, color: '#475569', marginTop: 8 },
  // Processing state styles
  processingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 16
  },
  processingText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500'
  },
  // Feedback state styles
  feedbackContainer: {
    gap: 20,
    marginTop: 20
  },
  scoreRingContainer: {
    alignItems: 'center',
    marginVertical: 20
  },
  scoreRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc'
  },
  scoreRingValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#334155'
  },
  scoreRingLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4
  },
  phonemeBadgeContainer: {
    alignItems: 'center'
  },
  phonemeBadge: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 200
  },
  phonemeBadgePass: {
    backgroundColor: '#d1fae5',
    borderWidth: 2,
    borderColor: '#10b981'
  },
  phonemeBadgeFail: {
    backgroundColor: '#fee2e2',
    borderWidth: 2,
    borderColor: '#ef4444'
  },
  phonemeBadgeLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4
  },
  phonemeBadgeScore: {
    fontSize: 28,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4
  },
  phonemeBadgeDecision: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155'
  },
  detectedPhonemeContainer: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fbbf24'
  },
  detectedPhonemeLabel: {
    fontSize: 14,
    color: '#92400e',
    textAlign: 'center'
  },
  warningContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef4444'
  },
  warningText: {
    fontSize: 14,
    color: '#991b1b',
    textAlign: 'center',
    fontWeight: '600'
  },
  feedbackButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12
  },
  feedbackButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 2
  },
  retryButton: {
    backgroundColor: '#64748b'
  },
  continueButton: {
    backgroundColor: '#10b981'
  },
  // Complete state styles
  completeContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 20
  },
  completeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10b981'
  }
});

