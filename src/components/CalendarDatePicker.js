import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export default function CalendarDatePicker({ visible, date, onConfirm, onCancel, theme, maximumDate }) {
  const initial = date ? new Date(date) : new Date();
  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth());

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const selectedDay = date ? new Date(date) : null;

  const cells = useMemo(() => {
    const arr = [];
    for (let i = 0; i < firstDay; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    return arr;
  }, [firstDay, daysInMonth]);

  const isToday = (d) => {
    const now = new Date();
    return d === now.getDate() && month === now.getMonth() && year === now.getFullYear();
  };

  const isSelected = (d) => {
    if (!selectedDay) return false;
    return d === selectedDay.getDate() && month === selectedDay.getMonth() && year === selectedDay.getFullYear();
  };

  const isDisabled = (d) => {
    if (!maximumDate) return false;
    const max = new Date(maximumDate);
    const cellDate = new Date(year, month, d);
    return cellDate > max;
  };

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const handleDayPress = (d) => {
    if (isDisabled(d)) return;
    onConfirm(new Date(year, month, d));
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={22} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.monthTitle, { color: theme.colors.text }]}>{MONTH_NAMES[month]} {year}</Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={22} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.dayLabelsRow}>
            {DAY_LABELS.map((label) => (
              <Text key={label} style={[styles.dayLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((day, idx) => {
              if (day === null) return <View key={`empty_${idx}`} style={styles.cell} />;
              const disabled = isDisabled(day);
              const selected = isSelected(day);
              const today = isToday(day);
              return (
                <TouchableOpacity
                  key={`day_${day}`}
                  style={[
                    styles.cell,
                    selected && { backgroundColor: theme.colors.primary, borderRadius: 20 },
                    today && !selected && { borderColor: theme.colors.primary, borderWidth: 1 },
                  ]}
                  onPress={() => handleDayPress(day)}
                  disabled={disabled}
                >
                  <Text style={[
                    styles.dayText,
                    { color: disabled ? theme.colors.textSecondary + '40' : theme.colors.text },
                    selected && { color: '#FFF', fontWeight: 'bold' },
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.colors.surface }]} onPress={onCancel}>
              <Text style={{ color: theme.colors.textSecondary, fontWeight: '600' }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]} onPress={() => onConfirm(new Date(year, month, selectedDay ? selectedDay.getDate() : 1))}>
              <Text style={{ color: '#FFF', fontWeight: '600' }}>Seleccionar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  container: { borderRadius: 20, padding: 20, width: '100%', maxWidth: 360 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  navBtn: { padding: 8 },
  monthTitle: { fontSize: 17, fontWeight: 'bold' },
  dayLabelsRow: { flexDirection: 'row', marginBottom: 8 },
  dayLabel: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  dayText: { fontSize: 15 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
});
