import React, { useEffect, useState, useCallback, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppState, Text, Platform, DeviceEventEmitter, Modal } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import CategoriesScreen from './src/screens/CategoriesScreen';
import FeedScreen from './src/screens/FeedScreen';
import StatsScreen from './src/screens/StatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import FrequencySelectionScreen from './src/screens/FrequencySelectionScreen';
import CategorySelectionScreen from './src/screens/CategorySelectionScreen';
import PermissionRequestScreen from './src/screens/PermissionRequestScreen';
import LoadingScreen from './src/screens/LoadingScreen';
import StudySessionScreen from './src/screens/StudySessionScreen';
import StudyModeScreen from './src/screens/StudyModeScreen';
import CategoryProgressScreen from './src/screens/CategoryProgressScreen';
import CategoryDetailScreen from './src/screens/CategoryDetailScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import SignUpScreen from './src/screens/auth/SignUpScreen';
import OnboardingProfileScreen from './src/screens/auth/OnboardingProfileScreen';
import ClassSelectionScreen from './src/screens/auth/ClassSelectionScreen';
import MyClassesScreen from './src/screens/MyClassesScreen';
import GroupScreen from './src/screens/GroupScreen';
import GroupDeckStudyScreen from './src/screens/GroupDeckStudyScreen';
import GroupDeckStudySummaryScreen from './src/screens/GroupDeckStudySummaryScreen';
import MyDecksScreen from './src/screens/decks/MyDecksScreen';
import DeckEditorScreen from './src/screens/decks/DeckEditorScreen';
import CardEditorScreen from './src/screens/decks/CardEditorScreen';
import LearnModePickerScreen from './src/screens/LearnModePickerScreen';
import QuizScreen from './src/screens/QuizScreen';
import RecallScreen from './src/screens/RecallScreen';
import MatchScreen from './src/screens/MatchScreen';
import LearnSummaryScreen from './src/screens/LearnSummaryScreen';
import PaywallScreen from './src/screens/PaywallScreen';
import AIGenerationScreen from './src/screens/AIGenerationScreen';
import SnapPageScreen from './src/screens/SnapPageScreen';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import ThemePickerScreen from './src/screens/ThemePickerScreen';
import TidbitModal from './src/components/TidbitModal';
import { UnlockService } from './src/services/UnlockService';
import { StorageService } from './src/services/StorageService';
import { ContentService } from './src/services/ContentService';
import { NotificationService } from './src/services/NotificationService';
import { SpacedRepetitionService } from './src/services/SpacedRepetitionService';
import { AuthService } from './src/services/AuthService';
import { ProfileService } from './src/services/ProfileService';
import { SyncService } from './src/services/SyncService';
import { SameBoatService } from './src/services/SameBoatService';
import { EntitlementService } from './src/services/EntitlementService';
import { supabase, SUPABASE_CONFIGURED } from './src/config/supabase';
import * as Notifications from 'expo-notifications';

const Stack = createStackNavigator();
// ─── Themed navigation container ─────────────────────────────────────────────
// Must live inside ThemeProvider to read context.
function ThemedNavigationContainer({ children, navRef }) {
  const { theme } = useTheme();
  const navTheme = {
    dark: theme.id === 'midnight',
    colors: {
      primary: theme.primary,
      background: theme.background,
      card: theme.card,
      text: theme.text,
      border: theme.primaryLight,
      notification: theme.primary,
    },
  };
  return (
    <NavigationContainer ref={navRef} theme={navTheme}>
      {children}
    </NavigationContainer>
  );
}

const Tab = createBottomTabNavigator();

function MainTabs() {
  const { theme } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.tabBarActive,
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopWidth: 1,
          borderTopColor: theme.primaryLight,
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
    newspaper: '📰',
    'stats-chart': '📊',
    settings: '⚙️',
  };
  return (
    <Text style={{ fontSize: 20 }}>{iconMap[name] || '•'}</Text>
  );
}

// Shown to unauthenticated users: splash → login/signup.
function UnauthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Welcome">
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}

// Shown after auth when profile is incomplete or first-time setup remains.
// startAt: 'profile' → name/school/year only; 'setup' → classes → frequency → permissions.
function FullSetupStack({ startAt = 'profile' }) {
  const [boot, setBoot] = useState({
    ready: startAt === 'profile',
    route: startAt === 'setup' ? 'ClassSelection' : 'OnboardingProfile',
    params: {},
  });

  useEffect(() => {
    if (startAt !== 'setup') return;

    (async () => {
      try {
        const profile = await ProfileService.getMyProfile();
        setBoot({
          ready: true,
          route: 'ClassSelection',
          params: { schoolId: profile?.school_id || 'uc-berkeley' },
        });
      } catch {
        setBoot({ ready: true, route: 'ClassSelection', params: {} });
      }
    })();
  }, [startAt]);

  if (!boot.ready) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={boot.route}>
      <Stack.Screen name="OnboardingProfile" component={OnboardingProfileScreen} />
      <Stack.Screen
        name="ClassSelection"
        component={ClassSelectionScreen}
        initialParams={boot.route === 'ClassSelection' ? boot.params : undefined}
      />
      <Stack.Screen name="FrequencySelection" component={FrequencySelectionScreen} />
      <Stack.Screen name="PermissionRequest" component={PermissionRequestScreen} />
    </Stack.Navigator>
  );
}

/**
 * Syncs a notification button tap (knew / didnt_know / save) to Supabase.
 *
 * - knew / didnt_know → writes a card_attempt row (feeds Same-Boat stats)
 *                      → upserts user_stats tidbits_seen + cards_mastered
 * - save              → writes a saved_tidbits row so the bookmark is cloud-persisted
 *
 * Runs silently — never throws, so a network failure won't break the flow.
 */
async function syncNotificationFeedbackToCloud(tidbitId, action) {
  if (!SUPABASE_CONFIGURED) return;
  const userId = AuthService.getUserId();
  if (!userId) return;

  try {
    if (action === 'knew' || action === 'didnt_know') {
      const wasCorrect = action === 'knew';

      // Record in card_attempts (used by Same-Boat views)
      await supabase.from('card_attempts').insert({
        user_id: userId,
        card_id: tidbitId,        // tidbitId doubles as card_id for preset tidbits
        was_correct: wasCorrect,
        source: 'notification',
        attempted_at: new Date().toISOString(),
      });

      // Upsert user_stats: increment tidbits_seen; increment cards_mastered only for 'knew'
      const { data: existing } = await supabase
        .from('user_stats')
        .select('tidbits_seen, cards_mastered')
        .eq('user_id', userId)
        .maybeSingle();

      await supabase.from('user_stats').upsert({
        user_id: userId,
        tidbits_seen: (existing?.tidbits_seen ?? 0) + 1,
        cards_mastered: (existing?.cards_mastered ?? 0) + (wasCorrect ? 1 : 0),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      console.log(`[NOTIFICATION_ACTION] Cloud sync: ${action} for tidbit ${tidbitId}`);
    } else if (action === 'save') {
      // Upsert into saved_tidbits so the bookmark survives reinstalls / cross-device
      await supabase.from('saved_tidbits').upsert({
        user_id: userId,
        tidbit_id: tidbitId,
        saved_at: new Date().toISOString(),
      }, { onConflict: 'user_id,tidbit_id' });

      console.log(`[NOTIFICATION_ACTION] Cloud sync: saved tidbit ${tidbitId}`);
    }
  } catch (err) {
    // Non-fatal — local state is already updated
    console.warn('[NOTIFICATION_ACTION] Cloud sync failed (non-fatal):', err.message);
  }
}

export default function App() {
  const [showTidbit, setShowTidbit] = useState(false);
  const [currentTidbit, setCurrentTidbit] = useState(null);
  const [appState, setAppState] = useState(AppState.currentState);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(null); // null = checking, true/false = determined
  const [isLoading, setIsLoading] = useState(true); // Show loading screen initially
  // Auth gate: unauthenticated | needs_profile | needs_onboarding | ready
  const [authStatus, setAuthStatus] = useState(null);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const authStatusRef = useRef(null);
  const isOnboardingCompleteRef = useRef(null);
  const resolveInFlightRef = useRef(null);
  const isInitializedRef = useRef(false);
  const navigationRef = useRef(null);

  useEffect(() => {
    authStatusRef.current = authStatus;
  }, [authStatus]);

  useEffect(() => {
    isOnboardingCompleteRef.current = isOnboardingComplete;
  }, [isOnboardingComplete]);

  // Resolve auth + profile to decide which stack to mount.
  const resolveAuthStatus = useCallback(async () => {
    if (resolveInFlightRef.current) {
      return resolveInFlightRef.current;
    }

    const task = (async () => {
      const session = AuthService.getSession();
      if (!session?.user?.id) {
        setAuthStatus('unauthenticated');
        return;
      }
      try {
        await AuthService.ensureValidSession();
        EntitlementService.init().catch(() => {});
        const userId = AuthService.getUserId();
        if (userId) EntitlementService.identifyUser(userId).catch(() => {});
        await SyncService.onAuthenticated();
        const [hasProfile, onboardingDone] = await Promise.all([
          ProfileService.hasCompletedProfile(),
          StorageService.getOnboardingCompleted(),
        ]);
        setIsOnboardingComplete(onboardingDone);

        if (!hasProfile) {
          setAuthStatus('needs_profile');
        } else if (!onboardingDone) {
          setAuthStatus('needs_onboarding');
        } else {
          setAuthStatus('ready');
        }
      } catch (err) {
        console.warn('[APP] resolveAuthStatus profile check failed:', err);
        if (
          AuthService.isStaleSessionError(err) ||
          AuthService.isAuthMismatchError(err)
        ) {
          await AuthService.clearLocalAuthSession();
          setAuthStatus('unauthenticated');
          return;
        }
        setAuthStatus('ready');
      }
    })();

    resolveInFlightRef.current = task;
    try {
      await task;
    } finally {
      resolveInFlightRef.current = null;
    }
  }, []);

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
    // Resolve auth + onboarding once on mount, then drop the loading screen.
    const bootstrap = async () => {
      await AuthService.init();
      await Promise.all([resolveAuthStatus(), checkOnboardingStatus()]);
      setIsLoading(false);
    };
    bootstrap();

    // React to sign in / sign out events from anywhere in the app.
    const unsubscribeAuth = AuthService.onAuthChange(() => {
      resolveAuthStatus();
    });

    // Re-check local onboarding flag while in setup — only hit the server when
    // onboarding actually completes (not every 500ms).
    const interval = setInterval(async () => {
      if (isLoading) return;

      const prevOnboarding = isOnboardingCompleteRef.current;
      const onboardingDone = await StorageService.getOnboardingCompleted();

      if (onboardingDone !== prevOnboarding) {
        setIsOnboardingComplete(onboardingDone);
        isOnboardingCompleteRef.current = onboardingDone;
        if (
          onboardingDone &&
          (authStatusRef.current === 'needs_profile' ||
            authStatusRef.current === 'needs_onboarding')
        ) {
          resolveAuthStatus();
        }
      }
    }, 500);

    return () => {
      clearInterval(interval);
      unsubscribeAuth?.();
    };
  }, [checkOnboardingStatus, isLoading, resolveAuthStatus]);

  // Returning users: optional notification prompt once per device if not granted.
  useEffect(() => {
    if (authStatus !== 'ready') {
      setShowNotificationPrompt(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const [{ status }, dismissed] = await Promise.all([
          Notifications.getPermissionsAsync(),
          StorageService.getItem('notification_prompt_dismissed_v1'),
        ]);
        if (
          !cancelled &&
          status !== 'granted' &&
          dismissed !== 'true'
        ) {
          setShowNotificationPrompt(true);
        }
      } catch {
        // Non-fatal
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authStatus]);

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
                // 1. Update local spaced-repetition state (AsyncStorage)
                await SpacedRepetitionService.recordFeedback(tidbitId, spacedRepAction);
                console.log('[NOTIFICATION_ACTION] Local feedback recorded');

                // 2. Sync to Supabase so it counts toward cloud stats + Same-Boat
                await syncNotificationFeedbackToCloud(tidbitId, spacedRepAction);
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
          
          // Check for content updates when app comes to foreground
          ContentService.checkVersion().then(hasUpdate => {
            if (hasUpdate) {
              console.log('[APP] New content version detected on foreground, auto-refreshing...');
              ContentService.fetchFromServer().then(success => {
                if (success) {
                  console.log('[APP] Content auto-refreshed on foreground');
                }
              });
            }
          }).catch(err => {
            console.warn('[APP] Error checking version on foreground:', err);
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

  // Listen for DeviceEventEmitter 'showTidbitNow' from HomeScreen's "Get Tidbit Now" button
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('showTidbitNow', (tidbit) => {
      setCurrentTidbit(tidbit);
      setShowTidbit(true);
    });
    return () => sub.remove();
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
  if (isLoading || isOnboardingComplete === null || authStatus === null) {
    return (
      <SafeAreaProvider>
        <LoadingScreen />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    );
  }

  // Pick the active stack based on auth + profile state.
  // Order: unauthenticated → welcome+auth, needs_profile → profile only,
  // needs_onboarding → classes/frequency/permissions, else → main app.
  let activeStack;
  if (authStatus === 'unauthenticated') {
    activeStack = <UnauthStack />;
  } else if (authStatus === 'needs_profile') {
    activeStack = <FullSetupStack startAt="profile" />;
  } else if (authStatus === 'needs_onboarding') {
    activeStack = <FullSetupStack startAt="setup" />;
  } else {
    activeStack = (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="Tidbit"
          options={{ presentation: 'transparentModal', headerShown: false }}
        >
          {() => null}
        </Stack.Screen>
        <Stack.Screen name="StudySession" component={StudySessionScreen} />
        <Stack.Screen name="CategoryProgress" component={CategoryProgressScreen} />
        <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} />
        <Stack.Screen name="MyClasses" component={MyClassesScreen} />
        <Stack.Screen name="Feed" component={FeedScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Group" component={GroupScreen} />
        <Stack.Screen name="GroupDeckStudy" component={GroupDeckStudyScreen} options={{ headerShown: false }} />
        <Stack.Screen name="GroupDeckStudySummary" component={GroupDeckStudySummaryScreen} options={{ headerShown: false }} />
        <Stack.Screen name="MyDecks" component={MyDecksScreen} />
        <Stack.Screen name="DeckEditor" component={DeckEditorScreen} />
        <Stack.Screen name="CardEditor" component={CardEditorScreen} />
        <Stack.Screen name="LearnModePicker" component={LearnModePickerScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Quiz" component={QuizScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Recall" component={RecallScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Match" component={MatchScreen} options={{ headerShown: false }} />
        <Stack.Screen name="LearnSummary" component={LearnSummaryScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Paywall" component={PaywallScreen} options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="AIGeneration" component={AIGenerationScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SnapPage" component={SnapPageScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ThemePicker" component={ThemePickerScreen} options={{ headerShown: false }} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    );
  }

  return (
    <ThemeProvider>
    <SafeAreaProvider>
      <ThemedNavigationContainer navRef={navigationRef}>
        {activeStack}
        {showTidbit && currentTidbit && (
          <TidbitModal
            tidbit={currentTidbit}
            onDismiss={handleDismissTidbit}
            onNextTidbit={handleNextTidbit}
          />
        )}
        <Modal
          visible={showNotificationPrompt}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setShowNotificationPrompt(false)}
        >
          <PermissionRequestScreen
            returningUser
            onDismiss={() => setShowNotificationPrompt(false)}
          />
        </Modal>
      </ThemedNavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
    </ThemeProvider>
  );
}

