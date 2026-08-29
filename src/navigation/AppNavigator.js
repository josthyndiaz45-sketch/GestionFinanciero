import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeContext';
import { useAuth } from '../providers/AuthContext';
import { View, ActivityIndicator } from 'react-native';

import LoginScreen from '../screens/auth/LoginScreen';
import HomeScreen from '../screens/home/HomeScreen';
import StatisticsScreen from '../screens/statistics/StatisticsScreen';
import TransactionsScreen from '../screens/transactions/TransactionsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import TransactionFormScreen from '../screens/transactions/TransactionFormScreen';
import SavingGoalsScreen from '../screens/savingGoals/SavingGoalsScreen';
import BudgetsScreen from '../screens/budgets/BudgetsScreen';
import RemindersScreen from '../screens/reminders/RemindersScreen';
import CategoriesScreen from '../screens/categories/CategoriesScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function HomeStack() {
  const { theme } = useTheme();
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: theme.colors.card, elevation: 0, shadowOpacity: 0 }, headerTintColor: theme.colors.text }}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Inicio' }} />
      <Stack.Screen name="TransactionForm" component={TransactionFormScreen} options={{ title: 'Movimiento' }} />
    </Stack.Navigator>
  );
}

function StatsStack() {
  const { theme } = useTheme();
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: theme.colors.card, elevation: 0, shadowOpacity: 0 }, headerTintColor: theme.colors.text }}>
      <Stack.Screen name="StatsMain" component={StatisticsScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function TransactionsStack() {
  const { theme } = useTheme();
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: theme.colors.card, elevation: 0, shadowOpacity: 0 }, headerTintColor: theme.colors.text }}>
      <Stack.Screen name="TransactionsMain" component={TransactionsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="TransactionForm" component={TransactionFormScreen} options={{ title: 'Movimiento' }} />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  const { theme } = useTheme();
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: theme.colors.card, elevation: 0, shadowOpacity: 0 }, headerTintColor: theme.colors.text }}>
      <Stack.Screen name="SettingsMain" component={SettingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SavingGoals" component={SavingGoalsScreen} options={{ title: 'Metas de Ahorro' }} />
      <Stack.Screen name="Budgets" component={BudgetsScreen} options={{ title: 'Presupuestos' }} />
      <Stack.Screen name="Reminders" component={RemindersScreen} options={{ title: 'Recordatorios' }} />
      <Stack.Screen name="Categories" component={CategoriesScreen} options={{ title: 'Categorías' }} />
    </Stack.Navigator>
  );
}

function TabNavigator() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Inicio') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Estadísticas') iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          else if (route.name === 'Movimientos') iconName = focused ? 'list' : 'list-outline';
          else if (route.name === 'Configuración') iconName = focused ? 'settings' : 'settings-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border, height: 60, paddingBottom: 8 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      })}
    >
      <Tab.Screen name="Inicio" component={HomeStack} />
      <Tab.Screen name="Estadísticas" component={StatsStack} />
      <Tab.Screen name="Movimientos" component={TransactionsStack} />
      <Tab.Screen name="Configuración" component={SettingsStack} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <TabNavigator /> : <AuthStack />}
    </NavigationContainer>
  );
}

function AuthStack() {
  const { theme } = useTheme();
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: theme.colors.card, elevation: 0, shadowOpacity: 0 }, headerTintColor: theme.colors.text }}>
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
