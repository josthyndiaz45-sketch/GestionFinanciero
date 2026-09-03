import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../providers/ThemeContext';
import { useReminders } from '../../providers/ReminderContext';
import { useAppAlert } from '../../providers/AlertContext';
import { formatCurrency } from '../../utils/formatters';
import { createReminderTemplate } from '../../services/reminderService';
import { scheduleReminderNotifications, cancelReminderNotifications, SOUND_OPTIONS, ALERT_TIMING_OPTIONS } from '../../services/notificationService';

function getMonthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function clampDay(year, month, day) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Math.min(day, lastDay);
}

function isPaidForCurrentMonth(r) {
  return (r.paidMonths || []).includes(getMonthKey(new Date()));
}

function isOverdue(r) {
  if (isPaidForCurrentMonth(r)) return false;
  const now = new Date();
  const thisMonthDue = clampDay(now.getFullYear(), now.getMonth(), r.dayOfMonth || 1);
  return now.getDate() > thisMonthDue;
}

function daysUntilDue(dayOfMonth) {
  const now = new Date();
  const today = now.getDate();
  const due = clampDay(now.getFullYear(), now.getMonth(), dayOfMonth);
  if (today <= due) {
    return due - today;
  }
  const nextDue = clampDay(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return (daysInMonth - today) + nextDue;
}

function dueLabel(days) {
  if (days <= 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  return `Vence en ${days} días`;
}

function dueColor(days, overdue) {
  if (overdue) return '#F43F5E';
  if (days <= 0) return '#F43F5E';
  if (days <= 3) return '#F59E0B';
  return '#10B981';
}

const SOUND_ICONS = { default: 'volume-high-outline', urgent: 'alert-circle-outline', soft: 'musical-notes-outline', chime: 'notifications-outline' };

export default function RemindersScreen() {
  const { theme } = useTheme();
  const { reminders, loadReminders, addReminder, editReminder, removeReminder } = useReminders();
  const { showAlert, showConfirm } = useAppAlert();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState(new Date().getDate());
  const [endYear, setEndYear] = useState('');
  const [indefinite, setIndefinite] = useState(true);
  const [note, setNote] = useState('');
  const [alertTiming, setAlertTiming] = useState(0);
  const [sound, setSound] = useState('default');
  const [showDayGrid, setShowDayGrid] = useState(false);

  useEffect(() => { loadReminders(); }, []);

  const openCreate = () => {
    setEditing(null);
    setName(''); setAmount(''); setDayOfMonth(new Date().getDate()); setEndYear(''); setIndefinite(true); setNote(''); setAlertTiming(0); setSound('default');
    setShowDayGrid(false);
    setShowModal(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setName(r.name);
    setAmount(String(r.amount));
    setDayOfMonth(r.dayOfMonth || 1);
    setEndYear(r.endYear ? String(r.endYear) : '');
    setIndefinite(r.indefinite !== false);
    setNote(r.note || '');
    setAlertTiming(r.alertTiming ?? 0);
    setSound(r.sound || 'default');
    setShowDayGrid(false);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { showAlert('Error', 'Por favor ingresa un nombre antes de guardar'); return; }
    if (!amount || parseFloat(amount) <= 0) { showAlert('Error', 'Por favor ingresa un monto válido antes de guardar'); return; }
    const data = {
      name: name.trim(),
      amount: parseFloat(amount),
      dayOfMonth,
      endYear: indefinite ? null : parseInt(endYear) || null,
      indefinite,
      note: note.trim(),
      alertTiming,
      sound,
    };
    try {
      let saved;
      if (editing) {
        saved = await editReminder({ ...editing, ...data });
      } else {
        const r = createReminderTemplate();
        Object.assign(r, data);
        saved = await addReminder(r);
      }
      await cancelReminderNotifications(saved);
      const ids = await scheduleReminderNotifications(saved);
      if (ids && ids.length > 0) {
        await editReminder({ ...saved, notificationIds: ids });
      }
      setShowModal(false);
    } catch (e) {
      showAlert('Error', e.message);
    }
  };

  const handleDelete = (r) => {
    showConfirm('Eliminar recordatorio', `¿Eliminar "${r.name}"?`, async () => {
      await cancelReminderNotifications(r);
      await removeReminder(r.id);
    });
  };

  const handleTogglePaid = async (r) => {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const paidMonths = r.paidMonths || [];
    const isPaid = paidMonths.includes(key);
    const newPaidMonths = isPaid ? paidMonths.filter((m) => m !== key) : [...paidMonths, key];
    const updated = await editReminder({ ...r, paidMonths: newPaidMonths });
    await cancelReminderNotifications(updated);
    const ids = await scheduleReminderNotifications(updated);
    if (ids && ids.length > 0) {
      await editReminder({ ...updated, notificationIds: ids });
    }
  };

  const sorted = [...reminders].sort((a, b) => {
    const aPaid = isPaidForCurrentMonth(a);
    const bPaid = isPaidForCurrentMonth(b);
    if (aPaid !== bPaid) return aPaid ? 1 : -1;
    return a.dayOfMonth - b.dayOfMonth;
  });

  const inputStyle = { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No hay recordatorios</Text>
          </View>
        }
        renderItem={({ item: r }) => {
          const days = daysUntilDue(r.dayOfMonth);
          const paid = isPaidForCurrentMonth(r);
          const overdue = isOverdue(r);
          const dColor = dueColor(days, overdue);
          const soundLabel = SOUND_OPTIONS.find((s) => s.id === r.sound)?.label || 'Predeterminado';
          const alertLabel = ALERT_TIMING_OPTIONS.find((a) => a.id === r.alertTiming)?.label || 'El mismo día';
          return (
            <View style={[styles.card, { backgroundColor: theme.colors.card, opacity: paid ? 0.5 : 1, borderColor: overdue ? '#F43F5E' : theme.colors.border }]}>
              <View style={styles.cardLeft}>
                <TouchableOpacity onPress={() => handleTogglePaid(r)} style={[styles.checkBtn, { borderColor: paid ? '#10B981' : theme.colors.border, backgroundColor: paid ? '#10B981' : 'transparent' }]}>
                  {paid && <Ionicons name="checkmark" size={14} color="#FFF" />}
                </TouchableOpacity>
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardName, { color: theme.colors.text, textDecorationLine: paid ? 'line-through' : 'none' }]}>{r.name}</Text>
                <Text style={[styles.cardDue, { color: dColor }]}>
                  {paid ? 'Pagado este mes' : overdue ? 'Vencido' : dueLabel(days)}
                </Text>
                <Text style={[styles.cardRepeat, { color: theme.colors.textSecondary }]}>
                  Cada mes día {r.dayOfMonth}{r.indefinite ? ' · Sin fecha de fin' : r.endYear ? ` · Hasta ${r.endYear}` : ''}
                </Text>
                <View style={styles.cardMeta}>
                  <Ionicons name="alarm-outline" size={11} color={theme.colors.textSecondary} />
                  <Text style={[styles.cardMetaText, { color: theme.colors.textSecondary }]}>Avisa: {alertLabel}</Text>
                  <Ionicons name={SOUND_ICONS[r.sound] || 'volume-high-outline'} size={11} color={theme.colors.textSecondary} style={{ marginLeft: 8 }} />
                  <Text style={[styles.cardMetaText, { color: theme.colors.textSecondary }]}>{soundLabel}</Text>
                </View>
                {r.note ? <Text style={[styles.cardNote, { color: theme.colors.textSecondary }]}>{r.note}</Text> : null}
              </View>
              <View style={styles.cardRight}>
                <Text style={[styles.cardAmount, { color: theme.colors.text }]}>{formatCurrency(r.amount)}</Text>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => openEdit(r)}><Ionicons name="pencil-outline" size={16} color="#3B82F6" /></TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(r)}><Ionicons name="trash-outline" size={16} color="#F43F5E" /></TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />

      <TouchableOpacity style={[styles.fab, { backgroundColor: theme.colors.primary }]} onPress={openCreate}>
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalKeyboard}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {showDayGrid ? (
                  <>
                    <View style={styles.dayGridHeader}>
                      <TouchableOpacity onPress={() => setShowDayGrid(false)}>
                        <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
                      </TouchableOpacity>
                      <Text style={[styles.modalTitle, { marginBottom: 0, marginLeft: 8 }]}>Seleccionar día</Text>
                    </View>
                    <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginTop: 4 }]}>Día {dayOfMonth} seleccionado</Text>
                    <View style={styles.daysGrid}>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <TouchableOpacity
                          key={d}
                          style={[styles.dayCell, dayOfMonth === d && { backgroundColor: theme.colors.primary }, { borderColor: theme.colors.border }]}
                          onPress={() => { setDayOfMonth(d); setShowDayGrid(false); }}
                        >
                          <Text style={[styles.dayCellText, dayOfMonth === d && { color: '#FFF' }, { color: theme.colors.text }]}>{d}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{editing ? 'Editar recordatorio' : 'Nuevo recordatorio'}</Text>
                    <TextInput style={[styles.input, inputStyle]} placeholder="Nombre (ej: Internet)" placeholderTextColor={theme.colors.textSecondary} value={name} onChangeText={setName} />
                    <TextInput style={[styles.input, inputStyle]} placeholder="Monto (S/)" placeholderTextColor={theme.colors.textSecondary} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />

                    <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Día de pago mensual</Text>
                    <TouchableOpacity style={[styles.input, styles.dateBtn, inputStyle]} onPress={() => setShowDayGrid(true)}>
                      <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
                      <Text style={{ color: theme.colors.text, fontSize: 15 }}>Día {dayOfMonth} de cada mes</Text>
                    </TouchableOpacity>

                    <View style={styles.toggleRow}>
                      <TouchableOpacity style={[styles.toggleBtn, indefinite && { backgroundColor: theme.colors.primary }]} onPress={() => setIndefinite(true)}>
                        <Ionicons name="infinite-outline" size={16} color={indefinite ? '#FFF' : theme.colors.textSecondary} />
                        <Text style={[styles.toggleText, indefinite && { color: '#FFF' }]}>Sin fecha de fin</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.toggleBtn, !indefinite && { backgroundColor: theme.colors.primary }]} onPress={() => setIndefinite(false)}>
                        <Ionicons name="calendar" size={16} color={!indefinite ? '#FFF' : theme.colors.textSecondary} />
                        <Text style={[styles.toggleText, !indefinite && { color: '#FFF' }]}>Tiene fecha de fin</Text>
                      </TouchableOpacity>
                    </View>

                    {!indefinite && (
                      <>
                        <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Año de finalización</Text>
                        <TextInput style={[styles.input, inputStyle]} placeholder="Ej: 2027" placeholderTextColor={theme.colors.textSecondary} value={endYear} onChangeText={setEndYear} keyboardType="number-pad" maxLength={4} />
                      </>
                    )}

                    <TextInput style={[styles.input, inputStyle]} placeholder="Nota (opcional)" placeholderTextColor={theme.colors.textSecondary} value={note} onChangeText={setNote} />

                    <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Avisar</Text>
                    <View style={styles.chipRow}>
                      {ALERT_TIMING_OPTIONS.map((opt) => (
                        <TouchableOpacity
                          key={opt.id}
                          style={[styles.chip, alertTiming === opt.id && { backgroundColor: theme.colors.primary }, { borderColor: theme.colors.border }]}
                          onPress={() => setAlertTiming(opt.id)}
                        >
                          <Text style={[styles.chipText, alertTiming === opt.id && { color: '#FFF' }, { color: theme.colors.text }]}>{opt.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Tono de notificación</Text>
                    <View style={styles.chipRow}>
                      {SOUND_OPTIONS.map((opt) => (
                        <TouchableOpacity
                          key={opt.id}
                          style={[styles.chip, sound === opt.id && { backgroundColor: theme.colors.primary }, { borderColor: theme.colors.border }]}
                          onPress={() => setSound(opt.id)}
                        >
                          <Ionicons name={SOUND_ICONS[opt.id] || 'volume-high-outline'} size={14} color={sound === opt.id ? '#FFF' : theme.colors.text} />
                          <Text style={[styles.chipText, sound === opt.id && { color: '#FFF' }, { color: theme.colors.text }]}>{opt.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={styles.modalActions}>
                      <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.colors.surface }]} onPress={() => setShowModal(false)}><Text style={{ color: theme.colors.textSecondary, fontWeight: '600' }}>Cancelar</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.colors.primary }]} onPress={handleSave}><Text style={{ color: '#FFF', fontWeight: '600' }}>{editing ? 'Actualizar' : 'Crear'}</Text></TouchableOpacity>
                    </View>
                  </>
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
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  cardLeft: { marginRight: 12 },
  checkBtn: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '600' },
  cardDue: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  cardRepeat: { fontSize: 11, marginTop: 2 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  cardMetaText: { fontSize: 10, marginLeft: 3 },
  cardNote: { fontSize: 11, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  cardAmount: { fontSize: 15, fontWeight: 'bold' },
  cardActions: { flexDirection: 'row', gap: 10 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalKeyboard: { justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '500', marginBottom: 6 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: '#E5E7EB' },
  toggleText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  dayGridHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayCell: { width: '14%', aspectRatio: 1, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  dayCellText: { fontSize: 15, fontWeight: '600' },
});
