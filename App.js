import React, { useEffect, useState, useCallback, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppState, Text, Platform } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import CategoriesScreen from './src/screens/CategoriesScreen';
import StatsScreen from './src/screens/StatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import TidbitModal from './src/components/TidbitModal';
import { UnlockService } from './src/services/UnlockService';
import { StorageService } from './src/services/StorageService';
import { ContentService } from './src/services/ContentService';
import { NotificationService } from './src/services/NotificationService';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
        },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => (
            <TabIcon name="home" color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Categories" 
        component={CategoriesScreen}
        options={{
          tabBarLabel: 'Categories',
          tabBarIcon: ({ color }) => (
            <TabIcon name="grid" color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Stats" 
        component={StatsScreen}
        options={{
          tabBarLabel: 'Stats',
          tabBarIcon: ({ color }) => (
            <TabIcon name="stats-chart" color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => (
            <TabIcon name="settings" color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function TabIcon({ name, color }) {
  // Simple text-based icons
  const iconMap = {
    home: '🏠',
    grid: '📋',
    'stats-chart': '📊',
    settings: '⚙️',
  };
  return (
    <Text style={{ fontSize: 20 }}>{iconMap[name] || '•'}</Text>
  );
}

export default function App() {
  const [showTidbit, setShowTidbit] = useState(false);
  const [currentTidbit, setCurrentTidbit] = useState(null);
  const [appState, setAppState] = useState(AppState.currentState);
  const isInitializedRef = useRef(false);

  const handleUnlock = useCallback(async () => {
    // Only show tidbits after initialization
    if (!isInitializedRef.current) return;
    
    const shouldShow = await UnlockService.shouldShowTidbit();
    if (shouldShow) {
      const tidbit = await ContentService.getRandomTidbit();
      if (tidbit) {
        setCurrentTidbit(tidbit);
        setShowTidbit(true);
        await UnlockService.recordUnlock();
        await StorageService.incrementTidbitsSeen();
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    
    // Initialize services
    const init = async () => {
      await StorageService.init();
      await ContentService.init();
      await UnlockService.init();
      const notificationEnabled = await NotificationService.init();
      
      // Setup notification listeners
      NotificationService.setupNotificationListeners(
        // Notification received (app in foreground)
        (notification) => {
          console.log('Notification received:', notification);
        },
        // Notification tapped
        async (response) => {
          const { notification } = response;
          const data = notification.request.content.data;
          
          // Check if we should show a tidbit
          const shouldShow = await UnlockService.shouldShowTidbit();
          if (shouldShow) {
            let tidbit = null;
            
            // Try to get tidbit from notification data
            if (data && data.tidbit) {
              try {
                tidbit = JSON.parse(data.tidbit);
              } catch (e) {
                console.error('Error parsing tidbit from notification:', e);
              }
            }
            
            // If no tidbit in data, generate a new one
            if (!tidbit) {
              tidbit = await ContentService.getRandomTidbit();
            }
            
            if (tidbit) {
              setCurrentTidbit(tidbit);
              setShowTidbit(true);
              await UnlockService.recordUnlock();
              await StorageService.incrementTidbitsSeen();
            }
          }
        }
      );
      
      // Schedule recurring notifications for iOS (if enabled)
      if (mounted && notificationEnabled && Platform.OS === 'ios') {
        const interval = await StorageService.getNotificationInterval();
        const enabled = await StorageService.getNotificationsEnabled();
        if (enabled) {
          await NotificationService.scheduleRecurringNotifications(interval);
        }
      }
      
      if (mounted) {
        isInitializedRef.current = true;
      }
    };
    
    init();

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setAppState((prevState) => {
        if (prevState.match(/inactive|background/) && nextAppState === 'active') {
          // App came to foreground - check if we should show a tidbit
          handleUnlock();
        }
        return nextAppState;
      });
    });

    return () => {
      mounted = false;
      subscription?.remove();
      NotificationService.removeListeners();
    };
  }, [handleUnlock]);

  const handleDismissTidbit = () => {
    setShowTidbit(false);
    setCurrentTidbit(null);
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={MainTabs} />
        </Stack.Navigator>
        {showTidbit && currentTidbit && (
          <TidbitModal
            tidbit={currentTidbit}
            onDismiss={handleDismissTidbit}
          />
        )}
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

