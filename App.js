import React, { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, useTheme } from './src/providers/ThemeContext';
import { AuthProvider } from './src/providers/AuthContext';
import { BalanceProvider } from './src/providers/BalanceContext';
import { TransactionProvider } from './src/providers/TransactionContext';
import { SavingGoalProvider } from './src/providers/SavingGoalContext';
import { BudgetProvider } from './src/providers/BudgetContext';
import { ReminderProvider } from './src/providers/ReminderContext';
import { TagProvider } from './src/providers/TagContext';
import { setupNotifications } from './src/services/notificationService';
import AppNavigator from './src/navigation/AppNavigator';

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { isDark } = useTheme();
  const [appReady, setAppReady] = React.useState(false);

  useEffect(() => {
    setupNotifications().catch(() => {});
    setAppReady(true);
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appReady) {
      await SplashScreen.hideAsync();
    }
  }, [appReady]);

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
    </View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BalanceProvider>
          <TransactionProvider>
            <SavingGoalProvider>
              <BudgetProvider>
                <ReminderProvider>
                  <TagProvider>
                    <AppContent />
                  </TagProvider>
                </ReminderProvider>
              </BudgetProvider>
            </SavingGoalProvider>
          </TransactionProvider>
        </BalanceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
