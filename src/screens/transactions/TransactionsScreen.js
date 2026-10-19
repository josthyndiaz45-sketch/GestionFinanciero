import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CalendarDatePicker from '../../components/CalendarDatePicker';
import { useTheme } from '../../providers/ThemeContext';
import { useAuth } from '../../providers/AuthContext';
import { useTransactions } from '../../providers/TransactionContext';
import { useCategories } from '../../providers/CategoryContext';
import { useAppAlert } from '../../providers/AlertContext';
import TransactionTile from '../../components/TransactionTile';
import { PAYMENT_METHODS } from '../../constants/constants';
import { formatDate } from '../../utils/formatters';
import { PressableScale, FadeInView, PopInView, AnimatedIconButton, useFocusKey } from '../../components/Animated';

function parseDateStr(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d) ? null : d;
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

export default function TransactionsScreen({ navigation }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { transactions, loadTransactions, removeTransaction } = useTransactions();
  const { getCategories } = useCategories();
  const { showConfirm } = useAppAlert();
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState(null);
  const [filterDateTo, setFilterDateTo] = useState(null);
  const [showDateFrom, setShowDateFrom] = useState(false);
  const [showDateTo, setShowDateTo] = useState(false);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const focusKey = useFocusKey();

  useEffect(() => {
    if (user) loadTransactions();
  }, [user]);

  const filtered = transactions.filter((t) => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (search) {
      const s = search.toLowerCase();
      const desc = (t.description || '').toLowerCase();
      const cat = (t.category || '').toLowerCase();
      if (!desc.includes(s) && !cat.includes(s)) return false;
    }
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    if (filterPayment !== 'all' && t.paymentMethod !== filterPayment) return false;
    const txDate = parseDateStr(t.date);
    if (filterDateFrom && txDate) { const f = parseDateStr(filterDateFrom); if (f && txDate < f) return false; }
    if (filterDateTo && txDate) { const f = parseDateStr(filterDateTo); if (f && txDate > f) return false; }
    if (minAmount && t.amount < parseFloat(minAmount)) return false;
    if (maxAmount && t.amount > parseFloat(maxAmount)) return false;
    return true;
  });

  const grouped = filtered.reduce((acc, tx) => {
    const d = new Date(tx.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!acc[key]) acc[key] = { date: d, items: [] };
    acc[key].items.push(tx);
    return acc;
  }, {});

  const sections = Object.values(grouped).sort((a, b) => b.date - a.date);

  const activeFilterCount = [filterType !== 'all', filterCategory !== 'all', filterPayment !== 'all', filterDateFrom, filterDateTo, minAmount, maxAmount].filter(Boolean).length;

  const clearFilters = () => {
    setFilterType('all');
    setFilterCategory('all');
    setFilterPayment('all');
    setFilterDateFrom(null);
    setFilterDateTo(null);
    setMinAmount('');
    setMaxAmount('');
    setSearch('');
  };

  const allCategories = [...getCategories('income'), ...getCategories('expense')];

  const handleDelete = (tx) => {
    showConfirm('Eliminar movimiento', `¿Eliminar "${tx.description}"?`, () => removeTransaction(tx.id));
  };

  const formatDateLabel = (date) => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Movimientos</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, theme.shadow.soft]}>
          <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Buscar movimiento..."
            placeholderTextColor={theme.colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} /></TouchableOpacity>
          )}
        </View>
        <PressableScale
          style={[styles.filterToggle, { backgroundColor: activeFilterCount > 0 ? theme.colors.primary : theme.colors.card, borderColor: theme.colors.border }, theme.shadow.soft]}
          onPress={() => setShowFilters(true)}
          scaleTo={0.9}
        >
          <Ionicons name="options-outline" size={20} color={activeFilterCount > 0 ? '#FFF' : theme.colors.text} />
          {activeFilterCount > 0 && <Text style={styles.filterCount}>{activeFilterCount}</Text>}
        </PressableScale>
      </View>

      {/* Quick Type Filters */}
      <View style={[styles.filterRow, { backgroundColor: theme.colors.surface }]}>
        {[{ key: 'all', label: 'Todos' }, { key: 'income', label: 'Ingresos' }, { key: 'expense', label: 'Gastos' }].map((f) => {
          const active = filterType === f.key;
          return (
            <PressableScale key={f.key} containerStyle={styles.filterBtnWrap} style={[styles.filterBtn, active && { backgroundColor: theme.colors.primary }, active && theme.shadow.soft]} onPress={() => setFilterType(f.key)} scaleTo={0.94}>
              <Text style={[styles.filterText, { color: active ? '#FFF' : theme.colors.textSecondary }]}>{f.label}</Text>
            </PressableScale>
          );
        })}
      </View>

      {sections.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.colors.primarySoft }]}>
            <Ionicons name="document-text-outline" size={30} color={theme.colors.primary} />
          </View>
          <Text style={[styles.emptyText, { color: theme.colors.text }]}>No hay movimientos</Text>
          <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>Prueba ajustar los filtros o agrega uno nuevo</Text>
        </View>
      ) : (
        <FlatList
          key={focusKey}
          data={sections}
          keyExtractor={(_, idx) => `section_${idx}`}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          renderItem={({ item: section }) => (
            <View>
              <Text style={[styles.dateHeader, { color: theme.colors.textSecondary }]}>{formatDateLabel(section.date)}</Text>
              {[...section.items].sort(byDateDesc).map((tx) => (
                <TransactionTile
                  key={tx.id}
                  transaction={tx}
                  onPress={() => navigation.navigate('TransactionForm', { transaction: tx })}
                  onDelete={handleDelete}
                />
              ))}
            </View>
          )}
        />
      )}

      <PopInView delay={300} from={0.6}>
        <AnimatedIconButton style={[styles.fab, { backgroundColor: theme.colors.primary }, theme.shadow.hero]} onPress={() => navigation.navigate('TransactionForm', {})}>
          <Ionicons name="add" size={30} color="#FFF" />
        </AnimatedIconButton>
      </PopInView>

      {/* Advanced Filters Modal */}
      <Modal visible={showFilters} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.filterModal, { backgroundColor: theme.colors.card }]}>
            <View style={styles.filterModalHeader}>
              <Text style={[styles.filterModalTitle, { color: theme.colors.text }]}>Filtros avanzados</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}><Ionicons name="close" size={22} color={theme.colors.textSecondary} /></TouchableOpacity>
            </View>

            <Text style={[styles.filterLabel, { color: theme.colors.textSecondary }]}>Categoría</Text>
            <View style={styles.chipRow}>
              <PressableScale style={[styles.chip, { backgroundColor: theme.colors.surface }, filterCategory === 'all' && { backgroundColor: theme.colors.primary }]} onPress={() => setFilterCategory('all')} scaleTo={0.92}>
                <Text style={[styles.chipText, { color: filterCategory === 'all' ? '#FFF' : theme.colors.textSecondary }]}>Todas</Text>
              </PressableScale>
              {allCategories.map((c, idx) => (
                <PressableScale key={`${c.name}_${idx}`} style={[styles.chip, { backgroundColor: theme.colors.surface }, filterCategory === c.name && { backgroundColor: theme.colors.primary }]} onPress={() => setFilterCategory(c.name)} scaleTo={0.92}>
                  <Text style={[styles.chipText, { color: filterCategory === c.name ? '#FFF' : theme.colors.textSecondary }]}>{c.label}</Text>
                </PressableScale>
              ))}
            </View>

            <Text style={[styles.filterLabel, { color: theme.colors.textSecondary }]}>Método de pago</Text>
            <View style={styles.chipRow}>
              <PressableScale style={[styles.chip, { backgroundColor: theme.colors.surface }, filterPayment === 'all' && { backgroundColor: theme.colors.primary }]} onPress={() => setFilterPayment('all')} scaleTo={0.92}>
                <Text style={[styles.chipText, { color: filterPayment === 'all' ? '#FFF' : theme.colors.textSecondary }]}>Todos</Text>
              </PressableScale>
              {PAYMENT_METHODS.map((pm) => (
                <PressableScale key={pm} style={[styles.chip, { backgroundColor: theme.colors.surface }, filterPayment === pm && { backgroundColor: theme.colors.primary }]} onPress={() => setFilterPayment(pm)} scaleTo={0.92}>
                  <Text style={[styles.chipText, { color: filterPayment === pm ? '#FFF' : theme.colors.textSecondary }]}>{pm}</Text>
                </PressableScale>
              ))}
            </View>

            <Text style={[styles.filterLabel, { color: theme.colors.textSecondary }]}>Fecha desde</Text>
            <TouchableOpacity style={[styles.dateBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={() => setShowDateFrom(true)}>
              <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} />
              <Text style={{ color: theme.colors.text, fontSize: 14 }}>{filterDateFrom ? formatDate(new Date(filterDateFrom)) : 'Seleccionar fecha'}</Text>
            </TouchableOpacity>

            <Text style={[styles.filterLabel, { color: theme.colors.textSecondary }]}>Fecha hasta</Text>
            <TouchableOpacity style={[styles.dateBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={() => setShowDateTo(true)}>
              <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} />
              <Text style={{ color: theme.colors.text, fontSize: 14 }}>{filterDateTo ? formatDate(new Date(filterDateTo)) : 'Seleccionar fecha'}</Text>
            </TouchableOpacity>

            <Text style={[styles.filterLabel, { color: theme.colors.textSecondary }]}>Rango de monto</Text>
            <View style={styles.amountRange}>
              <TextInput style={[styles.amountInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]} placeholder="Mín" placeholderTextColor={theme.colors.textSecondary} value={minAmount} onChangeText={setMinAmount} keyboardType="decimal-pad" />
              <Text style={{ color: theme.colors.textSecondary }}>—</Text>
              <TextInput style={[styles.amountInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]} placeholder="Máx" placeholderTextColor={theme.colors.textSecondary} value={maxAmount} onChangeText={setMaxAmount} keyboardType="decimal-pad" />
            </View>

            <View style={styles.filterModalActions}>
              <PressableScale containerStyle={styles.filterModalBtnWrap} style={[styles.filterModalBtn, { backgroundColor: theme.colors.surface }]} onPress={clearFilters} scaleTo={0.96}>
                <Text style={{ color: theme.colors.textSecondary, fontWeight: '600' }}>Limpiar</Text>
              </PressableScale>
              <PressableScale containerStyle={styles.filterModalBtnWrap} style={[styles.filterModalBtn, { backgroundColor: theme.colors.primary }]} onPress={() => setShowFilters(false)} scaleTo={0.96}>
                <Text style={{ color: '#FFF', fontWeight: '600' }}>Aplicar</Text>
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>

      <CalendarDatePicker
        visible={showDateFrom}
        date={filterDateFrom ? new Date(filterDateFrom) : new Date()}
        theme={theme}
        onConfirm={(d) => { setFilterDateFrom(d.toISOString()); setShowDateFrom(false); }}
        onCancel={() => setShowDateFrom(false)}
      />
      <CalendarDatePicker
        visible={showDateTo}
        date={filterDateTo ? new Date(filterDateTo) : new Date()}
        theme={theme}
        onConfirm={(d) => { setFilterDateTo(d.toISOString()); setShowDateTo(false); }}
        onCancel={() => setShowDateTo(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.4 },
  searchRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginTop: 14, marginBottom: 10, alignItems: 'center' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, height: 48, gap: 8 },
  searchInput: { flex: 1, fontSize: 14.5, padding: 0 },
  filterToggle: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  filterCount: { position: 'absolute', top: -5, right: -5, backgroundColor: '#F43F5E', color: '#FFF', fontSize: 10, fontWeight: 'bold', width: 18, height: 18, borderRadius: 9, textAlign: 'center', lineHeight: 18, overflow: 'hidden' },
  filterRow: { flexDirection: 'row', marginHorizontal: 20, gap: 6, marginBottom: 8, padding: 5, borderRadius: 16 },
  filterBtnWrap: { flex: 1 },
  filterBtn: { alignItems: 'center', paddingVertical: 9, borderRadius: 12 },
  filterText: { fontSize: 13, fontWeight: '700' },
  dateHeader: { fontSize: 12, fontWeight: '700', marginTop: 18, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: { width: 68, height: 68, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, marginTop: 14, fontWeight: '700' },
  emptySubtext: { fontSize: 13, marginTop: 4, textAlign: 'center' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  filterModal: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '86%' },
  filterModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  filterModalTitle: { fontSize: 20, fontWeight: '800' },
  filterLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14 },
  chipText: { fontSize: 13, fontWeight: '600' },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 14, padding: 14 },
  amountRange: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  amountInput: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 12, fontSize: 14, textAlign: 'center' },
  filterModalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  filterModalBtnWrap: { flex: 1 },
  filterModalBtn: { paddingVertical: 15, borderRadius: 16, alignItems: 'center' },
});
