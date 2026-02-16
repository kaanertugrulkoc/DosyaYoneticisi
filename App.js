import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Image as ImageIconLucide, FolderOpen } from 'lucide-react-native';
import ExplorerScreen from './src/screens/ExplorerScreen';
import GalleryScreen from './src/screens/GalleryScreen';
import { theme } from './src/theme/theme';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// File Manager Stack
const FileManagerStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="Explorer"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: theme.colors.background },
        animationEnabled: true,
      }}
    >
      <Stack.Screen
        name="Explorer"
        component={ExplorerScreen}
        options={{ title: 'Dosyalar' }}
      />
    </Stack.Navigator>
  );
};

// Gallery Stack
const GalleryStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: theme.colors.background },
        animationEnabled: true,
      }}
    >
      <Stack.Screen
        name="GalleryMain"
        component={GalleryScreen}
        options={{ title: 'Galeri' }}
      />
    </Stack.Navigator>
  );
};

const App = () => {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: '#6366f1',
              tabBarInactiveTintColor: '#94a3b8',
              tabBarStyle: {
                backgroundColor: 'white',
                borderTopWidth: 1,
                borderTopColor: '#e2e8f0',
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
                tabBarIcon: ({ color, size }) => (
                  <ImageIconLucide size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="FileManager"
              component={FileManagerStack}
              options={{
                tabBarLabel: 'Dosya Yöneticisi',
                tabBarIcon: ({ color, size }) => (
                  <FolderOpen size={size} color={color} />
                ),
              }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
};

export default App;
