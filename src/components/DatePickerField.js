import React from 'react';
import { Platform, TouchableOpacity, Text, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function DatePickerField({ visible, date, onConfirm, onCancel, theme, maximumDate }) {
  if (!visible) return null;
  return (
    <>
      <DateTimePicker
        value={date}
        mode="date"
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        onChange={(event, selectedDate) => {
          if (Platform.OS === 'android') onCancel();
          if (selectedDate) onConfirm(selectedDate);
        }}
        maximumDate={maximumDate}
        locale="es-PE"
      />
      {Platform.OS === 'ios' && (
        <TouchableOpacity style={[styles.dateDoneBtn, { backgroundColor: theme.colors.primary }]} onPress={onCancel}>
          <Text style={styles.dateDoneText}>Listo</Text>
        </TouchableOpacity>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  dateDoneBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  dateDoneText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
});