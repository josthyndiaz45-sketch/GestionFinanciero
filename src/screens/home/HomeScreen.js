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
import { useLoans } from '../../providers/LoanContext';
import { useReminders } from '../../providers/ReminderContext';
import { useCategories } from '../../providers/CategoryContext';
import { formatCurrency } from '../../utils/formatters';
import { loansNetEffect, loansTotals, isLoanSettled } from '../../models/Loan';
import TransactionTile from '../../components/TransactionTile';
import { Gradient } from '../../components/Gradient';
import { FadeInView, PopInView, AnimatedBar, PressableScale, AnimatedIconButton, useFocusKey } from '../../components/Animated';

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

function loanDaysUntil(iso) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(iso);
  due.setHours(0, 0, 0, 0);
  return Math.round((due - now) / (1000 * 60 * 60 * 24));
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
  const { loans, loadLoans } = useLoans();
  const { reminders, loadReminders } = useReminders();
  const { getCategories } = useCategories();
  const [refreshing, setRefreshing] = useState(false);
  const focusKey = useFocusKey();

  useEffect(() => {
    if (user) {
      loadTransactions();
      loadBudgets();
      loadGoals();
      loadLoans();
      loadReminders();
    }
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadTransactions(), loadBudgets(), loadGoals(), loadLoans(), loadReminders()]);
    setRefreshing(false);
  };

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const loanTotals = loansTotals(loans);
  const balance = initialBalance + totalIncome - totalExpense + loansNetEffect(loans);
  const recentTx = [...transactions].sort(byDateDesc).slice(0, 5);

  const monthKey = new Date().toISOString().slice(0, 7);
  const monthTx = transactions.filter((t) => new Date(t.date || t.createdAt).toISOString().slice(0, 7) === monthKey);
  const monthIncome = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthExpense = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const monthNet = monthIncome - monthExpense;
  const savingsRate = monthIncome > 0 ? Math.round((monthNet / monthIncome) * 100) : 0;

  const expenseByCategory = monthTx
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});
  const topCategories = Object.entries(expenseByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, amount]) => {
      const cat = getCategories('expense').find((c) => c.name === name) || { label: name, color: theme.colors.textSecondary, icon: 'pricetag-outline' };
      return { name, amount, ...cat };
    });
  const topCategoryMax = topCategories.length > 0 ? topCategories[0].amount : 1;

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
    if (pct > 80) return theme.colors.expense;
    if (pct > 50) return theme.colors.warning;
    return theme.colors.income;
  };

  const SectionHeader = ({ icon, iconColor, iconBg, title }) => (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={15} color={iconColor} />
      </View>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
    </View>
  );

  const ProgressBar = ({ pct, color }) => (
    <View style={[styles.progressBar, { backgroundColor: theme.colors.surface }]}>
      <View style={[styles.progressFill, { width: `${Math.min(Math.max(pct, 0), 100)}%`, backgroundColor: color }]} />
    </View>
  );

  const upcomingLoans = loans
    .filter((l) => !isLoanSettled(l) && l.dueDate)
    .map((l) => ({ ...l, days: loanDaysUntil(l.dueDate) }))
    .filter((l) => l.days <= 7)
    .sort((a, b) => a.days - b.days)
    .slice(0, 3);

  const hasLoans = loans.length > 0;
  const hasAlerts = upcomingReminders.length > 0 || budgetWarnings.length > 0 || goalSummaries.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView key={focusKey} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}>
        <FadeInView delay={0}>
          <View style={styles.header}>
            <View>
              <Text style={[styles.greeting, { color: theme.colors.textSecondary }]}>Hola de nuevo</Text>
              <Text style={[styles.title, { color: theme.colors.text }]}>Inicio</Text>
            </View>
            <TouchableOpacity
              style={[styles.headerAvatar, { backgroundColor: theme.colors.primarySoft }]}
              onPress={() => navigation.navigate('Configuración')}
              activeOpacity={0.7}
            >
              <Text style={[styles.headerAvatarText, { color: theme.colors.primary }]}>
                {(user?.email?.charAt(0) || '?').toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>
        </FadeInView>

        <PopInView delay={80} style={[styles.balanceCardWrap, theme.shadow.hero]}>
          <Gradient colors={[theme.colors.gradientStart, theme.colors.gradientEnd]} style={styles.balanceCard}>
            <View style={styles.balanceGlow} />
            <View style={styles.balanceGlow2} />
            <View style={styles.balanceTop}>
              <Text style={styles.balanceLabel}>Saldo disponible</Text>
              <View style={styles.balanceIconBadge}>
                <Ionicons name="wallet-outline" size={18} color="#FFFFFF" />
              </View>
            </View>
            <Text style={styles.balance}>{formatCurrency(balance)}</Text>
            <View style={styles.balanceFooter}>
              <View style={styles.balanceChip}>
                <Ionicons name="arrow-down" size={13} color="#A7F3D0" />
                <Text style={styles.balanceChipText}>{formatCurrency(totalIncome)}</Text>
              </View>
              <View style={styles.balanceChip}>
                <Ionicons name="arrow-up" size={13} color="#FECDD3" />
                <Text style={styles.balanceChipText}>{formatCurrency(totalExpense)}</Text>
              </View>
            </View>
            {initialBalance > 0 && (
              <Text style={styles.initialLabel}>
                Incluye saldo inicial: {formatCurrency(initialBalance)}
              </Text>
            )}
          </Gradient>
        </PopInView>

        <FadeInView delay={160}>
          <Text style={[styles.quickTitle, { color: theme.colors.textSecondary }]}>Accesos rápidos</Text>
          <View style={styles.quickRow}>
            {[
              { icon: 'add-circle-outline', label: 'Agregar', color: theme.colors.primary, bg: theme.colors.primarySoft, onPress: () => navigation.navigate('TransactionForm', {}) },
              { icon: 'stats-chart-outline', label: 'Estadísticas', color: theme.colors.info, bg: theme.colors.infoSoft, onPress: () => navigation.navigate('Estadísticas') },
              { icon: 'flag-outline', label: 'Metas', color: theme.colors.accent, bg: theme.colors.accentSoft, onPress: () => navigation.navigate('Configuración', { screen: 'SavingGoals' }) },
              { icon: 'wallet-outline', label: 'Presupuestos', color: theme.colors.warning, bg: theme.colors.warningSoft, onPress: () => navigation.navigate('Configuración', { screen: 'Budgets' }) },
            ].map((q) => (
              <PressableScale key={q.label} containerStyle={styles.quickActionWrap} style={[styles.quickAction, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, theme.shadow.soft]} onPress={q.onPress} scaleTo={0.93}>
                <View style={[styles.quickActionIcon, { backgroundColor: q.bg }]}>
                  <Ionicons name={q.icon} size={20} color={q.color} />
                </View>
                <Text style={[styles.quickActionLabel, { color: theme.colors.text }]} numberOfLines={1}>{q.label}</Text>
              </PressableScale>
            ))}
          </View>
        </FadeInView>

        <FadeInView delay={220}>
          <View style={styles.cardsRow}>
            <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, theme.shadow.soft]}>
              <View style={[styles.cardIcon, { backgroundColor: theme.colors.incomeSoft }]}>
                <Ionicons name="trending-up" size={18} color={theme.colors.income} />
              </View>
              <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>Ingresos</Text>
              <Text style={[styles.cardAmount, { color: theme.colors.incomeText }]} numberOfLines={1}>{formatCurrency(totalIncome)}</Text>
            </View>
            <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, theme.shadow.soft]}>
              <View style={[styles.cardIcon, { backgroundColor: theme.colors.expenseSoft }]}>
                <Ionicons name="trending-down" size={18} color={theme.colors.expense} />
              </View>
              <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>Gastos</Text>
              <Text style={[styles.cardAmount, { color: theme.colors.expenseText }]} numberOfLines={1}>{formatCurrency(totalExpense)}</Text>
            </View>
          </View>
        </FadeInView>

        {/* Resumen del mes */}
        <FadeInView delay={280}>
          <SectionHeader icon="calendar-outline" iconColor={theme.colors.primary} iconBg={theme.colors.primarySoft} title="Resumen del mes" />
          <View style={[styles.monthCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, theme.shadow.soft]}>
            <View style={styles.monthStatsRow}>
              <View style={styles.monthStat}>
                <Text style={[styles.monthStatLabel, { color: theme.colors.textSecondary }]}>Ingresos</Text>
                <Text style={[styles.monthStatValue, { color: theme.colors.incomeText }]} numberOfLines={1}>{formatCurrency(monthIncome)}</Text>
              </View>
              <View style={[styles.monthDivider, { backgroundColor: theme.colors.border }]} />
              <View style={styles.monthStat}>
                <Text style={[styles.monthStatLabel, { color: theme.colors.textSecondary }]}>Gastos</Text>
                <Text style={[styles.monthStatValue, { color: theme.colors.expenseText }]} numberOfLines={1}>{formatCurrency(monthExpense)}</Text>
              </View>
              <View style={[styles.monthDivider, { backgroundColor: theme.colors.border }]} />
              <View style={styles.monthStat}>
                <Text style={[styles.monthStatLabel, { color: theme.colors.textSecondary }]}>Balance</Text>
                <Text style={[styles.monthStatValue, { color: monthNet >= 0 ? theme.colors.incomeText : theme.colors.expenseText }]} numberOfLines={1}>{formatCurrency(monthNet)}</Text>
              </View>
            </View>
            <View style={styles.savingsRow}>
              <View style={styles.savingsInfo}>
                <Ionicons name="sparkles-outline" size={15} color={theme.colors.accent} />
                <Text style={[styles.savingsText, { color: theme.colors.textSecondary }]}>
                  {monthIncome > 0 ? `Estás ahorrando el ${Math.max(savingsRate, 0)}% de tus ingresos este mes` : 'Aún no registras ingresos este mes'}
                </Text>
              </View>
              <Text style={[styles.savingsValue, { color: theme.colors.accent }]}>{Math.max(savingsRate, 0)}%</Text>
            </View>
            <AnimatedBar pct={monthIncome > 0 ? (monthNet / monthIncome) * 100 : 0} color={theme.colors.accent} trackColor={theme.colors.surface} height={8} delay={400} />
          </View>
        </FadeInView>

        {/* Top categorías del mes */}
        {topCategories.length > 0 && (
          <FadeInView delay={340}>
            <SectionHeader icon="pie-chart-outline" iconColor={theme.colors.expense} iconBg={theme.colors.expenseSoft} title="Dónde más gastas" />
            <View style={[styles.topCatCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, theme.shadow.soft]}>
              {topCategories.map((c, idx) => (
                <View key={c.name} style={[styles.topCatRow, idx < topCategories.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: theme.colors.border }]}>
                  <View style={[styles.topCatIcon, { backgroundColor: (c.color || theme.colors.textSecondary) + '1A' }]}>
                    <Ionicons name={c.icon} size={17} color={c.color || theme.colors.textSecondary} />
                  </View>
                  <View style={styles.topCatInfo}>
                    <View style={styles.topCatTop}>
                      <Text style={[styles.topCatName, { color: theme.colors.text }]}>{c.label}</Text>
                      <Text style={[styles.topCatAmount, { color: theme.colors.text }]}>{formatCurrency(c.amount)}</Text>
                    </View>
                    <AnimatedBar pct={(c.amount / topCategoryMax) * 100} color={c.color || theme.colors.textSecondary} trackColor={theme.colors.surface} height={6} delay={440 + idx * 80} />
                  </View>
                </View>
              ))}
            </View>
          </FadeInView>
        )}

        {/* Budget Warnings */}
        {budgetWarnings.length > 0 && (
          <FadeInView delay={360}>
            <SectionHeader icon="warning-outline" iconColor={theme.colors.warning} iconBg={theme.colors.warningSoft} title="Presupuestos en alerta" />
            {budgetWarnings.map((b) => (
              <View key={b.id} style={[styles.alertCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, theme.shadow.soft]}>
                <View style={styles.alertHeader}>
                  <Text style={[styles.alertName, { color: theme.colors.text }]}>{b.category}</Text>
                  <Text style={[styles.alertPct, { color: budgetColor(b.pct) }]}>{Math.round(b.pct)}%</Text>
                </View>
                <ProgressBar pct={b.pct} color={budgetColor(b.pct)} />
                <Text style={[styles.alertDetail, { color: theme.colors.textSecondary }]}>
                  {formatCurrency(b.spent)} / {formatCurrency(b.amount)} · Restan {formatCurrency(b.remaining)}
                </Text>
              </View>
            ))}
          </FadeInView>
        )}

        {/* Saving Goals with Estimation */}
        {goalSummaries.length > 0 && (
          <FadeInView delay={380}>
            <SectionHeader icon="flag-outline" iconColor={theme.colors.info} iconBg={theme.colors.infoSoft} title="Metas de ahorro" />
            {goalSummaries.map((g) => {
              const color = g.pct >= 100 ? theme.colors.income : theme.colors.info;
              return (
                <View key={g.id} style={[styles.alertCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, theme.shadow.soft]}>
                  <View style={styles.alertHeader}>
                    <Text style={[styles.alertName, { color: theme.colors.text }]}>{g.name}</Text>
                    <Text style={[styles.alertPct, { color }]}>{Math.round(Math.min(g.pct, 100))}%</Text>
                  </View>
                  <ProgressBar pct={g.pct} color={color} />
                  <Text style={[styles.alertDetail, { color: theme.colors.textSecondary }]}>
                    {formatCurrency(g.saved)} / {formatCurrency(g.target)}
                    {g.monthsLeft !== null ? ` · ~${g.monthsLeft} meses restantes` : ''}
                  </Text>
                </View>
              );
            })}
          </FadeInView>
        )}

        {/* Préstamos y deudas */}
        {(hasLoans && (loanTotals.porCobrar > 0 || loanTotals.porPagar > 0 || upcomingLoans.length > 0)) ? (
          <FadeInView delay={400}>
            <SectionHeader icon="swap-horizontal-outline" iconColor={theme.colors.accent} iconBg={theme.colors.accentSoft} title="Préstamos y deudas" />
            <View style={styles.loansRow}>
              <View style={[styles.loanCard, { backgroundColor: theme.colors.incomeSoft, borderColor: theme.colors.border }, theme.shadow.soft]}>
                <View style={styles.loanCardTop}>
                  <Ionicons name="arrow-down-circle" size={16} color={theme.colors.income} />
                  <Text style={[styles.loanCardLabel, { color: theme.colors.incomeText }]}>Por cobrar</Text>
                </View>
                <Text style={[styles.loanCardAmount, { color: theme.colors.incomeText }]} numberOfLines={1}>{formatCurrency(loanTotals.porCobrar)}</Text>
              </View>
              <View style={[styles.loanCard, { backgroundColor: theme.colors.expenseSoft, borderColor: theme.colors.border }, theme.shadow.soft]}>
                <View style={styles.loanCardTop}>
                  <Ionicons name="arrow-up-circle" size={16} color={theme.colors.expense} />
                  <Text style={[styles.loanCardLabel, { color: theme.colors.expenseText }]}>Por pagar</Text>
                </View>
                <Text style={[styles.loanCardAmount, { color: theme.colors.expenseText }]} numberOfLines={1}>{formatCurrency(loanTotals.porPagar)}</Text>
              </View>
            </View>
            {upcomingLoans.map((l) => {
              const dColor = dueColor(l.days);
              const isLent = l.direction === 'lent';
              return (
                <View key={l.id} style={[styles.alertCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, theme.shadow.soft]}>
                  <View style={styles.alertHeader}>
                    <Text style={[styles.alertName, { color: theme.colors.text }]}>{l.counterparty}</Text>
                    <View style={[styles.dueChip, { backgroundColor: dColor + '1A' }]}>
                      <Text style={[styles.alertPct, { color: dColor }]}>{dueLabel(l.days)}</Text>
                    </View>
                  </View>
                  <Text style={[styles.alertDetail, { color: theme.colors.textSecondary }]}>
                    {isLent ? 'Te deben' : 'Debes'} {formatCurrency(l.amount - l.paidAmount)}
                  </Text>
                </View>
              );
            })}
            <TouchableOpacity style={[styles.viewAllBtn, { borderColor: theme.colors.primary, marginBottom: 8 }]} onPress={() => navigation.navigate('Configuración', { screen: 'Loans' })}>
              <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>Ver préstamos y deudas</Text>
              <Ionicons name="arrow-forward" size={15} color={theme.colors.primary} />
            </TouchableOpacity>
          </FadeInView>
        ) : null}

        {/* Upcoming Reminders */}
        {upcomingReminders.length > 0 && (
          <FadeInView delay={420}>
            <SectionHeader icon="notifications-outline" iconColor={theme.colors.warning} iconBg={theme.colors.warningSoft} title="Próximos vencimientos" />
            {upcomingReminders.map((r) => {
              const days = daysUntilDay(r.dayOfMonth);
              const dColor = dueColor(days);
              return (
                <View key={r.id} style={[styles.alertCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, theme.shadow.soft]}>
                  <View style={styles.alertHeader}>
                    <Text style={[styles.alertName, { color: theme.colors.text }]}>{r.name}</Text>
                    <View style={[styles.dueChip, { backgroundColor: dColor + '1A' }]}>
                      <Text style={[styles.alertPct, { color: dColor }]}>{dueLabel(days)}</Text>
                    </View>
                  </View>
                  <Text style={[styles.alertDetail, { color: theme.colors.textSecondary }]}>
                    {formatCurrency(r.amount)}{r.note ? ` · ${r.note}` : ''}
                  </Text>
                </View>
              );
            })}
          </FadeInView>
        )}

        <FadeInView delay={400}>
          <SectionHeader icon="swap-horizontal-outline" iconColor={theme.colors.primary} iconBg={theme.colors.primarySoft} title="Últimos movimientos" />

          {recentTx.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, theme.shadow.soft]}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.colors.primarySoft }]}>
                <Ionicons name="wallet-outline" size={30} color={theme.colors.primary} />
              </View>
              <Text style={[styles.emptyText, { color: theme.colors.text }]}>No hay movimientos aún</Text>
              <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>Toca el botón + para agregar uno</Text>
            </View>
          ) : (
            recentTx.map((tx, idx) => (
              <FadeInView key={tx.id} delay={440 + idx * 60}>
                <TransactionTile transaction={tx} onPress={() => navigation.navigate('TransactionForm', { transaction: tx })} />
              </FadeInView>
            ))
          )}

          {recentTx.length > 0 && (
            <TouchableOpacity style={[styles.viewAllBtn, { borderColor: theme.colors.primary }]} onPress={() => navigation.navigate('Movimientos')}>
              <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>Ver todos los movimientos</Text>
              <Ionicons name="arrow-forward" size={15} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
        </FadeInView>
      </ScrollView>

      <PopInView delay={600} from={0.6}>
        <AnimatedIconButton style={[styles.fab, { backgroundColor: theme.colors.primary }, theme.shadow.hero]} onPress={() => navigation.navigate('TransactionForm', {})}>
          <Ionicons name="add" size={30} color="#FFF" />
        </AnimatedIconButton>
      </PopInView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 110 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 20 },
  greeting: { fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  title: { fontSize: 28, fontWeight: '800', marginTop: 2, letterSpacing: -0.4 },
  headerAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  headerAvatarText: { fontSize: 18, fontWeight: '800' },
  balanceCardWrap: { borderRadius: 26, marginBottom: 20 },
  balanceCard: { padding: 22, borderRadius: 26, overflow: 'hidden' },
  balanceGlow: { position: 'absolute', top: -60, right: -40, width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.14)' },
  balanceGlow2: { position: 'absolute', bottom: -80, left: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.08)' },
  quickTitle: { fontSize: 12.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 },
  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  quickActionWrap: { flex: 1 },
  quickAction: { alignItems: 'center', paddingVertical: 14, borderRadius: 18, borderWidth: 1, gap: 8 },
  quickActionIcon: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  quickActionLabel: { fontSize: 11.5, fontWeight: '700' },
  monthCard: { padding: 18, borderRadius: 20, borderWidth: 1, marginBottom: 6 },
  monthStatsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  monthStat: { flex: 1, alignItems: 'center' },
  monthStatLabel: { fontSize: 11, fontWeight: '600' },
  monthStatValue: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  monthDivider: { width: 1, height: 30 },
  savingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  savingsInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, paddingRight: 10 },
  savingsText: { fontSize: 12, flexShrink: 1 },
  savingsValue: { fontSize: 14, fontWeight: '800' },
  topCatCard: { padding: 6, borderRadius: 20, borderWidth: 1, marginBottom: 6 },
  topCatRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10 },
  topCatIcon: { width: 38, height: 38, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  topCatInfo: { flex: 1 },
  topCatTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  topCatName: { fontSize: 14, fontWeight: '700' },
  topCatAmount: { fontSize: 13.5, fontWeight: '800' },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600', letterSpacing: 0.4 },
  balanceIconBadge: { width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  balance: { fontSize: 40, fontWeight: '800', color: '#FFF', marginTop: 10, letterSpacing: -0.6 },
  balanceFooter: { flexDirection: 'row', gap: 8, marginTop: 14 },
  balanceChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  balanceChipText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  initialLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 12 },
  cardsRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  loansRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  loanCard: { flex: 1, padding: 15, borderRadius: 18, borderWidth: 1 },
  loanCardTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  loanCardLabel: { fontSize: 12, fontWeight: '700' },
  loanCardAmount: { fontSize: 17, fontWeight: '800', marginTop: 6 },
  card: { flex: 1, padding: 16, borderRadius: 20, borderWidth: 1 },
  cardIcon: { width: 38, height: 38, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  cardLabel: { fontSize: 12.5, marginTop: 12, fontWeight: '600' },
  cardAmount: { fontSize: 19, fontWeight: '800', marginTop: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, marginTop: 8 },
  sectionIconWrap: { width: 30, height: 30, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  alertCard: { padding: 16, borderRadius: 18, borderWidth: 1, marginBottom: 10 },
  alertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  alertName: { fontSize: 15, fontWeight: '700' },
  alertPct: { fontSize: 13, fontWeight: '800' },
  dueChip: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 9 },
  alertDetail: { fontSize: 12.5, marginTop: 4 },
  progressBar: { height: 7, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', borderRadius: 4 },
  emptyContainer: { alignItems: 'center', paddingVertical: 38, borderRadius: 20, borderWidth: 1, paddingHorizontal: 20 },
  emptyIcon: { width: 64, height: 64, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, marginTop: 14, fontWeight: '700' },
  emptySubtext: { fontSize: 13, marginTop: 4 },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 16, paddingVertical: 14, marginTop: 8 },
  viewAllText: { fontWeight: '700', fontSize: 14 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});
