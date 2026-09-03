import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, SectionList, TextInput, Modal, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../providers/ThemeContext';
import { useAuth } from '../../providers/AuthContext';
import { useBudgets } from '../../providers/BudgetContext';
import { useTransactions } from '../../providers/TransactionContext';
import { useCategories } from '../../providers/CategoryContext';
import { useAppAlert } from '../../providers/AlertContext';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { createNewBudget } from '../../models/Budget';
import * as budgetService from '../../services/budgetService';

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function BudgetsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { budgets, loadBudgets, addBudget, editBudget, removeBudget } = useBudgets();
  const { transactions, loadTransactions } = useTransactions();
  const { getCategories } = useCategories();
  const { showAlert, showConfirm } = useAppAlert();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [category, setCategory] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [detailBudget, setDetailBudget] = useState(null);

  const expenseCategories = getCategories('expense');

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  useEffect(() => {
    if (user) {
      loadBudgets();
      loadTransactions();
    }
  }, [user]);

  const budgetKey = (b) => `${b.year}-${String(b.month).padStart(2, '0')}`;
  const isPastBudget = (b) => budgetKey(b) < currentKey;

  const activeBudgets = budgets.filter((b) => !isPastBudget(b)).sort((a, b) => budgetKey(a).localeCompare(budgetKey(b)));
  const pastBudgets = budgets.filter(isPastBudget).sort((a, b) => budgetKey(b).localeCompare(budgetKey(a)));

  const getBudgetSpent = (b) => {
    return transactions
      .filter((t) => t.type === 'expense' && t.category === b.category && new Date(t.date).getMonth() + 1 === b.month && new Date(t.date).getFullYear() === b.year)
      .reduce((s, t) => s + t.amount, 0);
  };

  const getBudgetTx = (b) => {
    return transactions
      .filter((t) => t.type === 'expense' && t.category === b.category && new Date(t.date).getMonth() + 1 === b.month && new Date(t.date).getFullYear() === b.year)
      .slice()
      .sort((a, x) => new Date(x.date) - new Date(a.date));
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
    if (!category) { showAlert('Error', 'Por favor selecciona una categoría antes de guardar'); return; }
    if (!monthlyLimit || parseFloat(monthlyLimit) <= 0) { showAlert('Error', 'Por favor ingresa un límite válido antes de guardar'); return; }
    const monthInt = parseInt(month);
    const yearInt = parseInt(year);
    if (!monthInt || monthInt < 1 || monthInt > 12) { showAlert('Error', 'Por favor ingresa un mes válido (1-12)'); return; }
    if (!yearInt || yearInt < 2000) { showAlert('Error', 'Por favor ingresa un año válido'); return; }
    const data = {
      userId: user.id,
      category,
      monthlyLimit: parseFloat(monthlyLimit),
      month: monthInt,
      year: yearInt,
    };
    try {
      const label = expenseCategories.find((c) => c.name === category)?.label || category;
      const allBudgets = await budgetService.getBudgets(user.id);
      const duplicate = allBudgets.some(
        (b) => b.category.toLowerCase() === category.toLowerCase() && b.month === monthInt && b.year === yearInt && b.id !== (editing ? editing.id : undefined)
      );
      if (duplicate) {
        showAlert('Error', `El nombre "${label}" ya está en uso para ese mes y año. Por favor ingresa un nombre diferente.`);
        return;
      }
      if (editing) {
        await editBudget({ ...editing, ...data });
      } else {
        const b = createNewBudget(user.id);
        Object.assign(b, data);
        await addBudget(b);
      }
      setShowModal(false);
      loadBudgets();
    } catch (e) {
      showAlert('Error', e.message);
    }
  };

  const handleDelete = (b) => {
    const cat = expenseCategories.find((c) => c.name === b.category);
    showConfirm('Eliminar presupuesto', `¿Eliminar presupuesto de ${cat?.label || b.category}?`, async () => {
      await removeBudget(b.id);
      loadBudgets();
    });
  };

  const renderBudget = ({ item: b }) => {
    const cat = expenseCategories.find((c) => c.name === b.category) || { label: b.category, color: '#6B7280', icon: 'ellipsis-horizontal-outline' };
    const spent = getBudgetSpent(b);
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

  const renderPastBudget = ({ item: b }) => {
    const cat = expenseCategories.find((c) => c.name === b.category) || { label: b.category, color: '#6B7280', icon: 'ellipsis-horizontal-outline' };
    const spent = getBudgetSpent(b);
    const pct = b.monthlyLimit > 0 ? Math.min((spent / b.monthlyLimit) * 100, 100) : 0;
    const barColor = getBarColor(pct);
    const exceeded = spent > b.monthlyLimit;
    const monthLabel = MONTH_NAMES[b.month - 1];

    return (
      <View style={[styles.pastCard, { backgroundColor: theme.colors.card, borderColor: exceeded ? '#F43F5E' : theme.colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: cat.color + '20' }]}>
            <Ionicons name={cat.icon} size={20} color={cat.color} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.catName, { color: theme.colors.text }]}>{cat.label}</Text>
            <Text style={[styles.spentText, { color: theme.colors.textSecondary }]}>
              {monthLabel} {b.year} · {formatCurrency(spent)} / {formatCurrency(b.monthlyLimit)}
            </Text>
          </View>
          <Text style={[styles.pctText, { color: barColor }]}>{Math.round(pct)}%</Text>
        </View>
        <View style={[styles.barBg, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
        </View>
        <Text style={[styles.pastStatus, { color: exceeded ? '#F43F5E' : '#10B981' }]}>
          {exceeded ? `Te pasaste por ${formatCurrency(spent - b.monthlyLimit)} del límite` : `Dentro del límite (faltó ${formatCurrency(b.monthlyLimit - spent)})`}
        </Text>
        <View style={styles.pastActions}>
          <TouchableOpacity style={[styles.pastBtn, { backgroundColor: theme.colors.surface }]} onPress={() => setDetailBudget(b)}>
            <Ionicons name="list-outline" size={15} color={theme.colors.primary} />
            <Text style={[styles.pastBtnText, { color: theme.colors.primary }]}>Ver movimientos</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const detail = detailBudget ? getBudgetTx(detailBudget) : [];
  const detailCat = detailBudget ? (expenseCategories.find((c) => c.name === detailBudget.category) || { label: detailBudget.category, color: '#6B7280', icon: 'ellipsis-horizontal-outline' }) : null;
  const detailSpent = detailBudget ? getBudgetSpent(detailBudget) : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SectionList
        sections={[
          { title: 'Presupuestos', data: activeBudgets, renderItem: renderBudget, key: 'active' },
          ...(pastBudgets.length > 0 ? [{ title: 'Historial (meses pasados)', data: pastBudgets, renderItem: renderPastBudget, key: 'past' }] : []),
        ]}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="wallet-outline" size={48} color={theme.colors.textSecondary} /><Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No hay presupuestos</Text></View>}
        renderSectionHeader={({ section }) => (
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>{section.title}</Text>
        )}
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
                {category ? expenseCategories.find((c) => c.name === category)?.label : 'Seleccionar categoría'}
              </Text>
            </TouchableOpacity>
            {showCatPicker && (
              <View style={[styles.catPicker, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                {expenseCategories.map((c) => (
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

      <Modal visible={!!detailBudget} transparent animationType="slide" onRequestClose={() => setDetailBudget(null)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalKeyboard}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
              <View style={styles.detailHeader}>
                <View style={[styles.detailIconBox, { backgroundColor: (detailCat?.color || '#6B7280') + '20' }]}>
                  <Ionicons name={detailCat?.icon || 'pricetag-outline'} size={22} color={detailCat?.color || '#6B7280'} />
                </View>
                <View style={styles.detailHeaderInfo}>
                  <Text style={[styles.detailTitle, { color: theme.colors.text }]}>{detailCat?.label}</Text>
                  <Text style={[styles.detailSub, { color: theme.colors.textSecondary }]}>
                    {detailBudget ? `${MONTH_NAMES[detailBudget.month - 1]} ${detailBudget.year}` : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setDetailBudget(null)} style={styles.detailClose}>
                  <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={[styles.detailSummary, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.detailSummaryRow, { color: theme.colors.text }]}>
                  Gastado: <Text style={{ fontWeight: 'bold' }}>{formatCurrency(detailSpent)}</Text>
                </Text>
                <Text style={[styles.detailSummaryRow, { color: theme.colors.text }]}>
                  Límite: <Text style={{ fontWeight: 'bold' }}>{formatCurrency(detailBudget?.monthlyLimit || 0)}</Text>
                </Text>
                <Text style={[styles.detailSummaryRow, { color: detailSpent > (detailBudget?.monthlyLimit || 0) ? '#F43F5E' : '#10B981', fontWeight: '600' }]}>
                  {detailSpent > (detailBudget?.monthlyLimit || 0)
                    ? `Excedido por ${formatCurrency(detailSpent - (detailBudget?.monthlyLimit || 0))}`
                    : `Dentro del límite (faltó ${formatCurrency((detailBudget?.monthlyLimit || 0) - detailSpent)})`}
                </Text>
              </View>
              <ScrollView style={styles.detailList} showsVerticalScrollIndicator={false}>
                {detail.length === 0 ? (
                  <Text style={[styles.detailEmpty, { color: theme.colors.textSecondary }]}>No hay movimientos en esa categoría para este mes</Text>
                ) : (
                  detail.map((tx) => (
                    <View key={tx.id} style={[styles.detailItem, { borderBottomColor: theme.colors.border }]}>
                      <View style={styles.detailItemLeft}>
                        <Text style={[styles.detailDesc, { color: theme.colors.text }]} numberOfLines={1}>{tx.description}</Text>
                        <Text style={[styles.detailDate, { color: theme.colors.textSecondary }]}>{formatDateTime(tx.date)}</Text>
                      </View>
                      <Text style={[styles.detailAmount, { color: '#F43F5E' }]}>-{formatCurrency(tx.amount)}</Text>
                    </View>
                  ))
                )}
              </ScrollView>
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
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 10, marginLeft: 4 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  pastCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardInfo: { flex: 1 },
  catName: { fontSize: 15, fontWeight: 'bold' },
  spentText: { fontSize: 13, marginTop: 2 },
  pctText: { fontSize: 18, fontWeight: 'bold' },
  barBg: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
  barFill: { height: '100%', borderRadius: 4 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16 },
  pastStatus: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  pastActions: { marginTop: 10 },
  pastBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12 },
  pastBtnText: { fontSize: 13, fontWeight: '600' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalKeyboard: { justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 12 },
  rowInputs: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  catPicker: { borderWidth: 1, borderRadius: 12, marginTop: -8, marginBottom: 12, overflow: 'hidden' },
  catItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 0.5 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  detailIconBox: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  detailHeaderInfo: { flex: 1 },
  detailTitle: { fontSize: 18, fontWeight: 'bold' },
  detailSub: { fontSize: 13, marginTop: 2 },
  detailClose: { padding: 4 },
  detailSummary: { borderRadius: 14, padding: 14, marginBottom: 16 },
  detailSummaryRow: { fontSize: 14, marginBottom: 4 },
  detailList: { flexGrow: 0, maxHeight: 320 },
  detailEmpty: { textAlign: 'center', paddingVertical: 30, fontSize: 14 },
  detailItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5 },
  detailItemLeft: { flex: 1, paddingRight: 12 },
  detailDesc: { fontSize: 15, fontWeight: '600' },
  detailDate: { fontSize: 12, marginTop: 2 },
  detailAmount: { fontSize: 15, fontWeight: 'bold' },
});
