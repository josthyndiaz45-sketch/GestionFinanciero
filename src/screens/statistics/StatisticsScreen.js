import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Modal, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, BarChart } from 'react-native-chart-kit';
import CalendarDatePicker from '../../components/CalendarDatePicker';
import { useTheme } from '../../providers/ThemeContext';
import { useAuth } from '../../providers/AuthContext';
import { useTransactions } from '../../providers/TransactionContext';
import { useBalance } from '../../providers/BalanceContext';
import { useLoans } from '../../providers/LoanContext';
import { useCategories } from '../../providers/CategoryContext';
import { loansNetEffect } from '../../models/Loan';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { Gradient } from '../../components/Gradient';
import { FadeInView, PopInView, AnimatedBar, useFocusKey } from '../../components/Animated';

const TABS = [
  { key: 'dia', label: 'Día' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mes' },
  { key: 'anio', label: 'Año' },
];

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const SHORT_MONTH = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function startOfDay(d) { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; }
function endOfDay(d) { const r = new Date(d); r.setHours(23, 59, 59, 999); return r; }

function getWeekStart(d) { const r = new Date(d); r.setDate(r.getDate() - r.getDay()); return startOfDay(r); }
function getWeekEnd(d) { const r = getWeekStart(d); r.setDate(r.getDate() + 6); return endOfDay(r); }

function getMonthStart(d) { return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1)); }
function getMonthEnd(d) { return endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0)); }

function getYearStart(d) { return startOfDay(new Date(d.getFullYear(), 0, 1)); }
function getYearEnd(d) { return endOfDay(new Date(d.getFullYear(), 11, 31)); }

function shiftPeriod(d, tab, dir) {
  const r = new Date(d);
  switch (tab) {
    case 'dia': r.setDate(r.getDate() + dir); break;
    case 'semana': r.setDate(r.getDate() + dir * 7); break;
    case 'mes': r.setMonth(r.getMonth() + dir); break;
    case 'anio': r.setFullYear(r.getFullYear() + dir); break;
  }
  return r;
}

function getCurrentRange(tab, anchor) {
  const a = anchor || new Date();
  switch (tab) {
    case 'dia': return { start: startOfDay(a), end: endOfDay(a) };
    case 'semana': return { start: getWeekStart(a), end: getWeekEnd(a) };
    case 'mes': return { start: getMonthStart(a), end: getMonthEnd(a) };
    case 'anio': return { start: getYearStart(a), end: getYearEnd(a) };
    default: return { start: startOfDay(a), end: endOfDay(a) };
  }
}

function getPrevRange(tab, anchor) {
  const shifted = shiftPeriod(anchor || new Date(), tab, -1);
  return getCurrentRange(tab, shifted);
}

function getNavLabel(tab, anchor) {
  const a = anchor || new Date();
  switch (tab) {
    case 'dia': return `${a.getDate()} ${SHORT_MONTH[a.getMonth()]} ${a.getFullYear()}`;
    case 'semana': {
      const ws = getWeekStart(a);
      const we = getWeekEnd(a);
      return `${ws.getDate()} - ${we.getDate()} ${SHORT_MONTH[a.getMonth()]} ${a.getFullYear()}`;
    }
    case 'mes': return `${MONTH_NAMES[a.getMonth()]} ${a.getFullYear()}`;
    case 'anio': return `${a.getFullYear()}`;
    default: return '';
  }
}

function getComparisonStats(transactions, currentStart, currentEnd, tab) {
  const prevAnchor = shiftPeriod(currentStart, tab, -1);
  const { start: ps, end: pe } = getCurrentRange(tab, prevAnchor);
  const prevTx = transactions.filter((t) => { const d = new Date(t.date); return d >= ps && d <= pe; });
  const prevIncome = prevTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const prevExpense = prevTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const prevNet = prevIncome - prevExpense;
  return { prevIncome, prevExpense, prevNet, prevStart: ps, prevEnd: pe };
}

function pctChange(current, prev) {
  if (prev === 0) return current > 0 ? 100 : 0;
  return ((current - prev) / Math.abs(prev)) * 100;
}

export default function StatisticsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { transactions, loadTransactions } = useTransactions();
  const { initialBalance } = useBalance();
  const { loans, loadLoans } = useLoans();
  const { getCategories } = useCategories();
  const expenseCategories = getCategories('expense');
  const [activeTab, setActiveTab] = useState('mes');
  const [anchor, setAnchor] = useState(new Date());
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [customEnd, setCustomEnd] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const { width: windowWidth } = useWindowDimensions();
  const focusKey = useFocusKey();

  useEffect(() => { if (user) { loadTransactions(); loadLoans(); } }, [user]);

  const useCustomRange = showCustom;
  const currentRange = useCustomRange
    ? { start: startOfDay(customStart), end: endOfDay(customEnd) }
    : getCurrentRange(activeTab, anchor);

  const prevComp = getComparisonStats(transactions, currentRange.start, currentRange.end, activeTab);

  const filtered = transactions.filter((t) => { const d = new Date(t.date); return d >= currentRange.start && d <= currentRange.end; });

  const totalIncome = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = totalIncome - totalExpense;

  const allIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const allExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const currentBalance = initialBalance + allIncome - allExpense + loansNetEffect(loans);

  const incomePct = pctChange(totalIncome, prevComp.prevIncome);
  const expensePct = pctChange(totalExpense, prevComp.prevExpense);
  const netPct = pctChange(net, prevComp.prevNet);

  const expenseByCategory = filtered.filter((t) => t.type === 'expense').reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});
  const sortedCategories = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);
  const maxExpense = sortedCategories.length > 0 ? sortedCategories[0][1] : 1;

  const diffDays = Math.max(1, Math.ceil((currentRange.end - currentRange.start) / (1000 * 60 * 60 * 24)));
  const dailyAvg = totalExpense / diffDays;
  const topCat = sortedCategories.length > 0 ? expenseCategories.find((c) => c.name === sortedCategories[0][0]) : null;

  const prevMonthName = MONTH_NAMES[prevComp.prevStart.getMonth()];
  const currMonthName = MONTH_NAMES[currentRange.start.getMonth()];

  const handlePrev = () => setAnchor(shiftPeriod(anchor, activeTab, -1));
  const handleNext = () => setAnchor(shiftPeriod(anchor, activeTab, 1));

  const handleTabChange = (tab) => { setActiveTab(tab); setShowCustom(false); };

  const navLabel = useCustomRange
    ? `${formatDate(customStart)} - ${formatDate(customEnd)}`
    : getNavLabel(activeTab, anchor);

  const ChangeBadge = ({ value, compact }) => {
    if (value === 0 && !compact) return null;
    const up = value >= 0;
    const bg = up ? theme.colors.incomeSoft : theme.colors.expenseSoft;
    const fg = up ? theme.colors.incomeText : theme.colors.expenseText;
    const iconColor = up ? theme.colors.income : theme.colors.expense;
    return (
      <View style={[styles.changeBadge, { backgroundColor: bg }]}>
        <Ionicons name={up ? 'trending-up' : 'trending-down'} size={compact ? 10 : 12} color={iconColor} />
        <Text style={[styles.changeText, { color: fg, fontSize: compact ? 9 : 11 }]}>{Math.abs(Math.round(value))}%</Text>
      </View>
    );
  };

  const hasData = filtered.length > 0;

  const chartWidth = Math.max(280, Math.min(windowWidth - 40, 560));

  const pieData = sortedCategories.slice(0, 6).map(([catName, amount]) => {
    const cat = expenseCategories.find((c) => c.name === catName) || { label: catName, color: '#6B7280' };
    return {
      name: cat.label,
      population: amount,
      color: cat.color || '#6B7280',
      legendFontColor: theme.colors.textSecondary,
      legendFontSize: 12,
    };
  });

  // Monthly trend for the current year
  const trendMonths = Array.from({ length: 12 }, (_, i) => i);
  const yearTx = transactions.filter((t) => new Date(t.date).getFullYear() === currentRange.start.getFullYear());
  const trendIncome = trendMonths.map((m) => yearTx.filter((t) => t.type === 'income' && new Date(t.date).getMonth() === m).reduce((s, t) => s + t.amount, 0));
  const trendExpense = trendMonths.map((m) => yearTx.filter((t) => t.type === 'expense' && new Date(t.date).getMonth() === m).reduce((s, t) => s + t.amount, 0));
  const hasTrend = yearTx.length > 0;

  const barData = {
    labels: SHORT_MONTH,
    datasets: [
      { data: trendExpense, color: (o = 1) => `rgba(244, 63, 94, ${o})` },
      { data: trendIncome, color: (o = 1) => `rgba(16, 185, 129, ${o})` },
    ],
    legend: ['Gastos', 'Ingresos'],
  };

  const chartConfig = {
    backgroundGradientFrom: theme.colors.card,
    backgroundGradientTo: theme.colors.card,
    decimalPlaces: 0,
    color: (o = 1) => `rgba(99, 102, 241, ${o})`,
    labelColor: () => theme.colors.textSecondary,
    propsForBackgroundLines: { stroke: theme.colors.border, strokeDasharray: '' },
    propsForLabels: { fontSize: 10 },
    barPercentage: 0.6,
  };

  const selectedCatInfo = selectedCategory ? (expenseCategories.find((c) => c.name === selectedCategory) || { label: selectedCategory, color: '#6B7280', icon: 'ellipsis-horizontal-outline' }) : null;
  const selectedTx = selectedCategory
    ? transactions
        .filter((t) => t.type === 'expense' && t.category === selectedCategory)
        .slice()
        .sort((a, b) => new Date(b.date) - new Date(a.date))
    : [];
  const selectedTotal = selectedTx.reduce((s, t) => s + t.amount, 0);
  const selectedByMonth = selectedTx.reduce((acc, tx) => {
    const d = new Date(tx.date);
    const m = d.getMonth();
    const y = d.getFullYear();
    const key = `${y}-${String(m + 1).padStart(2, '0')}`;
    if (!acc[key]) acc[key] = { label: `${MONTH_NAMES[m]} ${y}`, month: m, year: y, items: [] };
    acc[key].items.push(tx);
    return acc;
  }, {});
  const selectedMonthKeys = Object.keys(selectedByMonth).sort((a, b) => b.localeCompare(a));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView key={focusKey} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <FadeInView delay={0}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Estadísticas</Text>
        </FadeInView>

        <PopInView delay={80} style={[styles.balanceCardWrap, theme.shadow.hero]}>
          <Gradient colors={[theme.colors.gradientStart, theme.colors.gradientEnd]} style={styles.balanceCard}>
            <View style={styles.balanceGlow} />
            <View style={styles.balanceGlow2} />
            <View style={styles.balanceTop}>
              <Text style={styles.balanceLabel}>Saldo actual</Text>
              <View style={styles.balanceIconBadge}>
                <Ionicons name="wallet-outline" size={18} color="#FFFFFF" />
              </View>
            </View>
            <Text style={styles.balance}>{formatCurrency(currentBalance)}</Text>
            {initialBalance > 0 && (
              <Text style={styles.balanceSub}>Incluye saldo inicial: {formatCurrency(initialBalance)}</Text>
            )}
          </Gradient>
        </PopInView>

        <View style={[styles.tabRow, { backgroundColor: theme.colors.surface }]}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key && !showCustom;
            return (
              <TouchableOpacity key={tab.key} style={[styles.tab, active && { backgroundColor: theme.colors.primary }, active && theme.shadow.soft]} onPress={() => handleTabChange(tab.key)}>
                <Text style={[styles.tabText, { color: active ? '#FFF' : theme.colors.textSecondary }]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={[styles.tab, showCustom && { backgroundColor: theme.colors.primary }, showCustom && theme.shadow.soft]} onPress={() => setShowCustom(true)}>
            <Ionicons name="calendar-outline" size={14} color={showCustom ? '#FFF' : theme.colors.textSecondary} />
            <Text style={[styles.tabText, { color: showCustom ? '#FFF' : theme.colors.textSecondary }]}>Personalizado</Text>
          </TouchableOpacity>
        </View>

        {!showCustom && (
          <View style={[styles.navRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, theme.shadow.soft]}>
            <TouchableOpacity onPress={handlePrev} style={[styles.navArrow, { backgroundColor: theme.colors.primarySoft }]}>
              <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.navLabel, { color: theme.colors.text }]}>{navLabel}</Text>
            <TouchableOpacity onPress={handleNext} style={[styles.navArrow, { backgroundColor: theme.colors.primarySoft }]}>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        <Modal visible={showCustom} transparent animationType="fade" onRequestClose={() => setShowCustom(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Seleccionar período</Text>
              <Text style={[styles.modalHint, { color: theme.colors.textSecondary }]}>Desde</Text>
              <TouchableOpacity style={[styles.datePickerBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={() => { setShowCustom(false); setTimeout(() => setShowStartPicker(true), 200); }}>
                <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
                <Text style={[styles.datePickerText, { color: theme.colors.text }]}>{formatDate(customStart)}</Text>
              </TouchableOpacity>
              <Text style={[styles.modalHint, { color: theme.colors.textSecondary }]}>Hasta</Text>
              <TouchableOpacity style={[styles.datePickerBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={() => { setShowCustom(false); setTimeout(() => setShowEndPicker(true), 200); }}>
                <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
                <Text style={[styles.datePickerText, { color: theme.colors.text }]}>{formatDate(customEnd)}</Text>
              </TouchableOpacity>
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.colors.surface }]} onPress={() => setShowCustom(false)}><Text style={{ color: theme.colors.textSecondary, fontWeight: '600' }}>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.colors.primary }]} onPress={() => setShowCustom(false)}><Text style={{ color: '#FFF', fontWeight: '600' }}>Aplicar</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <CalendarDatePicker
          visible={showStartPicker}
          date={customStart}
          theme={theme}
          maximumDate={customEnd}
          onConfirm={(d) => { setCustomStart(d); setShowStartPicker(false); }}
          onCancel={() => setShowStartPicker(false)}
        />
        <CalendarDatePicker
          visible={showEndPicker}
          date={customEnd}
          theme={theme}
          maximumDate={new Date()}
          onConfirm={(d) => { setCustomEnd(d); setShowEndPicker(false); }}
          onCancel={() => setShowEndPicker(false)}
        />

        {!showCustom && (
          <View style={styles.quickRow}>
            {[
              { label: 'Hoy', tab: 'dia', offset: 0 },
              { label: '7 días', tab: 'semana', offset: 0 },
              { label: '30 días', tab: 'mes', offset: 0 },
            ].map((q) => (
              <TouchableOpacity key={q.label} style={[styles.quickBtn, { borderColor: theme.colors.border }]} onPress={() => { setActiveTab(q.tab); setAnchor(new Date()); }}>
                <Text style={[styles.quickText, { color: theme.colors.textSecondary }]}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.incomeSoft, borderColor: theme.colors.border }, theme.shadow.soft]}>
            <View style={[styles.summaryIcon, { backgroundColor: theme.colors.income + '22' }]}>
              <Ionicons name="trending-up" size={16} color={theme.colors.income} />
            </View>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Ingresos</Text>
            <Text style={[styles.summaryAmount, { color: theme.colors.incomeText }]} numberOfLines={1}>{formatCurrency(totalIncome)}</Text>
            <ChangeBadge value={incomePct} />
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.expenseSoft, borderColor: theme.colors.border }, theme.shadow.soft]}>
            <View style={[styles.summaryIcon, { backgroundColor: theme.colors.expense + '22' }]}>
              <Ionicons name="trending-down" size={16} color={theme.colors.expense} />
            </View>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Gastos</Text>
            <Text style={[styles.summaryAmount, { color: theme.colors.expenseText }]} numberOfLines={1}>{formatCurrency(totalExpense)}</Text>
            <ChangeBadge value={expensePct} />
          </View>
        </View>

        <View style={[styles.netCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, theme.shadow.soft]}>
          <Text style={[styles.netLabel, { color: theme.colors.textSecondary }]}>Balance neto del período</Text>
          <Text style={[styles.netAmount, { color: net >= 0 ? theme.colors.income : theme.colors.expense }]}>{formatCurrency(net)}</Text>
          <View style={styles.netChangeRow}>
            <ChangeBadge value={netPct} compact />
            {prevComp.prevNet !== 0 && <Text style={[styles.vsText, { color: theme.colors.textSecondary }]}>vs período anterior</Text>}
          </View>
        </View>

        <View style={[styles.statsRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, theme.shadow.soft]}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: theme.colors.primarySoft }]}>
              <Ionicons name="time-outline" size={18} color={theme.colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.text }]} numberOfLines={1}>{formatCurrency(dailyAvg)}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Promedio/día</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: (topCat?.color || '#6B7280') + '22' }]}>
              <Ionicons name={topCat?.icon || 'flag-outline'} size={18} color={topCat?.color || '#6B7280'} />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.text }]} numberOfLines={1}>{topCat?.label || 'N/A'}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Mayor gasto</Text>
            {topCat && <Text style={[styles.statSub, { color: theme.colors.textSecondary }]}>{formatCurrency(sortedCategories[0][1])}</Text>}
          </View>
        </View>

        {pieData.length > 0 && (
          <FadeInView delay={280}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Distribución de gastos</Text>
            <View style={[styles.chartCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, theme.shadow.soft]}>
              <PieChart
                data={pieData}
                width={chartWidth}
                height={200}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="0"
                center={[0, 0]}
                hasLegend
              />
            </View>
          </FadeInView>
        )}

        {hasTrend && (
          <FadeInView delay={320}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Tendencia anual</Text>
            <View style={[styles.chartCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, theme.shadow.soft]}>
              <BarChart
                data={barData}
                width={chartWidth}
                height={220}
                chartConfig={chartConfig}
                fromZero
                showValuesOnTopOfBars={false}
                withInnerLines={false}
                yAxisLabel="$"
                yAxisSuffix=""
                style={styles.barChart}
              />
            </View>
          </FadeInView>
        )}

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Gastos por categoría</Text>
        {!hasData ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, theme.shadow.soft]}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name="document-text-outline" size={26} color={theme.colors.textSecondary} />
            </View>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No hay movimientos en este período</Text>
          </View>
        ) : sortedCategories.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>Sin gastos en este período</Text>
        ) : (
          sortedCategories.map(([catName, amount], idx) => {
            const cat = expenseCategories.find((c) => c.name === catName) || { label: catName, color: '#6B7280', icon: 'ellipsis-horizontal-outline' };
            const pct = (amount / maxExpense) * 100;
            return (
              <FadeInView key={catName} delay={360 + idx * 50}>
                <TouchableOpacity
                  style={[styles.catRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, theme.shadow.soft]}
                  onPress={() => setSelectedCategory(catName)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.catIcon, { backgroundColor: cat.color + '20' }]}>
                    <Ionicons name={cat.icon} size={18} color={cat.color} />
                  </View>
                  <View style={styles.catInfo}>
                    <View style={styles.catTop}>
                      <Text style={[styles.catName, { color: theme.colors.text }]}>{cat.label}</Text>
                      <Text style={[styles.catAmount, { color: theme.colors.text }]}>{formatCurrency(amount)}</Text>
                    </View>
                    <AnimatedBar pct={pct} color={cat.color} trackColor={theme.colors.surface} height={6} delay={420 + idx * 50} />
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </FadeInView>
            );
          })
        )}

        {hasData && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 8 }]}>Comparación</Text>
            <View style={[styles.compCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, theme.shadow.soft]}>
              <Text style={[styles.compTitle, { color: theme.colors.text }]}>
                {prevMonthName} vs {currMonthName}
              </Text>
              <View style={[styles.compHeader, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.compCol, { color: theme.colors.textSecondary }]}></Text>
                <Text style={[styles.compCol, { color: theme.colors.textSecondary, textAlign: 'right' }]}>{prevMonthName}</Text>
                <Text style={[styles.compCol, { color: theme.colors.textSecondary, textAlign: 'right' }]}>{currMonthName}</Text>
              </View>
              {[
                { label: 'Ingresos', prev: prevComp.prevIncome, curr: totalIncome },
                { label: 'Gastos', prev: prevComp.prevExpense, curr: totalExpense },
                { label: 'Neto', prev: prevComp.prevNet, curr: net },
              ].map((row) => {
                const maxBar = Math.max(Math.abs(row.prev), Math.abs(row.curr), 1);
                return (
                  <View key={row.label} style={[styles.compRow, { borderBottomColor: theme.colors.border }]}>
                    <Text style={[styles.compLabel, { color: theme.colors.text }]}>{row.label}</Text>
                    <Text style={[styles.compVal, { color: theme.colors.textSecondary }]}>{formatCurrency(row.prev)}</Text>
                    <Text style={[styles.compVal, { color: row.label === 'Neto' ? (row.curr >= 0 ? '#10B981' : '#F43F5E') : theme.colors.text }]}>{formatCurrency(row.curr)}</Text>
                  </View>
                );
              })}
              <View style={styles.compBarSection}>
                <View style={styles.compBarLabel}>
                  <Text style={[styles.compBarText, { color: theme.colors.textSecondary }]}>{prevMonthName}</Text>
                  <Text style={[styles.compBarText, { color: theme.colors.textSecondary }]}>{currMonthName}</Text>
                </View>
                <View style={[styles.compBarPair, { backgroundColor: theme.colors.surface }]}>
                  {(() => {
                    const maxBar = Math.max(Math.abs(prevComp.prevNet), Math.abs(net), 1);
                    const prevWidth = Math.max((Math.abs(prevComp.prevNet) / maxBar) * 100, 2);
                    const currWidth = Math.max((Math.abs(net) / maxBar) * 100, 2);
                    return (
                      <>
                        <View style={[styles.compBar, { width: `${prevWidth}%`, backgroundColor: prevComp.prevNet >= 0 ? '#10B98180' : '#F43F5E80' }]} />
                        <View style={[styles.compBar, { width: `${currWidth}%`, backgroundColor: net >= 0 ? '#10B981' : '#F43F5E' }]} />
                      </>
                    );
                  })()}
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={!!selectedCategory} transparent animationType="slide" onRequestClose={() => setSelectedCategory(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.detailModal, { backgroundColor: theme.colors.card }]}>
            <View style={styles.detailHeader}>
              <View style={[styles.detailIconBox, { backgroundColor: (selectedCatInfo?.color || '#6B7280') + '20' }]}>
                <Ionicons name={selectedCatInfo?.icon || 'pricetag-outline'} size={20} color={selectedCatInfo?.color || '#6B7280'} />
              </View>
              <View style={styles.detailHeaderInfo}>
                <Text style={[styles.detailTitle, { color: theme.colors.text }]}>{selectedCatInfo?.label}</Text>
                <Text style={[styles.detailTotal, { color: theme.colors.textSecondary }]}>
                  Total de todos: {formatCurrency(selectedTotal)} · {selectedTx.length} {selectedTx.length === 1 ? 'gasto' : 'gastos'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedCategory(null)} style={styles.detailClose}>
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedTx.length === 0 ? (
              <View style={styles.detailEmpty}>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No hay gastos en esta categoría</Text>
              </View>
            ) : (
              <ScrollView style={styles.detailList} showsVerticalScrollIndicator={false}>
              {selectedMonthKeys.map((monthKey) => {
                const group = selectedByMonth[monthKey];
                const groupTotal = group.items.reduce((s, t) => s + t.amount, 0);
                return (
                  <View key={monthKey} style={styles.detailMonthGroup}>
                    <View style={[styles.detailMonthHeader, { borderBottomColor: theme.colors.border }]}>
                      <Text style={[styles.detailMonthTitle, { color: theme.colors.text }]}>{group.label}</Text>
                      <Text style={[styles.detailMonthTotal, { color: theme.colors.textSecondary }]}>{formatCurrency(groupTotal)}</Text>
                    </View>
                    {group.items.map((tx) => {
                      const d = new Date(tx.date);
                      return (
                        <View key={tx.id} style={[styles.detailItem, { borderBottomColor: theme.colors.border }]}>
                          <View style={styles.detailItemLeft}>
                            <View style={styles.detailDescRow}>
                              <Text style={[styles.detailDesc, { color: theme.colors.text }]} numberOfLines={1}>{tx.description}</Text>
                            </View>
                            <Text style={[styles.detailDate, { color: theme.colors.textSecondary }]}>
                              {formatDateTime(tx.date)}
                            </Text>
                            {tx.paymentMethod ? <Text style={[styles.detailMeta, { color: theme.colors.textSecondary }]}>{tx.paymentMethod}</Text> : null}
                            {tx.note ? <Text style={[styles.detailMeta, { color: theme.colors.textSecondary }]} numberOfLines={2}>{tx.note}</Text> : null}
                          </View>
                          <Text style={[styles.detailAmount, { color: '#F43F5E' }]}>-{formatCurrency(tx.amount)}</Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 16, letterSpacing: -0.4 },
  balanceCardWrap: { borderRadius: 26, marginBottom: 16 },
  balanceCard: { padding: 22, borderRadius: 26, overflow: 'hidden' },
  balanceGlow: { position: 'absolute', top: -60, right: -40, width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.14)' },
  balanceGlow2: { position: 'absolute', bottom: -80, left: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.08)' },
  chartCard: { borderRadius: 20, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 4, marginBottom: 6, alignItems: 'center', overflow: 'hidden' },
  barChart: { borderRadius: 16, marginLeft: -8 },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600', letterSpacing: 0.4 },
  balanceIconBadge: { width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  balance: { fontSize: 36, fontWeight: '800', color: '#FFF', marginTop: 10, letterSpacing: -0.6 },
  balanceSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 8 },
  tabRow: { flexDirection: 'row', gap: 6, marginBottom: 12, padding: 5, borderRadius: 18 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14 },
  tabText: { fontSize: 13, fontWeight: '700' },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 8, borderRadius: 18, borderWidth: 1, marginBottom: 10 },
  navArrow: { width: 36, height: 36, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  navLabel: { fontSize: 15, fontWeight: '700', flex: 1, textAlign: 'center' },
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  quickBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14, borderWidth: 1 },
  quickText: { fontSize: 11.5, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  summaryCard: { flex: 1, padding: 16, borderRadius: 20, borderWidth: 1 },
  summaryIcon: { width: 34, height: 34, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  summaryLabel: { fontSize: 12, fontWeight: '600' },
  summaryAmount: { fontSize: 19, fontWeight: '800', marginTop: 3 },
  changeBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 9, marginTop: 8, alignSelf: 'flex-start' },
  changeText: { fontWeight: '700' },
  netCard: { padding: 20, borderRadius: 20, borderWidth: 1, alignItems: 'center', marginBottom: 16 },
  netLabel: { fontSize: 12.5, fontWeight: '600' },
  netAmount: { fontSize: 26, fontWeight: '800', marginTop: 6, letterSpacing: -0.4 },
  netChangeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  vsText: { fontSize: 11 },
  statsRow: { flexDirection: 'row', borderRadius: 20, borderWidth: 1, marginBottom: 22, overflow: 'hidden' },
  statItem: { flex: 1, padding: 18, alignItems: 'center' },
  statIcon: { width: 38, height: 38, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statDivider: { width: 1 },
  statValue: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  statLabel: { fontSize: 11, marginTop: 3 },
  statSub: { fontSize: 11, marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginBottom: 12, letterSpacing: -0.2 },
  emptyCard: { padding: 32, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
  emptyIcon: { width: 58, height: 58, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 14, marginTop: 12 },
  catRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18, borderWidth: 1, marginBottom: 8 },
  catIcon: { width: 40, height: 40, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  catInfo: { flex: 1 },
  catTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catName: { fontSize: 14.5, fontWeight: '700' },
  catAmount: { fontSize: 14, fontWeight: '800' },
  catBarBg: { height: 7, borderRadius: 4, overflow: 'hidden' },
  catBarFill: { height: '100%', borderRadius: 4 },
  compCard: { borderRadius: 20, borderWidth: 1, padding: 16 },
  compTitle: { fontSize: 15, fontWeight: '600', marginBottom: 12 },
  compHeader: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, marginBottom: 4 },
  compCol: { flex: 1, fontSize: 12, fontWeight: '600' },
  compRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 0.5 },
  compLabel: { flex: 1, fontSize: 13, fontWeight: '500' },
  compVal: { flex: 1, fontSize: 13, fontWeight: '600', textAlign: 'right' },
  compBarSection: { marginTop: 14 },
  compBarLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  compBarText: { fontSize: 11, fontWeight: '500' },
  compBarPair: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 3 },
  compBar: { borderRadius: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  detailModal: { borderRadius: 20, padding: 20, maxHeight: '80%' },
  detailList: { flexGrow: 0 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  detailIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  detailHeaderInfo: { flex: 1 },
  detailTitle: { fontSize: 18, fontWeight: 'bold' },
  detailTotal: { fontSize: 13, marginTop: 2 },
  detailClose: { padding: 4 },
  detailEmpty: { alignItems: 'center', paddingVertical: 40 },
  detailMonthGroup: { marginBottom: 8 },
  detailMonthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, marginTop: 4 },
  detailMonthTitle: { fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase' },
  detailMonthTotal: { fontSize: 13, fontWeight: '600' },
  detailItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5 },
  detailItemLeft: { flex: 1, paddingRight: 12 },
  detailDescRow: { flexDirection: 'row', alignItems: 'center' },
  detailDesc: { fontSize: 15, fontWeight: '600' },
  detailDate: { fontSize: 12, marginTop: 2 },
  detailMeta: { fontSize: 12, marginTop: 2, fontStyle: 'italic' },
  detailAmount: { fontSize: 15, fontWeight: 'bold' },
  modalBox: { borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  modalHint: { fontSize: 12, fontWeight: '500', marginBottom: 6, marginTop: 4 },
  datePickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 4 },
  datePickerText: { fontSize: 14, fontWeight: '500' },
  pickerDone: { borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 4, marginBottom: 8 },
  pickerDoneText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
});
