import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, TextInput, Modal, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../providers/ThemeContext';
import { useAuth } from '../../providers/AuthContext';
import { useBudgets } from '../../providers/BudgetContext';
import { useTransactions } from '../../providers/TransactionContext';
import { EXPENSE_CATEGORIES } from '../../constants/constants';
import { formatCurrency } from '../../utils/formatters';
import { createNewBudget } from '../../models/Budget';

export default function BudgetsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { budgets, loadBudgets, addBudget, editBudget, removeBudget } = useBudgets();
  const { transactions, loadTransactions } = useTransactions();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [category, setCategory] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [showCatPicker, setShowCatPicker] = useState(false);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  useEffect(() => {
    if (user) {
      loadBudgets(currentMonth, currentYear);
      loadTransactions();
    }
  }, [user]);

  const getSpent = (cat) => {
    return transactions
      .filter((t) => t.type === 'expense' && t.category === cat && new Date(t.date).getMonth() + 1 === currentMonth && new Date(t.date).getFullYear() === currentYear)
      .reduce((s, t) => s + t.amount, 0);
  };

  const getBarColor = (pct) => {
    if (pct < 50) return '#10B981';
    if (pct < 80) return '#F59E0B';
    return '#F43F5E';
  };

  const openCreate = () => {
    setEditing(null);
    setCategory(''); setMonthlyLimit('');
    setMonth(String(currentMonth)); setYear(String(currentYear));
    setShowModal(true);
  };

  const openEdit = (b) => {
    setEditing(b);
    setCategory(b.category);
    setMonthlyLimit(String(b.monthlyLimit));
    setMonth(String(b.month)); setYear(String(b.year));
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!category) { Alert.alert('Error', 'Selecciona una categoría'); return; }
    if (!monthlyLimit || parseFloat(monthlyLimit) <= 0) { Alert.alert('Error', 'Ingresa un límite válido'); return; }
    const data = {
      userId: user.id,
      category,
      monthlyLimit: parseFloat(monthlyLimit),
      month: parseInt(month),
      year: parseInt(year),
    };
    try {
      if (editing) {
        await editBudget({ ...editing, ...data });
      } else {
        const b = createNewBudget(user.id);
        Object.assign(b, data);
        await addBudget(b);
      }
      setShowModal(false);
      loadBudgets(currentMonth, currentYear);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDelete = (b) => {
    const cat = EXPENSE_CATEGORIES.find((c) => c.name === b.category);
    Alert.alert('Eliminar presupuesto', `¿Eliminar presupuesto de ${cat?.label || b.category}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await removeBudget(b.id); loadBudgets(currentMonth, currentYear); } },
    ]);
  };

  const renderBudget = ({ item: b }) => {
    const cat = EXPENSE_CATEGORIES.find((c) => c.name === b.category) || { label: b.category, color: '#6B7280', icon: 'ellipsis-horizontal-outline' };
    const spent = getSpent(b.category);
    const pct = b.monthlyLimit > 0 ? Math.min((spent / b.monthlyLimit) * 100, 100) : 0;
    const barColor = getBarColor(pct);

    return (
      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: cat.color + '20' }]}>
            <Ionicons name={cat.icon} size={20} color={cat.color} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.catName, { color: theme.colors.text }]}>{cat.label}</Text>
            <Text style={[styles.spentText, { color: theme.colors.textSecondary }]}>
              {formatCurrency(spent)} / {formatCurrency(b.monthlyLimit)}
            </Text>
          </View>
          <Text style={[styles.pctText, { color: barColor }]}>{Math.round(pct)}%</Text>
        </View>
        <View style={[styles.barBg, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => openEdit(b)}>
            <Ionicons name="pencil-outline" size={18} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(b)}>
            <Ionicons name="trash-outline" size={18} color="#F43F5E" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={budgets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="wallet-outline" size={48} color={theme.colors.textSecondary} /><Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No hay presupuestos este mes</Text></View>}
        renderItem={renderBudget}
      />

      <TouchableOpacity style={[styles.fab, { backgroundColor: theme.colors.primary }]} onPress={openCreate}>
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalKeyboard}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{editing ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}</Text>

            <TouchableOpacity style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={() => setShowCatPicker(!showCatPicker)}>
              <Text style={{ color: category ? theme.colors.text : theme.colors.textSecondary }}>
                {category ? EXPENSE_CATEGORIES.find((c) => c.name === category)?.label : 'Seleccionar categoría'}
              </Text>
            </TouchableOpacity>
            {showCatPicker && (
              <View style={[styles.catPicker, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <TouchableOpacity key={c.name} style={[styles.catItem, { borderBottomColor: theme.colors.border }]} onPress={() => { setCategory(c.name); setShowCatPicker(false); }}>
                    <Ionicons name={c.icon} size={16} color={c.color} />
                    <Text style={{ marginLeft: 8, color: theme.colors.text }}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TextInput style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]} placeholder="Límite mensual (S/)" placeholderTextColor={theme.colors.textSecondary} value={monthlyLimit} onChangeText={setMonthlyLimit} keyboardType="decimal-pad" />

            <View style={styles.rowInputs}>
              <TextInput style={[styles.input, styles.halfInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]} placeholder="Mes" placeholderTextColor={theme.colors.textSecondary} value={month} onChangeText={setMonth} keyboardType="number-pad" />
              <TextInput style={[styles.input, styles.halfInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]} placeholder="Año" placeholderTextColor={theme.colors.textSecondary} value={year} onChangeText={setYear} keyboardType="number-pad" />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#E5E7EB' }]} onPress={() => setShowModal(false)}>
                <Text style={{ color: '#6B7280', fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.colors.primary }]} onPress={handleSave}>
                <Text style={{ color: '#FFF', fontWeight: '600' }}>{editing ? 'Actualizar' : 'Crear'}</Text>
              </TouchableOpacity>
            </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, marginTop: 12 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardInfo: { flex: 1 },
  catName: { fontSize: 15, fontWeight: 'bold' },
  spentText: { fontSize: 13, marginTop: 2 },
  pctText: { fontSize: 18, fontWeight: 'bold' },
  barBg: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
  barFill: { height: '100%', borderRadius: 4 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalKeyboard: { justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 12 },
  rowInputs: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  catPicker: { borderWidth: 1, borderRadius: 12, marginTop: -8, marginBottom: 12, overflow: 'hidden' },
  catItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 0.5 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
});
