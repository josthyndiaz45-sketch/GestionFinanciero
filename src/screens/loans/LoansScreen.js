import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, ScrollView, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../providers/ThemeContext';
import { useAuth } from '../../providers/AuthContext';
import { useLoans } from '../../providers/LoanContext';
import { useAppAlert } from '../../providers/AlertContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { createNewLoan, loanOutstanding, isLoanSettled, loanProgress, loansTotals } from '../../models/Loan';
import DatePickerField from '../../components/DatePickerField';

function daysUntil(iso) {
  if (!iso) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(iso);
  due.setHours(0, 0, 0, 0);
  return Math.round((due - today) / (1000 * 60 * 60 * 24));
}

function dueColor(days) {
  if (days === null) return '#64748B';
  if (days < 0) return '#F43F5E';
  if (days <= 3) return '#F59E0B';
  return '#10B981';
}

function dueLabel(days) {
  if (days === null) return '';
  if (days < 0) return `Venció hace ${Math.abs(days)} d`;
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  return `Vence en ${days} d`;
}

export default function LoansScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { loans, loadLoans, addLoan, editLoan, removeLoan, registerPayment } = useLoans();
  const { showAlert, showConfirm } = useAppAlert();

  const [tab, setTab] = useState('lent');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [direction, setDirection] = useState('lent');
  const [counterparty, setCounterparty] = useState('');
  const [amount, setAmount] = useState('');
  const [loanDate, setLoanDate] = useState(new Date());
  const [dueDate, setDueDate] = useState(null);
  const [note, setNote] = useState('');
  const [showLoanPicker, setShowLoanPicker] = useState(false);
  const [showDuePicker, setShowDuePicker] = useState(false);

  const [paying, setPaying] = useState(null);
  const [payAmount, setPayAmount] = useState('');

  useEffect(() => {
    if (user) loadLoans();
  }, [user]);

  const totals = loansTotals(loans);
  const list = loans
    .filter((l) => l.direction === tab)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const openCreate = () => {
    setEditing(null);
    setDirection(tab);
    setCounterparty('');
    setAmount('');
    setLoanDate(new Date());
    setDueDate(null);
    setNote('');
    setShowLoanPicker(false);
    setShowDuePicker(false);
    setShowModal(true);
  };

  const openEdit = (loan) => {
    setEditing(loan);
    setDirection(loan.direction);
    setCounterparty(loan.counterparty);
    setAmount(String(loan.amount));
    setLoanDate(loan.date ? new Date(loan.date) : new Date());
    setDueDate(loan.dueDate ? new Date(loan.dueDate) : null);
    setNote(loan.note || '');
    setShowLoanPicker(false);
    setShowDuePicker(false);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!counterparty.trim()) {
      showAlert('Error', 'Ingresa el nombre de la persona');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      showAlert('Error', 'Ingresa un monto válido');
      return;
    }
    const data = {
      userId: user.id,
      direction,
      counterparty: counterparty.trim(),
      amount: parseFloat(amount),
      date: loanDate.toISOString(),
      dueDate: dueDate ? dueDate.toISOString() : null,
      note: note.trim(),
    };
    try {
      if (editing) {
        await editLoan({ ...editing, ...data });
      } else {
        const loan = createNewLoan(user.id);
        Object.assign(loan, data);
        await addLoan(loan);
      }
      setShowModal(false);
    } catch (e) {
      showAlert('Error al guardar', e?.message || 'No se pudo guardar');
    }
  };

  const handleDelete = (loan) => {
    showConfirm(
      'Eliminar registro',
      `¿Eliminar "${loan.counterparty}"? El saldo dejará de considerar este ${loan.direction === 'lent' ? 'préstamo' : 'préstamo recibido'}.`,
      () => removeLoan(loan.id),
      'Eliminar'
    );
  };

  const openPay = (loan) => {
    setPaying(loan);
    setPayAmount('');
  };

  const submitPayment = async (value) => {
    if (!paying) return;
    if (!value || parseFloat(value) <= 0) {
      showAlert('Error', 'Ingresa un monto válido');
      return;
    }
    try {
      await registerPayment(paying, parseFloat(value));
      setPaying(null);
      setPayAmount('');
    } catch (e) {
      showAlert('Error', e?.message || 'No se pudo registrar el abono');
    }
  };

  const renderLoan = ({ item: loan }) => {
    const outstanding = loanOutstanding(loan);
    const settled = isLoanSettled(loan);
    const pct = loanProgress(loan);
    const isLent = loan.direction === 'lent';
    const accent = isLent ? '#10B981' : '#F43F5E';
    const days = daysUntil(loan.dueDate);
    return (
      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: `${accent}1A` }]}>
            <Ionicons name={isLent ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'} size={22} color={accent} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardName, { color: theme.colors.text }]} numberOfLines={1}>{loan.counterparty}</Text>
            <Text style={[styles.cardSub, { color: theme.colors.textSecondary }]}>
              {isLent ? 'Presté' : 'Me prestaron'} · {formatDate(loan.date)}
            </Text>
          </View>
          {settled && (
            <View style={[styles.badge, { backgroundColor: `${accent}1A` }]}>
              <Text style={[styles.badgeText, { color: accent }]}>{isLent ? 'Cobrado' : 'Pagado'}</Text>
            </View>
          )}
        </View>

        <View style={styles.amountRow}>
          <Text style={[styles.amountTotal, { color: theme.colors.text }]}>{formatCurrency(loan.amount)}</Text>
          <Text style={[styles.amountRest, { color: settled ? '#10B981' : accent }]}>
            {settled ? 'Liquidado' : `${formatCurrency(outstanding)} ${isLent ? 'por cobrar' : 'por pagar'}`}
          </Text>
        </View>

        <View style={[styles.progressBg, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: accent }]} />
        </View>

        {loan.dueDate && !settled && (
          <View style={styles.dueRow}>
            <Ionicons name="calendar-outline" size={13} color={dueColor(days)} />
            <Text style={[styles.dueText, { color: dueColor(days) }]}>{dueLabel(days)}</Text>
          </View>
        )}
        {loan.note ? (
          <Text style={[styles.note, { color: theme.colors.textSecondary }]} numberOfLines={2}>{loan.note}</Text>
        ) : null}

        <View style={styles.actions}>
          {!settled && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: `${accent}1A` }]} onPress={() => openPay(loan)}>
              <Ionicons name={isLent ? 'cash-outline' : 'wallet-outline'} size={17} color={accent} />
              <Text style={[styles.actionText, { color: accent }]}>{isLent ? 'Cobrar' : 'Pagar'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EFF6FF' }]} onPress={() => openEdit(loan)}>
            <Ionicons name="pencil-outline" size={17} color="#3B82F6" />
            <Text style={[styles.actionText, { color: '#3B82F6' }]}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FFF1F2' }]} onPress={() => handleDelete(loan)}>
            <Ionicons name="trash-outline" size={17} color="#F43F5E" />
            <Text style={[styles.actionText, { color: '#F43F5E' }]}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const inputStyle = { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border };
  const outstandingPaying = paying ? loanOutstanding(paying) : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListHeaderComponent={(
          <>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: '#ECFDF5', borderColor: '#D1FAE5' }]}>
                <Ionicons name="arrow-down-circle-outline" size={20} color="#10B981" />
                <Text style={[styles.summaryLabel, { color: '#065F46' }]}>Por cobrar</Text>
                <Text style={[styles.summaryAmount, { color: '#065F46' }]}>{formatCurrency(totals.porCobrar)}</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' }]}>
                <Ionicons name="arrow-up-circle-outline" size={20} color="#F43F5E" />
                <Text style={[styles.summaryLabel, { color: '#9F1239' }]}>Por pagar</Text>
                <Text style={[styles.summaryAmount, { color: '#9F1239' }]}>{formatCurrency(totals.porPagar)}</Text>
              </View>
            </View>

            <View style={styles.tabs}>
              {[
                { key: 'lent', label: 'Por cobrar' },
                { key: 'borrowed', label: 'Por pagar' },
              ].map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.tab, { backgroundColor: tab === t.key ? theme.colors.primary : theme.colors.surface }]}
                  onPress={() => setTab(t.key)}
                >
                  <Text style={{ color: tab === t.key ? '#FFF' : theme.colors.textSecondary, fontWeight: '600' }}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <Ionicons name="swap-horizontal-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {tab === 'lent' ? 'No tienes préstamos por cobrar' : 'No tienes deudas por pagar'}
            </Text>
          </View>
        )}
        renderItem={renderLoan}
      />

      <TouchableOpacity style={[styles.fab, { backgroundColor: theme.colors.primary }]} onPress={openCreate}>
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalWrap}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{editing ? 'Editar préstamo' : 'Nuevo préstamo / deuda'}</Text>

                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Tipo</Text>
                <View style={styles.typeRow}>
                  <TouchableOpacity
                    style={[styles.typeBtn, direction === 'lent' && { backgroundColor: '#10B981', borderColor: '#10B981' }, { borderColor: theme.colors.border }]}
                    onPress={() => setDirection('lent')}
                  >
                    <Ionicons name="arrow-down-circle-outline" size={16} color={direction === 'lent' ? '#FFF' : '#10B981'} />
                    <Text style={[styles.typeBtnText, { color: direction === 'lent' ? '#FFF' : '#10B981' }]}>Presté (me deben)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeBtn, direction === 'borrowed' && { backgroundColor: '#F43F5E', borderColor: '#F43F5E' }, { borderColor: theme.colors.border }]}
                    onPress={() => setDirection('borrowed')}
                  >
                    <Ionicons name="arrow-up-circle-outline" size={16} color={direction === 'borrowed' ? '#FFF' : '#F43F5E'} />
                    <Text style={[styles.typeBtnText, { color: direction === 'borrowed' ? '#FFF' : '#F43F5E' }]}>Me prestaron (debo)</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Persona</Text>
                <TextInput style={[styles.input, inputStyle]} placeholder="Nombre de la persona" placeholderTextColor={theme.colors.textSecondary} value={counterparty} onChangeText={setCounterparty} />

                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Monto (S/)</Text>
                <TextInput style={[styles.input, inputStyle]} placeholder="0.00" placeholderTextColor={theme.colors.textSecondary} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />

                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Fecha</Text>
                {showLoanPicker ? (
                  <DatePickerField
                    visible={showLoanPicker}
                    date={loanDate}
                    theme={theme}
                    onConfirm={(d) => setLoanDate(d)}
                    onCancel={() => setShowLoanPicker(false)}
                  />
                ) : (
                  <TouchableOpacity style={[styles.input, styles.dateBtn, inputStyle]} onPress={() => { Keyboard.dismiss(); setShowLoanPicker(true); }}>
                    <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
                    <Text style={{ color: theme.colors.text, fontSize: 15 }}>{formatDate(loanDate)}</Text>
                  </TouchableOpacity>
                )}

                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Vencimiento (opcional)</Text>
                {showDuePicker ? (
                  <DatePickerField
                    visible={showDuePicker}
                    date={dueDate || new Date()}
                    theme={theme}
                    onConfirm={(d) => setDueDate(d)}
                    onCancel={() => setShowDuePicker(false)}
                  />
                ) : (
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity style={[styles.input, styles.dateBtn, inputStyle, { flex: 1 }]} onPress={() => { Keyboard.dismiss(); setShowDuePicker(true); }}>
                      <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
                      <Text style={{ color: dueDate ? theme.colors.text : theme.colors.textSecondary, fontSize: 15 }}>
                        {dueDate ? formatDate(dueDate) : 'Sin fecha'}
                      </Text>
                    </TouchableOpacity>
                    {dueDate && (
                      <TouchableOpacity style={[styles.clearBtn, { borderColor: theme.colors.border }]} onPress={() => setDueDate(null)}>
                        <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Nota (opcional)</Text>
                <TextInput style={[styles.input, inputStyle]} placeholder="Detalle" placeholderTextColor={theme.colors.textSecondary} value={note} onChangeText={setNote} />

                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.colors.surface }]} onPress={() => setShowModal(false)}>
                    <Text style={{ color: theme.colors.textSecondary, fontWeight: '600' }}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.colors.primary }]} onPress={handleSave}>
                    <Text style={{ color: '#FFF', fontWeight: '600' }}>{editing ? 'Actualizar' : 'Crear'}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={!!paying} transparent animationType="fade">
        <View style={styles.centeredOverlay}>
          <View style={[styles.centeredCard, { backgroundColor: theme.colors.card }]}>
            <View style={[styles.centeredIcon, { backgroundColor: paying?.direction === 'lent' ? '#ECFDF5' : '#FFF1F2' }]}>
              <Ionicons name={paying?.direction === 'lent' ? 'cash-outline' : 'wallet-outline'} size={30} color={paying?.direction === 'lent' ? '#10B981' : '#F43F5E'} />
            </View>
            <Text style={[styles.modalTitle, { color: theme.colors.text, textAlign: 'center', marginBottom: 4 }]}>
              {paying?.direction === 'lent' ? 'Registrar cobro' : 'Registrar pago'}
            </Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 4 }}>{paying?.counterparty}</Text>
            <Text style={{ color: theme.colors.text, fontSize: 13, textAlign: 'center', marginBottom: 14 }}>
              Falta {formatCurrency(outstandingPaying)}
            </Text>
            <TextInput
              style={[styles.input, inputStyle, { alignSelf: 'stretch' }]}
              placeholder="Monto (S/)"
              placeholderTextColor={theme.colors.textSecondary}
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="decimal-pad"
              autoFocus
            />
            <TouchableOpacity
              style={[styles.linkBtn, { borderColor: theme.colors.border }]}
              onPress={() => setPayAmount(String(outstandingPaying))}
            >
              <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 13 }}>
                {paying?.direction === 'lent' ? 'Cobrar todo' : 'Pagar todo'}
              </Text>
            </TouchableOpacity>
            <View style={[styles.modalActions, { alignSelf: 'stretch' }]}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.colors.surface }]} onPress={() => { setPaying(null); setPayAmount(''); }}>
                <Text style={{ color: theme.colors.textSecondary, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: paying?.direction === 'lent' ? '#10B981' : '#F43F5E' }]} onPress={() => submitPayment(payAmount)}>
                <Text style={{ color: '#FFF', fontWeight: '600' }}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryCard: { flex: 1, padding: 16, borderRadius: 18, borderWidth: 1 },
  summaryLabel: { fontSize: 12, marginTop: 8, fontWeight: '600' },
  summaryAmount: { fontSize: 19, fontWeight: 'bold', marginTop: 2 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: 'bold' },
  cardSub: { fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 12, marginBottom: 8 },
  amountTotal: { fontSize: 18, fontWeight: 'bold' },
  amountRest: { fontSize: 13, fontWeight: '600' },
  progressBg: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 4 },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  dueText: { fontSize: 12, fontWeight: '600' },
  note: { fontSize: 12, marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 10 },
  actionText: { fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 15, marginTop: 12, textAlign: 'center' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 4 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  typeBtnText: { fontSize: 12, fontWeight: '600' },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clearBtn: { width: 50, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  centeredOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 24 },
  centeredCard: { width: '100%', borderRadius: 20, padding: 24, alignItems: 'center' },
  centeredIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  linkBtn: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginBottom: 4 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
});
