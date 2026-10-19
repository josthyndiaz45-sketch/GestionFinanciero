import React, { useRef, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeContext';
import { useAuth } from '../providers/AuthContext';
import { View, Text, ActivityIndicator, Animated, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import LoansScreen from '../screens/loans/LoansScreen';
import ScheduleScreen from '../screens/schedule/ScheduleScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function HomeStack() {
  const { theme } = useTheme();
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: theme.colors.card, elevation: 0, shadowOpacity: 0 }, headerTintColor: theme.colors.text }}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
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
      <Stack.Screen name="Loans" component={LoansScreen} options={{ title: 'Préstamos y deudas' }} />
      <Stack.Screen name="Schedule" component={ScheduleScreen} options={{ title: 'Horarios' }} />
    </Stack.Navigator>
  );
}

const TAB_META = {
  Inicio: { on: 'home', off: 'home-outline' },
  Estadísticas: { on: 'stats-chart', off: 'stats-chart-outline' },
  Movimientos: { on: 'swap-horizontal', off: 'swap-horizontal-outline' },
  Configuración: { on: 'settings', off: 'settings-outline' },
};

function TabItem({ route, focused, onPress, theme }) {
  const progress = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const meta = TAB_META[route.name] || { on: 'ellipse', off: 'ellipse-outline' };

  useEffect(() => {
    Animated.spring(progress, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      friction: 6,
      tension: 140,
    }).start();
  }, [focused, progress]);

  const iconName = focused ? meta.on : meta.off;
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 20] });
  const pillOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -2] });

  const activeColor = theme.colors.primary;
  const inactiveColor = theme.colors.textSecondary;
  const color = focused ? activeColor : inactiveColor;

  return (
    <Pressable style={styles.tabItem} onPress={onPress} android_ripple={{ color: theme.colors.primarySoft, borderless: true }}>
      <Animated.View style={[styles.tabIconWrap, { backgroundColor: theme.colors.primarySoft, opacity: pillOpacity }]} />
      <Animated.View style={{ transform: [{ translateY }, { scale }] }}>
        <Ionicons name={iconName} size={23} color={color} />
      </Animated.View>
      <Animated.Text style={[styles.tabLabel, { color }]} numberOfLines={1}>{route.name}</Animated.Text>
      <Animated.View style={[styles.tabBar, { width: barWidth, backgroundColor: activeColor }]} />
    </Pressable>
  );
}

function TabNavigator() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      tabBar={(props) => <CustomTabBar {...props} theme={theme} />}
    >
      <Tab.Screen name="Inicio" component={HomeStack} />
      <Tab.Screen name="Estadísticas" component={StatsStack} />
      <Tab.Screen name="Movimientos" component={TransactionsStack} />
      <Tab.Screen name="Configuración" component={SettingsStack} />
    </Tab.Navigator>
  );
}

function CustomTabBar({ state, descriptors, navigation, theme }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.tabBarContainer,
        { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border, paddingBottom: 10 + insets.bottom },
      ]}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        return (
          <TabItem key={route.key} route={route} focused={focused} onPress={onPress} theme={theme} />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 18,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabIconWrap: { position: 'absolute', top: -2, width: 42, height: 30, borderRadius: 15 },
  tabLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.1, marginTop: 1 },
  tabBar: { height: 3, borderRadius: 2, marginTop: 3 },
});

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
