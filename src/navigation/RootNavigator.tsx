/**
 * Root Navigation for ChronoMap
 * Main navigation structure with tab-based layout
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator, BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

// Screens
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { TimelineScreen } from '../screens/TimelineScreen';
import { MapScreen } from '../screens/MapScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

// Types
import { RootStackParamList, TabParamList } from '../types';
import { colors } from '../config';
import { useUIStore } from '../stores/uiStore';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'TimelineTab':
              iconName = focused ? 'time' : 'time-outline';
              break;
            case 'MapTab':
              iconName = focused ? 'map' : 'map-outline';
              break;
            case 'SettingsTab':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            default:
              iconName = 'help';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.neutral[500],
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        headerStyle: {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
        headerTintColor: colors.textDark,
        headerTitleStyle: {
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen 
        name="TimelineTab" 
        component={TimelineScreen} 
        options={{ 
          tabBarLabel: 'Timeline',
          title: 'Photos'
        }} 
      />
      <Tab.Screen 
        name="MapTab" 
        component={MapScreen} 
        options={{ 
          tabBarLabel: 'Map',
          title: 'Photo Map'
        }} 
      />
      <Tab.Screen 
        name="SettingsTab" 
        component={SettingsScreen} 
        options={{ 
          tabBarLabel: 'Settings',
          title: 'Settings'
        }} 
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { isOnboardingComplete } = useUIStore();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
          headerTintColor: colors.textDark,
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      >
        {!isOnboardingComplete ? (
          <Stack.Screen 
            name="Onboarding" 
            component={OnboardingScreen}
            options={{ 
              headerShown: false,
              gestureEnabled: false,
            }}
          />
        ) : (
          <Stack.Screen 
            name="MainTabs" 
            component={MainTabs}
            options={{ 
              headerShown: false 
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}