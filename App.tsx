//Where you code the app

import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

// welcome screen component
// @ts-ignore
function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Palura</Text>
      <Text style={styles.subtitle}></Text>
      
      {/* Button positioned at the bottom */}
      <TouchableOpacity 
        style={styles.button}
        onPress={() => navigation.navigate('StartScreen')}
      >
        <Text style={styles.buttonText}>Let's get started!</Text>
      </TouchableOpacity>
    </View>
  );
}

//Get Started page component
function StartScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice Test</Text>
      <Text style={styles.subtitle}>Connect your Microphone</Text>
    </View>
  );
}

// Main App component with navigation
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Welcome">
        <Stack.Screen 
          name="Welcome" 
          component={WelcomeScreen}
          options={{ headerShown: false }} // Hide header on welcome screen
        />
        <Stack.Screen 
          name="StartScreen" 
          component={StartScreen}
          options={{ title: 'Title (Fill in later)' }}
          
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    color: "teal"
  },
  subtitle: {
    fontSize: 16,
    color: "teal",
  },
  button: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: 'teal',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 3, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});