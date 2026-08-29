import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CalendarDatePicker from '../../components/CalendarDatePicker';
import { useTheme } from '../../providers/ThemeContext';
import { useAuth } from '../../providers/AuthContext';
import { useTransactions } from '../../providers/TransactionContext';
import { useBalance } from '../../providers/BalanceContext';
import { useCategories } from '../../providers/CategoryContext';
import { formatCurrency, formatDate } from '../../utils/formatters';

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
  const { getCategories } = useCategories();
  const expenseCategories = getCategories('expense');
  const [activeTab, setActiveTab] = useState('mes');
  const [anchor, setAnchor] = useState(new Date());
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [customEnd, setCustomEnd] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => { if (user) loadTransactions(); }, [user]);

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
  const currentBalance = initialBalance + allIncome - allExpense;

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
    return (
      <View style={[styles.changeBadge, { backgroundColor: up ? '#ECFDF5' : '#FFF1F2' }]}>
        <Ionicons name={up ? 'trending-up' : 'trending-down'} size={compact ? 10 : 12} color={up ? '#10B981' : '#F43F5E'} />
        <Text style={[styles.changeText, { color: up ? '#065F46' : '#9F1239', fontSize: compact ? 9 : 11 }]}>{Math.abs(Math.round(value))}%</Text>
      </View>
    );
  };

  const hasData = filtered.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Estadísticas</Text>

        <View style={[styles.balanceCard, { backgroundColor: theme.colors.primary }]}>
          <View style={styles.balanceTop}>
            <Text style={styles.balanceLabel}>Saldo actual</Text>
            <Ionicons name="wallet-outline" size={20} color="rgba(255,255,255,0.7)" />
          </View>
          <Text style={styles.balance}>{formatCurrency(currentBalance)}</Text>
          {initialBalance > 0 && (
            <Text style={styles.balanceSub}>Incluye saldo inicial: {formatCurrency(initialBalance)}</Text>
          )}
        </View>

        <View style={styles.tabRow}>
          {TABS.map((tab) => (
            <TouchableOpacity key={tab.key} style={[styles.tab, activeTab === tab.key && !showCustom && { backgroundColor: theme.colors.primary }]} onPress={() => handleTabChange(tab.key)}>
              <Text style={[styles.tabText, activeTab === tab.key && !showCustom && { color: '#FFF' }]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.tab, showCustom && { backgroundColor: theme.colors.primary }]} onPress={() => setShowCustom(true)}>
            <Ionicons name="calendar-outline" size={14} color={showCustom ? '#FFF' : theme.colors.textSecondary} />
            <Text style={[styles.tabText, showCustom && { color: '#FFF' }]}>Personalizado</Text>
          </TouchableOpacity>
        </View>

        {!showCustom && (
          <View style={[styles.navRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <TouchableOpacity onPress={handlePrev} style={styles.navArrow}>
              <Ionicons name="chevron-back" size={22} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.navLabel, { color: theme.colors.text }]}>{navLabel}</Text>
            <TouchableOpacity onPress={handleNext} style={styles.navArrow}>
              <Ionicons name="chevron-forward" size={22} color={theme.colors.primary} />
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
          <View style={[styles.summaryCard, { backgroundColor: '#ECFDF5', borderColor: '#D1FAE5' }]}>
            <Text style={styles.summaryLabel}>Ingresos</Text>
            <Text style={styles.summaryAmountGreen}>{formatCurrency(totalIncome)}</Text>
            <ChangeBadge value={incomePct} />
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' }]}>
            <Text style={styles.summaryLabel}>Gastos</Text>
            <Text style={styles.summaryAmountRed}>{formatCurrency(totalExpense)}</Text>
            <ChangeBadge value={expensePct} />
          </View>
        </View>

        <View style={[styles.netCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.netLabel, { color: theme.colors.textSecondary }]}>Neto</Text>
          <Text style={[styles.netAmount, { color: net >= 0 ? '#10B981' : '#F43F5E' }]}>{formatCurrency(net)}</Text>
          <View style={styles.netChangeRow}>
            <ChangeBadge value={netPct} compact />
            {prevComp.prevNet !== 0 && <Text style={[styles.vsText, { color: theme.colors.textSecondary }]}>vs período anterior</Text>}
          </View>
        </View>

        <View style={[styles.statsRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={22} color={theme.colors.primary} />
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{formatCurrency(dailyAvg)}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Promedio/día</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.statItem}>
            <Ionicons name={topCat?.icon || 'flag-outline'} size={22} color={topCat?.color || '#6B7280'} />
            <Text style={[styles.statValue, { color: theme.colors.text }]} numberOfLines={1}>{topCat?.label || 'N/A'}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Mayor gasto</Text>
            {topCat && <Text style={[styles.statSub, { color: theme.colors.textSecondary }]}>{formatCurrency(sortedCategories[0][1])}</Text>}
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Gastos por categoría</Text>
        {!hasData ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Ionicons name="document-text-outline" size={36} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No hay movimientos en este período</Text>
          </View>
        ) : sortedCategories.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>Sin gastos en este período</Text>
        ) : (
          sortedCategories.map(([catName, amount]) => {
            const cat = expenseCategories.find((c) => c.name === catName) || { label: catName, color: '#6B7280', icon: 'ellipsis-horizontal-outline' };
            const pct = (amount / maxExpense) * 100;
            return (
              <View key={catName} style={[styles.catRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <View style={[styles.catIcon, { backgroundColor: cat.color + '20' }]}>
                  <Ionicons name={cat.icon} size={18} color={cat.color} />
                </View>
                <View style={styles.catInfo}>
                  <View style={styles.catTop}>
                    <Text style={[styles.catName, { color: theme.colors.text }]}>{cat.label}</Text>
                    <Text style={[styles.catAmount, { color: theme.colors.text }]}>{formatCurrency(amount)}</Text>
                  </View>
                  <View style={[styles.catBarBg, { backgroundColor: theme.colors.surface }]}>
                    <View style={[styles.catBarFill, { width: `${pct}%`, backgroundColor: cat.color }]} />
                  </View>
                </View>
              </View>
            );
          })
        )}

        {hasData && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 8 }]}>Comparación</Text>
            <View style={[styles.compCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 16 },
  balanceCard: { padding: 20, borderRadius: 20, marginBottom: 16 },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  balance: { fontSize: 34, fontWeight: 'bold', color: '#FFF', marginTop: 8 },
  balanceSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: '#E5E7EB' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  navArrow: { padding: 4 },
  navLabel: { fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'center' },
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  quickBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, borderWidth: 1 },
  quickText: { fontSize: 11, fontWeight: '500' },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  summaryCard: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1 },
  summaryLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  summaryAmountGreen: { fontSize: 20, fontWeight: 'bold', color: '#065F46', marginTop: 4 },
  summaryAmountRed: { fontSize: 20, fontWeight: 'bold', color: '#9F1239', marginTop: 4 },
  changeBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginTop: 6, alignSelf: 'flex-start' },
  changeText: { fontWeight: '600' },
  netCard: { padding: 18, borderRadius: 16, borderWidth: 1, alignItems: 'center', marginBottom: 16 },
  netLabel: { fontSize: 13, fontWeight: '500' },
  netAmount: { fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  netChangeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  vsText: { fontSize: 11 },
  statsRow: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  statItem: { flex: 1, padding: 16, alignItems: 'center' },
  statDivider: { width: 1 },
  statValue: { fontSize: 15, fontWeight: 'bold', marginTop: 6 },
  statLabel: { fontSize: 11, marginTop: 2 },
  statSub: { fontSize: 11, marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 12 },
  emptyCard: { padding: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  emptyText: { fontSize: 14, marginTop: 8 },
  catRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  catIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  catInfo: { flex: 1 },
  catTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  catName: { fontSize: 14, fontWeight: '600' },
  catAmount: { fontSize: 14, fontWeight: 'bold' },
  catBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  catBarFill: { height: '100%', borderRadius: 3 },
  compCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
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
