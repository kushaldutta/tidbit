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
import WelcomeScreen from './src/screens/WelcomeScreen';
import FrequencySelectionScreen from './src/screens/FrequencySelectionScreen';
import CategorySelectionScreen from './src/screens/CategorySelectionScreen';
import PermissionRequestScreen from './src/screens/PermissionRequestScreen';
import LoadingScreen from './src/screens/LoadingScreen';
import StudySessionScreen from './src/screens/StudySessionScreen';
import StudyModeScreen from './src/screens/StudyModeScreen';
import TidbitModal from './src/components/TidbitModal';
import { UnlockService } from './src/services/UnlockService';
import { StorageService } from './src/services/StorageService';
import { ContentService } from './src/services/ContentService';
import { NotificationService } from './src/services/NotificationService';
import { SpacedRepetitionService } from './src/services/SpacedRepetitionService';
import * as Notifications from 'expo-notifications';

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
        name="Study" 
        component={StudyModeScreen}
        options={{
          tabBarLabel: 'Study',
          tabBarIcon: ({ color }) => (
            <TabIcon name="study" color={color} />
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
    study: '📚',
    grid: '📋',
    'stats-chart': '📊',
    settings: '⚙️',
  };
  return (
    <Text style={{ fontSize: 20 }}>{iconMap[name] || '•'}</Text>
  );
}

function OnboardingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="FrequencySelection" component={FrequencySelectionScreen} />
      <Stack.Screen name="CategorySelection" component={CategorySelectionScreen} />
      <Stack.Screen name="PermissionRequest" component={PermissionRequestScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [showTidbit, setShowTidbit] = useState(false);
  const [currentTidbit, setCurrentTidbit] = useState(null);
  const [appState, setAppState] = useState(AppState.currentState);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(null); // null = checking, true/false = determined
  const [isLoading, setIsLoading] = useState(true); // Show loading screen initially
  const isInitializedRef = useRef(false);
  const navigationRef = useRef(null);

  const handleUnlock = useCallback(async () => {
    // Only show tidbits after initialization AND onboarding is complete
    if (!isInitializedRef.current) return;
    
    // Check if onboarding is complete before showing tidbits
    const onboardingComplete = await StorageService.getOnboardingCompleted();
    if (!onboardingComplete) {
      console.log('[APP] Skipping tidbit - onboarding not complete');
      return;
    }
    
    const shouldShow = await UnlockService.shouldShowTidbit();
    if (shouldShow) {
      const tidbit = await ContentService.getSmartTidbit();
      if (tidbit) {
        // Mark tidbit as shown (will mark as "shown as due" if it was due)
        const tidbitWithId = ContentService.ensureTidbitHasId({ ...tidbit });
        if (tidbitWithId.id) {
          await SpacedRepetitionService.markTidbitAsShown(tidbitWithId.id);
        }
        
        setCurrentTidbit(tidbit);
        setShowTidbit(true);
        await UnlockService.recordUnlock();
        await StorageService.incrementTidbitsSeen();
      }
    }
  }, []);

  // Check onboarding status
  const checkOnboardingStatus = useCallback(async () => {
    const onboardingComplete = await StorageService.getOnboardingCompleted();
    setIsOnboardingComplete(onboardingComplete);
  }, []);

  useEffect(() => {
    // Show loading screen for 1 second, then check onboarding status
    const loadingTimer = setTimeout(async () => {
      await checkOnboardingStatus();
      setIsLoading(false);
    }, 1000);
    
    // Also check periodically (every 500ms) to catch when onboarding completes
    const interval = setInterval(() => {
      if (!isLoading) {
        checkOnboardingStatus();
      }
    }, 500);
    
    return () => {
      clearTimeout(loadingTimer);
      clearInterval(interval);
    };
  }, [checkOnboardingStatus, isLoading]);

  useEffect(() => {
    let mounted = true;
    
      // Initialize services
      const init = async () => {
        await StorageService.init();
        await ContentService.init();
        await UnlockService.init();
        
        const notificationEnabled = await NotificationService.init();
        
        // Ensure notification category is set up after permissions are granted
        if (notificationEnabled) {
          await NotificationService.ensureCategorySetup();
        }
      
      // Setup notification listeners
      NotificationService.setupNotificationListeners(
        // Notification received (app in foreground)
        (notification) => {
          // iOS uses categoryIdentifier, Android/Expo uses categoryId
          const categoryId = notification.request.content.categoryId || notification.request.content.categoryIdentifier;
          
          console.log('[NOTIFICATION_RECEIVED] Notification received in foreground:', {
            title: notification.request.content.title,
            body: notification.request.content.body?.substring(0, 50),
            categoryId: categoryId,
            hasData: !!notification.request.content.data,
          });
          
          // Ensure category is registered when notification arrives
          NotificationService.ensureCategorySetup().catch(err => {
            console.error('[NOTIFICATION_RECEIVED] Error ensuring category:', err);
          });
        },
        // Notification tapped or action button pressed
        async (response) => {
          const { notification, actionIdentifier } = response;
          const data = notification.request.content.data;
          
          // iOS uses categoryIdentifier (capital I), Android/Expo uses categoryId (lowercase)
          // Check both to handle platform differences
          const categoryId = notification.request.content.categoryId || notification.request.content.categoryIdentifier;
          
          console.log('[NOTIFICATION_RESPONSE] Received response:', {
            actionIdentifier,
            defaultActionId: Notifications.DEFAULT_ACTION_IDENTIFIER,
            hasData: !!data,
            tidbitId: data?.tidbitId,
            categoryId: categoryId,
            categoryIdField: notification.request.content.categoryId,
            categoryIdentifierField: notification.request.content.categoryIdentifier,
            notificationSource: notification.request.trigger?.type || 'push',
          });
          
          // Log if category is missing (check both field names)
          if (!categoryId) {
            console.error('[NOTIFICATION_RESPONSE] ⚠️ WARNING: categoryId/categoryIdentifier is missing from notification!');
            console.error('[NOTIFICATION_RESPONSE] Full notification:', JSON.stringify(notification.request.content, null, 2));
          } else {
            console.log('[NOTIFICATION_RESPONSE] ✅ category present:', categoryId);
          }
          
          // Check if this is an action button press
          if (actionIdentifier && actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
            // Handle action button press
            const tidbitId = data?.tidbitId;
            
            if (!tidbitId) {
              console.warn('[NOTIFICATION_ACTION] No tidbitId in notification data');
              return;
            }

            // Map action identifier to spaced repetition action
            let spacedRepAction = null;
            if (actionIdentifier === 'knew') {
              spacedRepAction = 'knew';
            } else if (actionIdentifier === 'didnt_know') {
              spacedRepAction = 'didnt_know';
            } else if (actionIdentifier === 'save') {
              spacedRepAction = 'save';
            }

            if (spacedRepAction) {
              try {
                console.log(`[NOTIFICATION_ACTION] Recording feedback: tidbitId=${tidbitId}, action=${spacedRepAction}`);
                await SpacedRepetitionService.recordFeedback(tidbitId, spacedRepAction);
                console.log('[NOTIFICATION_ACTION] Feedback recorded successfully');
              } catch (error) {
                console.error('[NOTIFICATION_ACTION] Error recording feedback:', error);
              }
            }
            return; // Don't open app for action button presses
          }
          
          // Regular notification tap - show tidbit in app
          // Only show if onboarding is complete
          const onboardingComplete = await StorageService.getOnboardingCompleted();
          if (!onboardingComplete) {
            console.log('[NOTIFICATION_RESPONSE] Skipping tidbit - onboarding not complete');
            return;
          }
          
          // Check if we should show a tidbit
          const shouldShow = await UnlockService.shouldShowTidbit();
          if (shouldShow) {
            let tidbit = null;
            
            // Try to get tidbit from notification data
            if (data && data.tidbit) {
              try {
                tidbit = JSON.parse(data.tidbit);
                // Ensure tidbit has an ID (for backward compatibility)
                tidbit = ContentService.ensureTidbitHasId(tidbit);
              } catch (e) {
                console.error('Error parsing tidbit from notification:', e);
              }
            }
            
            // If no tidbit in data, generate a new one (prioritize due tidbits)
            if (!tidbit) {
              tidbit = await ContentService.getSmartTidbit();
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
      
      // Push notifications are now handled by the server
      // No need to schedule local notifications anymore
      console.log('[APP] Push notifications enabled - server will handle scheduling');
      
      if (mounted) {
        isInitializedRef.current = true;
      }
    };
    
    init();

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setAppState((prevState) => {
        if (prevState.match(/inactive|background/) && nextAppState === 'active') {
          // App came to foreground
          // NOTE: We no longer automatically show tidbits on unlock
          // Tidbits only show when user explicitly requests them (via "Get Tidbit Now" or notification tap)
          
          // Re-register notification category to ensure action buttons work
          // This is important for push notifications that arrive when app is in background
          NotificationService.ensureCategorySetup().catch(err => {
            console.error('[APP] Error re-registering category on foreground:', err);
          });
          
          // Push notifications are handled by server - no local rescheduling needed
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

  const handleDismissTidbit = useCallback(() => {
    setShowTidbit(false);
    setCurrentTidbit(null);
  }, []);

  // Manual \"Reveal Next Tidbit\" should ALWAYS show the next tidbit,
  // without being blocked by unlock limits or notification rules.
  // Prioritizes due tidbits for spaced repetition.
  const handleNextTidbit = useCallback(async () => {
    try {
      const tidbit = await ContentService.getSmartTidbit();
      if (tidbit) {
        // Mark tidbit as shown (will mark as "shown as due" if it was due)
        const tidbitWithId = ContentService.ensureTidbitHasId({ ...tidbit });
        if (tidbitWithId.id) {
          await SpacedRepetitionService.markTidbitAsShown(tidbitWithId.id);
        }
        
        setCurrentTidbit(tidbit);
        setShowTidbit(true);
        // Count this as a tidbit seen, but don't affect unlock-based limits
        await StorageService.incrementTidbitsSeen();
      }
    } catch (error) {
      console.error('Error getting next tidbit:', error);
    }
  }, []);

  // Listen for navigation to Tidbit route and show modal
  // This must be before any early returns to follow Rules of Hooks
  useEffect(() => {
    if (!isOnboardingComplete || !navigationRef.current) return;
    
    const unsubscribe = navigationRef.current.addListener('state', (e) => {
      const route = e.data?.state?.routes?.[e.data?.state?.index];
      if (route?.name === 'Tidbit' && route?.params?.tidbit && !showTidbit) {
        setCurrentTidbit(route.params.tidbit);
        setShowTidbit(true);
        // Navigate back to Main after showing modal
        setTimeout(() => {
          navigationRef.current?.navigate('Main');
        }, 100);
      }
    });
    return unsubscribe;
  }, [showTidbit, isOnboardingComplete]);

  // Show loading screen initially
  if (isLoading || isOnboardingComplete === null) {
    return (
      <SafeAreaProvider>
        <LoadingScreen />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        {isOnboardingComplete ? (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen 
              name="Tidbit" 
              options={{ presentation: 'transparentModal', headerShown: false }}
            >
              {() => null}
            </Stack.Screen>
            <Stack.Screen 
              name="StudySession" 
              component={StudySessionScreen}
            />
          </Stack.Navigator>
        ) : (
          <OnboardingStack />
        )}
        {showTidbit && currentTidbit && (
          <TidbitModal
            tidbit={currentTidbit}
            onDismiss={handleDismissTidbit}
            onNextTidbit={handleNextTidbit}
          />
        )}
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

