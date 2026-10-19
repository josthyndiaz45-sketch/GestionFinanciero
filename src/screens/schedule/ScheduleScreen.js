import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../providers/ThemeContext';
import { useAuth } from '../../providers/AuthContext';
import {
  SCHEDULE_DAYS,
  SCHEDULE_COLORS,
  DEFAULT_BLOCK_COLOR,
  loadSchedule,
  addBlock,
  updateBlock,
  removeBlock,
  toggleBlockDone,
  sortBlocksForDay,
  blockMinutes,
  formatDuration,
  formatTimeLabel,
  minutesFromTime,
} from '../../services/scheduleService';

function pad2(n) {
  return String(n).padStart(2, '0');
}

function timeToLabel(t) {
  if (!t) return '--:--';
  return formatTimeLabel(t);
}

function shiftTime(time, deltaMinutes) {
  const total = Math.max(0, Math.min(23 * 60 + 59, minutesFromTime(time) + deltaMinutes));
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}

const HOURS = Array.from({ length: 24 }, (_, i) => pad2(i));
const MINUTES = Array.from({ length: 12 }, (_, i) => pad2(i * 5));

function TimePickerModal({ visible, value, onCancel, onConfirm, theme }) {
  const [hour, setHour] = useState('08');
  const [minute, setMinute] = useState('00');

  useEffect(() => {
    if (visible) {
      const [h, m] = (value || '08:00').split(':');
      setHour(h || '08');
      const mm = String(Math.round((parseInt(m || '0', 10)) / 5) * 5 % 60).padStart(2, '0');
      setMinute(MINUTES.includes(mm) ? mm : '00');
    }
  }, [visible, value]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.pickerBox, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.pickerTitle, { color: theme.colors.text }]}>Seleccionar hora</Text>
          <View style={styles.pickerRow}>
            <View style={styles.pickerColWrap}>
              <Text style={[styles.pickerColLabel, { color: theme.colors.textSecondary }]}>Hora</Text>
              <ScrollView style={styles.pickerCol} showsVerticalScrollIndicator={false}>
                {HOURS.map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[styles.pickerItem, hour === h && { backgroundColor: theme.colors.primary }]}
                    onPress={() => setHour(h)}
                  >
                    <Text style={[styles.pickerItemText, { color: hour === h ? '#FFF' : theme.colors.text }]}>{h}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <Text style={[styles.pickerColon, { color: theme.colors.text }]}>:</Text>
            <View style={styles.pickerColWrap}>
              <Text style={[styles.pickerColLabel, { color: theme.colors.textSecondary }]}>Min</Text>
              <ScrollView style={styles.pickerCol} showsVerticalScrollIndicator={false}>
                {MINUTES.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.pickerItem, minute === m && { backgroundColor: theme.colors.primary }]}
                    onPress={() => setMinute(m)}
                  >
                    <Text style={[styles.pickerItemText, { color: minute === m ? '#FFF' : theme.colors.text }]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.colors.surface }]} onPress={onCancel}>
              <Text style={{ color: theme.colors.textSecondary, fontWeight: '700' }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.colors.primary }]} onPress={() => onConfirm(`${hour}:${minute}`)}>
              <Text style={{ color: '#FFF', fontWeight: '700' }}>Listo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ScheduleScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [blocks, setBlocks] = useState([]);
  const [day, setDay] = useState(SCHEDULE_DAYS[0].key);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [color, setColor] = useState(DEFAULT_BLOCK_COLOR);
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('09:00');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const data = await loadSchedule(user?.id);
      if (mounted) {
        setBlocks(data);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user?.id]);

  const dayBlocks = useMemo(() => sortBlocksForDay(blocks, day), [blocks, day]);

  const totalMinutes = useMemo(() => dayBlocks.reduce((s, b) => s + blockMinutes(b), 0), [dayBlocks]);
  const doneCount = dayBlocks.filter((b) => b.done).length;

  const openCreate = () => {
    setEditing(null);
    setTitle('');
    setNote('');
    setColor(DEFAULT_BLOCK_COLOR);
    setStart('08:00');
    setEnd('09:00');
    setShowModal(true);
  };

  const openEdit = (b) => {
    setEditing(b);
    setTitle(b.title);
    setNote(b.note || '');
    setColor(b.color || DEFAULT_BLOCK_COLOR);
    setStart(b.start);
    setEnd(b.end);
    setShowModal(true);
  };

  const handleSave = async () => {
    const t = title.trim();
    if (!t) {
      Alert.alert('Falta el título', 'Escribe qué actividad vas a realizar.');
      return;
    }
    if (minutesFromTime(end) <= minutesFromTime(start)) {
      Alert.alert('Horario inválido', 'La hora de fin debe ser mayor que la de inicio.');
      return;
    }
    const payload = { day, title: t, note: note.trim(), color, start, end };
    if (editing) {
      const next = await updateBlock(user?.id, blocks, editing.id, payload);
      setBlocks(next);
    } else {
      const res = await addBlock(user?.id, blocks, payload);
      setBlocks(res.blocks);
    }
    setShowModal(false);
  };

  const handleDelete = (b) => {
    Alert.alert('Eliminar bloque', `¿Eliminar "${b.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const next = await removeBlock(user?.id, blocks, b.id);
          setBlocks(next);
        },
      },
    ]);
  };

  const handleToggle = async (b) => {
    const next = await toggleBlockDone(user?.id, blocks, b.id);
    setBlocks(next);
  };

  const handleClearDay = () => {
    const toRemove = dayBlocks.map((b) => b.id);
    if (toRemove.length === 0) return;
    Alert.alert('Vaciar día', `¿Eliminar todos los bloques de ${SCHEDULE_DAYS.find((d) => d.key === day)?.label}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Vaciar',
        style: 'destructive',
        onPress: async () => {
          let current = blocks;
          for (const id of toRemove) current = await removeBlock(user?.id, current, id);
          setBlocks(current);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <View style={styles.tabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {SCHEDULE_DAYS.map((d) => {
            const active = day === d.key;
            const count = sortBlocksForDay(blocks, d.key).length;
            return (
              <TouchableOpacity
                key={d.key}
                style={[styles.tab, { backgroundColor: active ? theme.colors.primary : theme.colors.card, borderColor: theme.colors.border }, active && theme.shadow.soft]}
                onPress={() => setDay(d.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, { color: active ? '#FFF' : theme.colors.text }]}>{d.short}</Text>
                {count > 0 && (
                  <View style={[styles.tabBadge, { backgroundColor: active ? 'rgba(255,255,255,0.28)' : theme.colors.primarySoft }]}>
                    <Text style={[styles.tabBadgeText, { color: active ? '#FFF' : theme.colors.primary }]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
          <Text style={[styles.summaryText, { color: theme.colors.text }]}>{formatDuration(totalMinutes)} planeado</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Ionicons name="checkmark-done-outline" size={16} color={theme.colors.income} />
          <Text style={[styles.summaryText, { color: theme.colors.text }]}>{doneCount}/{dayBlocks.length} hechos</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>Cargando…</Text>
        ) : dayBlocks.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.colors.primarySoft }]}>
              <Ionicons name="calendar-outline" size={28} color={theme.colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>Sin actividades este día</Text>
            <Text style={[styles.emptySub, { color: theme.colors.textSecondary }]}>Toca el botón + para agregar un bloque a tu rutina</Text>
          </View>
        ) : (
          dayBlocks.map((b) => (
            <TouchableOpacity
              key={b.id}
              style={[styles.blockCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, theme.shadow.soft]}
              onPress={() => openEdit(b)}
              activeOpacity={0.85}
            >
              <View style={[styles.blockAccent, { backgroundColor: b.color }]} />
              <View style={styles.blockTime}>
                <Text style={[styles.blockStart, { color: theme.colors.text }]}>{timeToLabel(b.start)}</Text>
                <Text style={[styles.blockEnd, { color: theme.colors.textSecondary }]}>{timeToLabel(b.end)}</Text>
              </View>
              <View style={[styles.blockDivider, { backgroundColor: theme.colors.border }]} />
              <View style={styles.blockInfo}>
                <Text
                  style={[styles.blockTitle, { color: theme.colors.text }, b.done && styles.blockTitleDone]}
                  numberOfLines={1}
                >
                  {b.title}
                </Text>
                <View style={styles.blockMetaRow}>
                  <Text style={[styles.blockMeta, { color: theme.colors.textSecondary }]}>{formatDuration(blockMinutes(b))}</Text>
                  {!!b.note && <Text style={[styles.blockMeta, { color: theme.colors.textSecondary }]} numberOfLines={1}>· {b.note}</Text>}
                </View>
              </View>
              <TouchableOpacity
                style={[styles.doneBtn, { borderColor: b.done ? theme.colors.income : theme.colors.border, backgroundColor: b.done ? theme.colors.income : 'transparent' }]}
                onPress={() => handleToggle(b)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="checkmark" size={16} color={b.done ? '#FFF' : theme.colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(b)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={17} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}

        {dayBlocks.length > 0 && (
          <TouchableOpacity style={[styles.clearBtn, { borderColor: theme.colors.danger }]} onPress={handleClearDay}>
            <Ionicons name="close-circle-outline" size={16} color={theme.colors.danger} />
            <Text style={[styles.clearText, { color: theme.colors.danger }]}>Vaciar este día</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <TouchableOpacity style={[styles.fab, { backgroundColor: theme.colors.primary }, theme.shadow.hero]} onPress={openCreate} activeOpacity={0.85}>
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>

      {/* Create / Edit modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ justifyContent: 'flex-end' }}>
            <View style={[styles.sheet, { backgroundColor: theme.colors.card }]}>
              <View style={[styles.sheetHeader, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>{editing ? 'Editar bloque' : 'Nuevo bloque'}</Text>
                <TouchableOpacity onPress={() => setShowModal(false)}><Ionicons name="close" size={24} color={theme.colors.textSecondary} /></TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={styles.sheetScroll} showsVerticalScrollIndicator={false}>
                <View style={[styles.dayPill, { backgroundColor: theme.colors.primarySoft }]}>
                  <Ionicons name="calendar-outline" size={14} color={theme.colors.primary} />
                  <Text style={[styles.dayPillText, { color: theme.colors.primary }]}>{SCHEDULE_DAYS.find((d) => d.key === day)?.label}</Text>
                </View>

                <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Actividad</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                  placeholder="Ej: Gimnasio, Estudiar, Trabajo…"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={title}
                  onChangeText={setTitle}
                />

                <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Horario</Text>
                <View style={styles.timeRow}>
                  <TouchableOpacity style={[styles.timeBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={() => setShowStartPicker(true)}>
                    <Text style={[styles.timeBtnLabel, { color: theme.colors.textSecondary }]}>Inicio</Text>
                    <Text style={[styles.timeBtnValue, { color: theme.colors.text }]}>{start}</Text>
                  </TouchableOpacity>
                  <Ionicons name="arrow-forward" size={18} color={theme.colors.textSecondary} />
                  <TouchableOpacity style={[styles.timeBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={() => setShowEndPicker(true)}>
                    <Text style={[styles.timeBtnLabel, { color: theme.colors.textSecondary }]}>Fin</Text>
                    <Text style={[styles.timeBtnValue, { color: theme.colors.text }]}>{end}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.quickAdjustRow}>
                  {[{ l: '-30m', d: -30 }, { l: '+30m', d: 30 }].map((q) => (
                    <TouchableOpacity key={q.l} style={[styles.quickChip, { borderColor: theme.colors.border }]} onPress={() => { const s = shiftTime(start, q.d); const e = shiftTime(end, q.d); setStart(s); setEnd(e); }}>
                      <Text style={[styles.quickChipText, { color: theme.colors.textSecondary }]}>{q.l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Color</Text>
                <View style={styles.colorRow}>
                  {SCHEDULE_COLORS.map((c) => (
                    <TouchableOpacity key={c} style={[styles.colorDot, { backgroundColor: c }, color === c && { borderColor: theme.colors.text, borderWidth: 2 }]} onPress={() => setColor(c)}>
                      {color === c && <Ionicons name="checkmark" size={14} color="#FFF" />}
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Nota (opcional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                  placeholder="Detalles del bloque…"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={note}
                  onChangeText={setNote}
                />
              </ScrollView>
              <View style={styles.sheetActions}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.colors.surface }]} onPress={() => setShowModal(false)}>
                  <Text style={{ color: theme.colors.textSecondary, fontWeight: '700' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.colors.primary }]} onPress={handleSave}>
                  <Text style={{ color: '#FFF', fontWeight: '700' }}>{editing ? 'Guardar' : 'Agregar'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <TimePickerModal visible={showStartPicker} value={start} theme={theme} onCancel={() => setShowStartPicker(false)} onConfirm={(t) => { setStart(t); setShowStartPicker(false); }} />
      <TimePickerModal visible={showEndPicker} value={end} theme={theme} onCancel={() => setShowEndPicker(false)} onConfirm={(t) => { setEnd(t); setShowEndPicker(false); }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabsWrap: { paddingTop: 14 },
  tabs: { paddingHorizontal: 16, gap: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  tabText: { fontSize: 13.5, fontWeight: '700' },
  tabBadge: { minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  tabBadgeText: { fontSize: 10.5, fontWeight: '800' },
  summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 12 },
  summaryCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  summaryText: { fontSize: 12.5, fontWeight: '600' },
  scroll: { padding: 16, paddingBottom: 100 },
  blockCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1, paddingRight: 12, marginBottom: 12, overflow: 'hidden' },
  blockAccent: { width: 5, alignSelf: 'stretch' },
  blockTime: { paddingVertical: 16, paddingHorizontal: 12, width: 64, alignItems: 'center' },
  blockStart: { fontSize: 16, fontWeight: '800' },
  blockEnd: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  blockDivider: { width: 1, height: 34 },
  blockInfo: { flex: 1, paddingHorizontal: 12 },
  blockTitle: { fontSize: 15, fontWeight: '700' },
  blockTitleDone: { textDecorationLine: 'line-through', opacity: 0.6 },
  blockMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  blockMeta: { fontSize: 12, flexShrink: 1 },
  doneBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  deleteBtn: { padding: 4 },
  emptyCard: { alignItems: 'center', borderRadius: 22, borderWidth: 1, paddingVertical: 40, paddingHorizontal: 24, marginTop: 20 },
  emptyIcon: { width: 64, height: 64, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 14 },
  emptySub: { fontSize: 13, marginTop: 6, textAlign: 'center' },
  emptyText: { textAlign: 'center', marginTop: 40 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 16, paddingVertical: 13, marginTop: 6 },
  clearText: { fontSize: 13.5, fontWeight: '700' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  pickerBox: { borderRadius: 22, padding: 20 },
  pickerTitle: { fontSize: 17, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  pickerColWrap: { flex: 1, alignItems: 'center' },
  pickerColLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  pickerCol: { maxHeight: 180, width: '100%' },
  pickerItem: { paddingVertical: 9, borderRadius: 12, alignItems: 'center', marginBottom: 4 },
  pickerItemText: { fontSize: 17, fontWeight: '700' },
  pickerColon: { fontSize: 22, fontWeight: '800', marginHorizontal: 8, marginTop: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 16, borderBottomWidth: 0.5 },
  sheetTitle: { fontSize: 20, fontWeight: '800' },
  sheetScroll: { padding: 22, paddingBottom: 8 },
  dayPill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12 },
  dayPillText: { fontSize: 12.5, fontWeight: '700' },
  fieldLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 18, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeBtn: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  timeBtnLabel: { fontSize: 11, fontWeight: '600' },
  timeBtnValue: { fontSize: 19, fontWeight: '800', marginTop: 3 },
  quickAdjustRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  quickChip: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 9, alignItems: 'center' },
  quickChipText: { fontSize: 13, fontWeight: '700' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorDot: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  sheetActions: { flexDirection: 'row', gap: 12, padding: 22, paddingTop: 12 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn: { flex: 1, paddingVertical: 15, borderRadius: 16, alignItems: 'center' },
});
