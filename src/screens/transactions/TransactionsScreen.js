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
        <View style={[styles.searchBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Buscar..."
            placeholderTextColor={theme.colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} /></TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterToggle, { backgroundColor: activeFilterCount > 0 ? theme.colors.primary : theme.colors.card, borderColor: theme.colors.border }]}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="filter" size={18} color={activeFilterCount > 0 ? '#FFF' : theme.colors.textSecondary} />
          {activeFilterCount > 0 && <Text style={styles.filterCount}>{activeFilterCount}</Text>}
        </TouchableOpacity>
      </View>

      {/* Quick Type Filters */}
      <View style={styles.filterRow}>
        {[{ key: 'all', label: 'Todos' }, { key: 'income', label: 'Ingresos' }, { key: 'expense', label: 'Gastos' }].map((f) => (
          <TouchableOpacity key={f.key} style={[styles.filterBtn, filterType === f.key && { backgroundColor: theme.colors.primary }]} onPress={() => setFilterType(f.key)}>
            <Text style={[styles.filterText, filterType === f.key && { color: '#FFF' }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {sections.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={48} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No hay movimientos</Text>
        </View>
      ) : (
        <FlatList
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

      <TouchableOpacity style={[styles.fab, { backgroundColor: theme.colors.primary }]} onPress={() => navigation.navigate('TransactionForm', {})}>
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

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
              <TouchableOpacity style={[styles.chip, filterCategory === 'all' && { backgroundColor: theme.colors.primary }]} onPress={() => setFilterCategory('all')}>
                <Text style={[styles.chipText, filterCategory === 'all' && { color: '#FFF' }]}>Todas</Text>
              </TouchableOpacity>
              {allCategories.map((c, idx) => (
                <TouchableOpacity key={`${c.name}_${idx}`} style={[styles.chip, filterCategory === c.name && { backgroundColor: theme.colors.primary }]} onPress={() => setFilterCategory(c.name)}>
                  <Text style={[styles.chipText, filterCategory === c.name && { color: '#FFF' }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.filterLabel, { color: theme.colors.textSecondary }]}>Método de pago</Text>
            <View style={styles.chipRow}>
              <TouchableOpacity style={[styles.chip, filterPayment === 'all' && { backgroundColor: theme.colors.primary }]} onPress={() => setFilterPayment('all')}>
                <Text style={[styles.chipText, filterPayment === 'all' && { color: '#FFF' }]}>Todos</Text>
              </TouchableOpacity>
              {PAYMENT_METHODS.map((pm) => (
                <TouchableOpacity key={pm} style={[styles.chip, filterPayment === pm && { backgroundColor: theme.colors.primary }]} onPress={() => setFilterPayment(pm)}>
                  <Text style={[styles.chipText, filterPayment === pm && { color: '#FFF' }]}>{pm}</Text>
                </TouchableOpacity>
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
              <TouchableOpacity style={[styles.filterModalBtn, { backgroundColor: theme.colors.surface }]} onPress={clearFilters}>
                <Text style={{ color: theme.colors.textSecondary, fontWeight: '600' }}>Limpiar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterModalBtn, { backgroundColor: theme.colors.primary }]} onPress={() => setShowFilters(false)}>
                <Text style={{ color: '#FFF', fontWeight: '600' }}>Aplicar</Text>
              </TouchableOpacity>
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
  header: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: 'bold' },
  searchRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 8, alignItems: 'center' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 42, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  filterToggle: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  filterCount: { position: 'absolute', top: -4, right: -4, backgroundColor: '#F43F5E', color: '#FFF', fontSize: 10, fontWeight: 'bold', width: 16, height: 16, borderRadius: 8, textAlign: 'center', lineHeight: 16, overflow: 'hidden' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 8 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#E5E7EB' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  dateHeader: { fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 8, textTransform: 'uppercase' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, marginTop: 12 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  filterModal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
  filterModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  filterModalTitle: { fontSize: 20, fontWeight: 'bold' },
  filterLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginTop: 12, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: '#E5E7EB' },
  chipText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, padding: 12 },
  amountRange: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  amountInput: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 14, textAlign: 'center' },
  filterModalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  filterModalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
});
