import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  LayoutGrid,
  FolderOpen,
  Heart,
  Settings as SettingsIcon,
  Fingerprint
} from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ExplorerScreen from './src/screens/ExplorerScreen';
import GalleryScreen from './src/screens/GalleryScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import DuplicateFinderScreen from './src/screens/DuplicateFinderScreen';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { FavoritesProvider } from './src/context/FavoritesContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Stack Wrappers
const FileManagerStack = () => {
  const { theme } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="Explorer" component={ExplorerScreen} />
    </Stack.Navigator>
  );
};

const GalleryStack = () => {
  const { theme } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="GalleryMain" component={GalleryScreen} />
    </Stack.Navigator>
  );
};

const FavoritesStack = () => {
  const { theme } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="FavoritesMain" component={FavoritesScreen} />
    </Stack.Navigator>
  );
};

const SettingsStack = () => {
  const { theme } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="SettingsMain" component={SettingsScreen} />
      <Stack.Screen name="DuplicateFinder" component={DuplicateFinderScreen} />
    </Stack.Navigator>
  );
};

const MainApp = () => {
  const { theme, isDarkMode } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkBiometricSettings();
  }, []);

  const checkBiometricSettings = async () => {
    try {
      const enabled = await AsyncStorage.getItem('biometric-enabled');
      if (enabled === 'true') {
        setIsBiometricEnabled(true);
        handleAuthentication();
      } else {
        setIsAuthenticated(true);
      }
    } catch (e) {
      setIsAuthenticated(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthentication = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      setIsAuthenticated(true);
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Uygulamaya erişmek için kimliğinizi doğrulayın',
      fallbackLabel: 'Şifre kullan',
    });

    if (result.success) {
      setIsAuthenticated(true);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated && isBiometricEnabled) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Fingerprint size={80} color={theme.colors.primary} />
        <Text style={[styles.lockText, { color: theme.colors.text }]}>Uygulama Kilitli</Text>
        <TouchableOpacity
          style={[styles.authButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleAuthentication}
        >
          <Text style={styles.authButtonText}>Kilidi Aç</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Gallery"
        component={GalleryStack}
        options={{
          tabBarLabel: 'Galeri',
          tabBarIcon: ({ color, size }) => <LayoutGrid size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="FileManager"
        component={FileManagerStack}
        options={{
          tabBarLabel: 'Dosyalar',
          tabBarIcon: ({ color, size }) => <FolderOpen size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesStack}
        options={{
          tabBarLabel: 'Favoriler',
          tabBarIcon: ({ color, size }) => <Heart size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        options={{
          tabBarLabel: 'Ayarlar',
          tabBarIcon: ({ color, size }) => <SettingsIcon size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

const App = () => {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <FavoritesProvider>
            <NavigationContainer>
              <MainApp />
            </NavigationContainer>
          </FavoritesProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  lockText: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 30,
  },
  authButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  }
});

export default App;
