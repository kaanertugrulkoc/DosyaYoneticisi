import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  LayoutGrid,
  FolderOpen,
  Settings as SettingsIcon,
  Fingerprint,
  FileEdit
} from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ExplorerScreen from './src/screens/ExplorerScreen';
import GalleryScreen from './src/screens/GalleryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import DuplicateFinderScreen from './src/screens/DuplicateFinderScreen';
import NotesScreen from './src/screens/NotesScreen';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
// FavoritesProvider removed as per user request to remove Favorites feature

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Stack Wrappers
const FileManagerStack = () => {
  const { theme } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: theme?.colors?.background || '#f8fafc' },
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
        cardStyle: { backgroundColor: theme?.colors?.background || '#f8fafc' },
      }}
    >
      <Stack.Screen name="GalleryMain" component={GalleryScreen} />
    </Stack.Navigator>
  );
};

const NotesStack = () => {
  const { theme } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: theme?.colors?.background || '#f8fafc' },
      }}
    >
      <Stack.Screen name="NotesMain" component={NotesScreen} />
    </Stack.Navigator>
  );
};

const SettingsStack = () => {
  const { theme } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: theme?.colors?.background || '#f8fafc' },
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
      <View style={[styles.center, { backgroundColor: theme?.colors?.background || '#f8fafc' }]}>
        <ActivityIndicator size="large" color={theme?.colors?.primary || '#6366f1'} />
      </View>
    );
  }

  if (!isAuthenticated && isBiometricEnabled) {
    return (
      <View style={[styles.center, { backgroundColor: theme?.colors?.background || '#f8fafc' }]}>
        <Fingerprint size={80} color={theme?.colors?.primary || '#6366f1'} />
        <Text style={[styles.lockText, { color: theme?.colors?.text || '#1e293b' }]}>Uygulama Kilitli</Text>
        <TouchableOpacity
          style={[styles.authButton, { backgroundColor: theme?.colors?.primary || '#6366f1' }]}
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
        tabBarActiveTintColor: theme?.colors?.primary || '#6366f1',
        tabBarInactiveTintColor: theme?.colors?.textSecondary || '#64748b',
        tabBarStyle: {
          backgroundColor: theme?.colors?.card || '#ffffff',
          borderTopWidth: 1,
          borderTopColor: theme?.colors?.border || '#e2e8f0',
          height: Platform.OS === 'ios' ? 88 : 65,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 10,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          marginTop: -5,
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
        name="Notes"
        component={NotesStack}
        options={{
          tabBarLabel: 'Notlar',
          tabBarIcon: ({ color, size }) => <FileEdit size={size} color={color} />,
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
          <NavigationContainer>
            <MainApp />
          </NavigationContainer>
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
