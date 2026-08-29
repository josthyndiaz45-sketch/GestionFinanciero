import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, ScrollView, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../providers/ThemeContext';
import { useAuth } from '../../providers/AuthContext';
import { useSavingGoals } from '../../providers/SavingGoalContext';
import { useTransactions } from '../../providers/TransactionContext';
import { useAppAlert } from '../../providers/AlertContext';
import { formatCurrency } from '../../utils/formatters';
import { createNewSavingGoal } from '../../models/SavingGoal';

function formatDisplayDate(d) {
  if (!d) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function parseDisplayDate(str) {
  if (!str || str.length < 10) return null;
  const parts = str.split('/');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  const d = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
  if (isNaN(d.getTime())) return null;
  return d;
}

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function MiniCalendar({ selectedDate, onSelect, onClose, theme }) {
  const [viewDate, setViewDate] = useState(selectedDate || new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <>
      <View style={styles.calHeader}>
        <TouchableOpacity onPress={() => setViewDate(new Date(year, month - 1, 1))}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.calTitle, { color: theme.colors.text }]}>{MONTH_NAMES[month]} {year}</Text>
        <TouchableOpacity onPress={() => setViewDate(new Date(year, month + 1, 1))}>
          <Ionicons name="chevron-forward" size={22} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.calWeekdays}>
        {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map((d) => (
          <Text key={d} style={[styles.calWeekday, { color: theme.colors.textSecondary }]}>{d}</Text>
        ))}
      </View>
      <View style={styles.calGrid}>
        {cells.map((d, i) => {
          if (d === null) return <View key={`e${i}`} style={styles.calCell} />;
          const isSelected = selectedDate && selectedDate.getDate() === d && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
          const isToday = new Date().getDate() === d && new Date().getMonth() === month && new Date().getFullYear() === year;
          return (
            <TouchableOpacity key={d} style={[styles.calCell, isSelected && { backgroundColor: theme.colors.primary, borderRadius: 20 }, isToday && !isSelected && { borderWidth: 1, borderColor: theme.colors.primary }]}
              onPress={() => onSelect(new Date(year, month, d))}>
              <Text style={[styles.calDay, isSelected && { color: '#FFF' }, { color: theme.colors.text }]}>{d}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity style={[styles.calCloseBtn, { backgroundColor: theme.colors.surface }]} onPress={onClose}>
        <Text style={{ color: theme.colors.textSecondary, fontWeight: '600' }}>Cerrar</Text>
      </TouchableOpacity>
    </>
  );
}

export default function SavingGoalsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { goals, loadGoals, addGoal, editGoal, removeGoal } = useSavingGoals();
  const { transactions } = useTransactions();
  const { showAlert, showConfirm } = useAppAlert();
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadlineDate, setDeadlineDate] = useState(null);
  const [showAddFunds, setShowAddFunds] = useState(null);
  const [addAmount, setAddAmount] = useState('');
  const [fundMode, setFundMode] = useState('add');
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    if (user) loadGoals();
  }, [user]);

  const openCreate = () => {
    setEditingGoal(null);
    setName(''); setTargetAmount(''); setCurrentAmount('0'); setDeadlineDate(null);
    setShowCalendar(false);
    setShowModal(true);
  };

  const openEdit = (goal) => {
    setEditingGoal(goal);
    setName(goal.name);
    setTargetAmount(String(goal.targetAmount));
    setCurrentAmount(String(goal.currentAmount));
    setDeadlineDate(goal.deadline ? new Date(goal.deadline) : null);
    setShowCalendar(false);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !targetAmount || parseFloat(targetAmount) <= 0) {
      showAlert('Error', 'Por favor rellena los campos requeridos: nombre y monto objetivo');
      return;
    }
    const data = {
      userId: user.id,
      name: name.trim(),
      targetAmount: parseFloat(targetAmount),
      currentAmount: parseFloat(currentAmount) || 0,
      deadline: deadlineDate ? deadlineDate.toISOString() : null,
    };
    try {
      if (editingGoal) {
        await editGoal({ ...editingGoal, ...data });
      } else {
        const goal = createNewSavingGoal(user.id);
        Object.assign(goal, data);
        await addGoal(goal);
      }
      setShowModal(false);
    } catch (e) {
      showAlert('Error', e.message);
    }
  };

  const handleAddFunds = async (goal) => {
    if (!addAmount || parseFloat(addAmount) <= 0) {
      showAlert('Error', 'Por favor ingresa un monto válido');
      return;
    }
    const amt = parseFloat(addAmount);
    const newAmount = fundMode === 'add' ? goal.currentAmount + amt : goal.currentAmount - amt;
    if (newAmount < 0) {
      showAlert('Error', 'No puedes revertir más de lo agregado');
      return;
    }
    try {
      await editGoal({ ...goal, currentAmount: newAmount });
      setShowAddFunds(null);
      setAddAmount('');
      setFundMode('add');
    } catch (e) {
      showAlert('Error', e.message);
    }
  };

  const handleDelete = (goal) => {
    showConfirm('Eliminar meta', `¿Eliminar "${goal.name}"?`, () => removeGoal(goal.id));
  };

  const renderGoal = ({ item: goal }) => {
    const pct = goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0;
    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(now.getMonth() - 3);
    const recentSavings = transactions
      .filter((t) => t.type === 'expense' && t.saving_goal_id === goal.id && new Date(t.date || t.createdAt) >= threeMonthsAgo)
      .reduce((sum, t) => sum + t.amount, 0);
    const avgPerMonth = recentSavings / 3;
    const remaining = Math.max(0, (goal.targetAmount || 0) - (goal.currentAmount || 0));
    const monthsLeft = avgPerMonth > 0 ? Math.ceil(remaining / avgPerMonth) : null;
    return (
      <View style={[styles.goalCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.goalHeader}>
          <View style={styles.goalInfo}>
            <Text style={[styles.goalName, { color: theme.colors.text }]}>{goal.name}</Text>
            <Text style={[styles.goalAmount, { color: theme.colors.textSecondary }]}>
              {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
            </Text>
          </View>
          <Text style={[styles.goalPct, { color: theme.colors.primary }]}>{Math.round(pct)}%</Text>
        </View>
        <View style={[styles.progressBg, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: theme.colors.primary }]} />
        </View>
        {monthsLeft !== null && (
          <Text style={[styles.estimatedTime, { color: pct >= 100 ? '#10B981' : '#3B82F6' }]}>
            {pct >= 100 ? 'Meta alcanzada' : `~${monthsLeft} meses restantes`}
          </Text>
        )}
        {goal.deadline && (
          <View style={styles.deadlineRow}>
            <Ionicons name="calendar-outline" size={13} color={theme.colors.textSecondary} />
            <Text style={[styles.deadline, { color: theme.colors.textSecondary }]}> Meta: {formatDisplayDate(new Date(goal.deadline))}</Text>
          </View>
        )}
        <View style={styles.goalActions}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ECFDF5' }]} onPress={() => { setShowAddFunds(goal); setAddAmount(''); setFundMode('add'); }}>
            <Ionicons name="add-circle-outline" size={18} color="#10B981" />
            <Text style={styles.actionText}>Agregar fondos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EFF6FF' }]} onPress={() => openEdit(goal)}>
            <Ionicons name="pencil-outline" size={18} color="#3B82F6" />
            <Text style={styles.actionText}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FFF1F2' }]} onPress={() => handleDelete(goal)}>
            <Ionicons name="trash-outline" size={18} color="#F43F5E" />
            <Text style={styles.actionText}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const inputStyle = { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={goals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="flag-outline" size={48} color={theme.colors.textSecondary} /><Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No hay metas aún</Text></View>}
        renderItem={renderGoal}
      />

      <TouchableOpacity style={[styles.fab, { backgroundColor: theme.colors.primary }]} onPress={openCreate}>
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalWrap}>
              <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
                  {showCalendar ? (
                    <>
                      <View style={styles.calBackHeader}>
                        <TouchableOpacity onPress={() => setShowCalendar(false)}>
                          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.modalTitle, { marginBottom: 0, marginLeft: 8 }]}>Fecha límite</Text>
                      </View>
                      {deadlineDate && <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginBottom: 8 }}>Seleccionado: {formatDisplayDate(deadlineDate)}</Text>}
                      <MiniCalendar selectedDate={deadlineDate} onSelect={(d) => { setDeadlineDate(d); setShowCalendar(false); }} onClose={() => setShowCalendar(false)} theme={theme} />
                    </>
                  ) : (
                    <>
                      <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{editingGoal ? 'Editar Meta' : 'Nueva Meta'}</Text>
                      <TextInput style={[styles.input, inputStyle]} placeholder="Nombre" placeholderTextColor={theme.colors.textSecondary} value={name} onChangeText={setName} />
                      <TextInput style={[styles.input, inputStyle]} placeholder="Monto objetivo (S/)" placeholderTextColor={theme.colors.textSecondary} value={targetAmount} onChangeText={setTargetAmount} keyboardType="decimal-pad" />
                      <TextInput style={[styles.input, inputStyle]} placeholder="Monto actual (S/)" placeholderTextColor={theme.colors.textSecondary} value={currentAmount} onChangeText={setCurrentAmount} keyboardType="decimal-pad" />

                      <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Fecha límite</Text>
                      <TouchableOpacity style={[styles.input, styles.dateBtn, inputStyle]} onPress={() => setShowCalendar(true)}>
                        <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
                        <Text style={{ color: deadlineDate ? theme.colors.text : theme.colors.textSecondary, fontSize: 15 }}>
                          {deadlineDate ? formatDisplayDate(deadlineDate) : 'Seleccionar fecha'}
                        </Text>
                      </TouchableOpacity>

                      <View style={styles.modalActions}>
                        <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.colors.surface }]} onPress={() => setShowModal(false)}><Text style={{ color: theme.colors.textSecondary, fontWeight: '600' }}>Cancelar</Text></TouchableOpacity>
                        <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.colors.primary }]} onPress={handleSave}><Text style={{ color: '#FFF', fontWeight: '600' }}>{editingGoal ? 'Actualizar' : 'Crear'}</Text></TouchableOpacity>
                      </View>
                    </>
                  )}
                </ScrollView>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={!!showAddFunds} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.centeredOverlay}>
            <View style={[styles.centeredCard, { backgroundColor: theme.colors.card }]}>
              <View style={[styles.centeredIcon, { backgroundColor: fundMode === 'add' ? '#ECFDF5' : '#FFF1F2' }]}>
                <Ionicons name={fundMode === 'add' ? 'add-circle' : 'remove-circle'} size={32} color={fundMode === 'add' ? '#10B981' : '#F43F5E'} />
              </View>
              <Text style={[styles.modalTitle, { color: theme.colors.text, textAlign: 'center', marginBottom: 4 }]}>Fondos</Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 12 }}>{showAddFunds?.name}</Text>

              <View style={styles.fundToggle}>
                <TouchableOpacity style={[styles.fundToggleBtn, fundMode === 'add' && { backgroundColor: '#10B981' }]} onPress={() => setFundMode('add')}>
                  <Ionicons name="add" size={16} color={fundMode === 'add' ? '#FFF' : '#10B981'} />
                  <Text style={[styles.fundToggleText, fundMode === 'add' && { color: '#FFF' }]}>Agregar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.fundToggleBtn, fundMode === 'sub' && { backgroundColor: '#F43F5E' }]} onPress={() => setFundMode('sub')}>
                  <Ionicons name="remove" size={16} color={fundMode === 'sub' ? '#FFF' : '#F43F5E'} />
                  <Text style={[styles.fundToggleText, fundMode === 'sub' && { color: '#FFF' }]}>Revertir</Text>
                </TouchableOpacity>
              </View>

              <TextInput style={[styles.input, inputStyle, { alignSelf: 'stretch' }]} placeholder="Monto (S/)" placeholderTextColor={theme.colors.textSecondary} value={addAmount} onChangeText={setAddAmount} keyboardType="decimal-pad" />
              <View style={[styles.modalActions, { alignSelf: 'stretch' }]}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.colors.surface }]} onPress={() => { setShowAddFunds(null); setFundMode('add'); }}><Text style={{ color: theme.colors.textSecondary, fontWeight: '600' }}>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: fundMode === 'add' ? '#10B981' : '#F43F5E' }]} onPress={() => handleAddFunds(showAddFunds)}><Text style={{ color: '#FFF', fontWeight: '600' }}>{fundMode === 'add' ? 'Agregar' : 'Revertir'}</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, marginTop: 12 },
  goalCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  goalInfo: { flex: 1 },
  goalName: { fontSize: 16, fontWeight: 'bold' },
  goalAmount: { fontSize: 13, marginTop: 2 },
  goalPct: { fontSize: 18, fontWeight: 'bold' },
  progressBg: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 4 },
  deadlineRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  deadline: { fontSize: 12 },
  estimatedTime: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  goalActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 10 },
  actionText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
  centeredOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  centeredCard: { width: '100%', borderRadius: 20, padding: 24, alignItems: 'center' },
  centeredIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  fundToggle: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginBottom: 16 },
  fundToggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  fundToggleText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '500', marginBottom: 6 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  calBackHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  calTitle: { fontSize: 17, fontWeight: 'bold' },
  calWeekdays: { flexDirection: 'row', marginBottom: 6 },
  calWeekday: { width: '14.28%', textAlign: 'center', fontSize: 12, fontWeight: '600' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  calDay: { fontSize: 15, fontWeight: '500' },
  calCloseBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 12 },
});
