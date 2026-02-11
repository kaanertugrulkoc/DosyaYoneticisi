import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ExplorerScreen from './src/screens/ExplorerScreen';
import { theme } from './src/theme/theme';

const Stack = createStackNavigator();

const App = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
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
      </NavigationContainer>
    </GestureHandlerRootView>
  );
};

export default App;
