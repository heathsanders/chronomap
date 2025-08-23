/**
 * AppNavigator
 * Main navigation container for ChronoMap
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { RootStackParamList } from '@/types';
import OnboardingScreen from '@/screens/OnboardingScreen';
import TimelineScreen from '@/screens/TimelineScreen';

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Onboarding"
        screenOptions={{
          headerShown: false,
          gestureEnabled: false, // Disable swipe back for better onboarding flow
        }}
      >
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="Timeline"
          component={TimelineScreen}
          options={{
            headerShown: true,
            headerTitle: 'ChronoMap',
            headerStyle: {
              backgroundColor: '#F7FAFC',
              elevation: 0,
              shadowOpacity: 0,
            },
            headerTitleStyle: {
              color: '#1A365D',
              fontSize: 18,
              fontWeight: '600',
            },
            gestureEnabled: false, // Prevent going back to onboarding
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}