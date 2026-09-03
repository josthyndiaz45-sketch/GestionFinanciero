import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../providers/ThemeContext';
import { useAuth } from '../../providers/AuthContext';
import { useBalance } from '../../providers/BalanceContext';
import { useTransactions } from '../../providers/TransactionContext';
import { useBudgets } from '../../providers/BudgetContext';
import { useSavingGoals } from '../../providers/SavingGoalContext';
import { useReminders } from '../../providers/ReminderContext';
import { formatCurrency } from '../../utils/formatters';
import TransactionTile from '../../components/TransactionTile';

function daysUntilDay(dayOfMonth) {
  const now = new Date();
  const today = now.getDate();
  let targetDate;
  if (today <= dayOfMonth) {
    targetDate = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
  } else {
    targetDate = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
  }
  now.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);
  return Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
}

function dueColor(days) {
  if (days <= 0) return '#F43F5E';
  if (days <= 3) return '#F59E0B';
  return '#10B981';
}

function dueLabel(days) {
  if (days < 0) return 'Venció';
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  return `${days} días`;
}

function byDateDesc(a, b) {
  const da = new Date(a.date).getTime();
  const db = new Date(b.date).getTime();
  if (da !== db) return db - da;
  const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (ca !== cb) return cb - ca;
  return String(b.id).localeCompare(String(a.id));
}

export default function HomeScreen({ navigation }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { initialBalance } = useBalance();
  const { transactions, loadTransactions } = useTransactions();
  const { budgets, loadBudgets } = useBudgets();
  const { goals, loadGoals } = useSavingGoals();
  const { reminders, loadReminders } = useReminders();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadTransactions();
      loadBudgets();
      loadGoals();
      loadReminders();
    }
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadTransactions(), loadBudgets(), loadGoals(), loadReminders()]);
    setRefreshing(false);
  };

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const balance = initialBalance + totalIncome - totalExpense;
  const recentTx = [...transactions].sort(byDateDesc).slice(0, 5);

  // Upcoming unpaid reminders within 7 days
  const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const upcomingReminders = reminders
    .filter((r) => {
      const paidMonths = r.paidMonths || [];
      if (paidMonths.includes(currentMonthKey)) return false;
      const days = daysUntilDay(r.dayOfMonth);
      return days <= 7;
    })
    .sort((a, b) => a.dayOfMonth - b.dayOfMonth)
    .slice(0, 3);

  // Budget warnings
  const currentMonth = new Date().toISOString().slice(0, 7);
  const budgetWarnings = budgets
    .filter((b) => b.month === currentMonth)
    .map((b) => {
      const spent = transactions
        .filter((t) => t.type === 'expense' && t.category === b.category && new Date(t.date || t.createdAt).toISOString().slice(0, 7) === currentMonth)
        .reduce((sum, t) => sum + t.amount, 0);
      const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
      const remaining = Math.max(0, b.amount - spent);
      return { ...b, spent, pct, remaining };
    })
    .filter((b) => b.pct >= 75)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);

  // Saving goals with estimated time
  const goalSummaries = goals.map((g) => {
    const saved = transactions
      .filter((t) => t.type === 'expense' && t.saving_goal_id === g.id)
      .reduce((sum, t) => sum + t.amount, 0);
    const target = g.target_amount || g.targetAmount || 0;
    const pct = target > 0 ? (saved / target) * 100 : 0;
    // Estimate months: avg savings per month based on last 3 months
    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(now.getMonth() - 3);
    const recentSavings = transactions
      .filter((t) => t.type === 'expense' && t.saving_goal_id === g.id && new Date(t.date || t.createdAt) >= threeMonthsAgo)
      .reduce((sum, t) => sum + t.amount, 0);
    const avgPerMonth = recentSavings / 3;
    const remaining = Math.max(0, target - saved);
    const monthsLeft = avgPerMonth > 0 ? Math.ceil(remaining / avgPerMonth) : null;
    return { ...g, saved, target, pct, monthsLeft, remaining };
  });

  const budgetColor = (pct) => {
    if (pct > 80) return '#F43F5E';
    if (pct > 50) return '#F59E0B';
    return '#10B981';
  };

  const hasAlerts = upcomingReminders.length > 0 || budgetWarnings.length > 0 || goalSummaries.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Inicio</Text>

        <View style={[styles.balanceCard, { backgroundColor: theme.colors.primary }]}>
          <View style={styles.balanceTop}>
            <Text style={styles.balanceLabel}>Saldo disponible</Text>
            <Ionicons name="wallet-outline" size={20} color="rgba(255,255,255,0.7)" />
          </View>
          <Text style={styles.balance}>{formatCurrency(balance)}</Text>
          {initialBalance > 0 && (
            <Text style={styles.initialLabel}>
              Incluye saldo inicial: {formatCurrency(initialBalance)}
            </Text>
          )}
        </View>

        <View style={styles.cardsRow}>
          <View style={[styles.card, { backgroundColor: '#ECFDF5', borderColor: '#D1FAE5' }]}>
            <View style={styles.cardIcon}>
              <Ionicons name="arrow-down" size={18} color="#10B981" />
            </View>
            <Text style={[styles.cardLabel, { color: '#065F46' }]}>Ingresos</Text>
            <Text style={[styles.cardAmount, { color: '#065F46' }]}>{formatCurrency(totalIncome)}</Text>
          </View>
          <View style={[styles.card, { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' }]}>
            <View style={styles.cardIcon}>
              <Ionicons name="arrow-up" size={18} color="#F43F5E" />
            </View>
            <Text style={[styles.cardLabel, { color: '#9F1239' }]}>Gastos</Text>
            <Text style={[styles.cardAmount, { color: '#9F1239' }]}>{formatCurrency(totalExpense)}</Text>
          </View>
        </View>

        {/* Budget Warnings */}
        {budgetWarnings.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Ionicons name="warning" size={18} color="#F59E0B" />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}> Presupuesto alerta</Text>
            </View>
            {budgetWarnings.map((b) => (
              <View key={b.id} style={[styles.alertCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <View style={styles.alertHeader}>
                  <Text style={[styles.alertName, { color: theme.colors.text }]}>{b.category}</Text>
                  <Text style={[styles.alertPct, { color: budgetColor(b.pct) }]}>{Math.round(b.pct)}%</Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: theme.colors.surface }]}>
                  <View style={[styles.progressFill, { width: `${Math.min(b.pct, 100)}%`, backgroundColor: budgetColor(b.pct) }]} />
                </View>
                <Text style={[styles.alertDetail, { color: theme.colors.textSecondary }]}>
                  {formatCurrency(b.spent)} / {formatCurrency(b.amount)} · Restan {formatCurrency(b.remaining)}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* Saving Goals with Estimation */}
        {goalSummaries.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Ionicons name="flag" size={18} color="#3B82F6" />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}> Metas de ahorro</Text>
            </View>
            {goalSummaries.map((g) => (
              <View key={g.id} style={[styles.alertCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <View style={styles.alertHeader}>
                  <Text style={[styles.alertName, { color: theme.colors.text }]}>{g.name}</Text>
                  <Text style={[styles.alertPct, { color: g.pct >= 100 ? '#10B981' : '#3B82F6' }]}>{Math.round(Math.min(g.pct, 100))}%</Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: theme.colors.surface }]}>
                  <View style={[styles.progressFill, { width: `${Math.min(g.pct, 100)}%`, backgroundColor: g.pct >= 100 ? '#10B981' : '#3B82F6' }]} />
                </View>
                <Text style={[styles.alertDetail, { color: theme.colors.textSecondary }]}>
                  {formatCurrency(g.saved)} / {formatCurrency(g.target)}
                  {g.monthsLeft !== null ? ` · ~${g.monthsLeft} meses restantes` : ''}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* Upcoming Reminders */}
        {upcomingReminders.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Ionicons name="notifications" size={18} color="#F59E0B" />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}> Próximos vencimientos</Text>
            </View>
            {upcomingReminders.map((r) => {
              const days = daysUntilDay(r.dayOfMonth);
              const dColor = dueColor(days);
              return (
                <View key={r.id} style={[styles.alertCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                  <View style={styles.alertHeader}>
                    <Text style={[styles.alertName, { color: theme.colors.text }]}>{r.name}</Text>
                    <Text style={[styles.alertPct, { color: dColor }]}>{dueLabel(days)}</Text>
                  </View>
                  <Text style={[styles.alertDetail, { color: theme.colors.textSecondary }]}>
                    {formatCurrency(r.amount)}{r.note ? ` · ${r.note}` : ''}
                  </Text>
                </View>
              );
            })}
          </>
        )}

        <View style={[styles.sectionHeader, { marginTop: hasAlerts ? 8 : 0 }]}>
          <Ionicons name="swap-horizontal" size={18} color={theme.colors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}> Últimos movimientos</Text>
        </View>

        {recentTx.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No hay movimientos aún</Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>Toca + para agregar uno</Text>
          </View>
        ) : (
          recentTx.map((tx) => (
            <TransactionTile key={tx.id} transaction={tx} onPress={() => navigation.navigate('TransactionForm', { transaction: tx })} />
          ))
        )}

        {recentTx.length > 0 && (
          <TouchableOpacity style={[styles.viewAllBtn, { borderColor: theme.colors.primary }]} onPress={() => navigation.navigate('Movimientos')}>
            <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>Ver todos los movimientos</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <TouchableOpacity style={[styles.fab, { backgroundColor: theme.colors.primary }]} onPress={() => navigation.navigate('TransactionForm', {})}>
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 100 },
  title: { fontSize: 28, fontWeight: 'bold', marginTop: 20, marginBottom: 20 },
  balanceCard: { padding: 24, borderRadius: 24, marginBottom: 16, backgroundColor: '#2563EB', shadowColor: '#2563EB', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8 },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  balance: { fontSize: 38, fontWeight: 'bold', color: '#FFF', marginTop: 8, letterSpacing: 0.5 },
  initialLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 6 },
  cardsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  card: { flex: 1, padding: 16, borderRadius: 18, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' },
  cardLabel: { fontSize: 13, marginTop: 10, fontWeight: '600' },
  cardAmount: { fontSize: 19, fontWeight: 'bold', marginTop: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  alertCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  alertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  alertName: { fontSize: 15, fontWeight: '600' },
  alertPct: { fontSize: 14, fontWeight: 'bold' },
  alertDetail: { fontSize: 12, marginTop: 2 },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', borderRadius: 3 },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, marginTop: 12, fontWeight: '500' },
  emptySubtext: { fontSize: 13, marginTop: 4 },
  viewAllBtn: { borderWidth: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 8 },
  viewAllText: { fontWeight: '600', fontSize: 14 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2563EB', elevation: 8, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 },
});
