import React from 'react';
import CalendarDatePicker from './CalendarDatePicker';

export default function DatePickerField({ visible, date, onConfirm, onCancel, theme, maximumDate }) {
  return (
    <CalendarDatePicker
      visible={visible}
      date={date}
      theme={theme}
      maximumDate={maximumDate}
      onCancel={onCancel}
      onConfirm={(d) => {
        onConfirm(d);
        onCancel();
      }}
    />
  );
}