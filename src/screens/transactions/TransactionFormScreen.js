import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, KeyboardAvoidingView, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DatePickerField from '../../components/DatePickerField';
import { useTheme } from '../../providers/ThemeContext';
import { useAuth } from '../../providers/AuthContext';
import { useTransactions } from '../../providers/TransactionContext';
import { useTags } from '../../providers/TagContext';
import { useCategories } from '../../providers/CategoryContext';
import { useAppAlert } from '../../providers/AlertContext';
import { PAYMENT_METHODS, TRANSACTION_TAGS, TAG_COLORS } from '../../constants/constants';
import { createNewTransaction } from '../../models/Transaction';

export default function TransactionFormScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { addTransaction, editTransaction, transactions, loadTransactions } = useTransactions();
  const { getTag, setTag } = useTags();
  const { getCategories } = useCategories();
  const { showAlert } = useAppAlert();
  const existing = route.params?.transaction;
  const scrollRef = useRef(null);

  const [type, setType] = useState(existing?.type || 'expense');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [category, setCategory] = useState(existing?.category || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [date, setDate] = useState(existing?.date ? new Date(existing.date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(existing?.paymentMethod || '');
  const [note, setNote] = useState(existing?.note || '');
  const [showPayment, setShowPayment] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);

  useEffect(() => {
    if (existing?.id) {
      setSelectedTag(getTag(existing.id));
    }
  }, [existing?.id]);

  useEffect(() => {
    loadTransactions();
  }, []);

  function formatDateDisplay(d) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy}  ${hh}:${mi}:${ss}`;
  }

  const categories = getCategories(type);

  const handleSave = async () => {
    Keyboard.dismiss();
    if (!amount || parseFloat(amount) <= 0) {
      showAlert('Error', 'Por favor rellene los campos requeridos. Ingresa un monto válido.');
      return;
    }
    if (!category) {
      showAlert('Error', 'Por favor rellene los campos requeridos. Selecciona una categoría.');
      return;
    }
    if (!description.trim()) {
      showAlert('Error', 'Por favor rellene los campos requeridos. Ingresa una descripción.');
      return;
    }

    const trimmedDesc = description.trim();
    const duplicate = transactions.some((t) => {
      if (existing && t.id === existing.id) return false;
      if (String(t.description || '').trim().toLowerCase() !== trimmedDesc.toLowerCase()) return false;
      const a = new Date(t.date);
      return a.getFullYear() === date.getFullYear() && a.getMonth() === date.getMonth() && a.getDate() === date.getDate();
    });
    if (duplicate) {
      showAlert('Error', `Ya existe un movimiento llamado "${trimmedDesc}" en la fecha seleccionada. Por favor ingresa un nombre diferente.`);
      return;
    }

    const effectiveDate = new Date(date);
    if (effectiveDate.getHours() === 0 && effectiveDate.getMinutes() === 0 && effectiveDate.getSeconds() === 0) {
      const now = new Date();
      effectiveDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
    }

    const txData = {
      userId: user.id,
      type,
      amount: parseFloat(amount),
      category,
      description: trimmedDesc,
      date: effectiveDate.toISOString(),
      paymentMethod,
      note: note.trim(),
    };

    try {
      let savedTx;
      if (existing) {
        savedTx = { ...existing, ...txData };
        await editTransaction(savedTx);
      } else {
        const tx = createNewTransaction(user.id);
        Object.assign(tx, txData);
        savedTx = tx;
        await addTransaction(tx);
      }
      await setTag(savedTx.id, selectedTag);
      navigation.goBack();
    } catch (e) {
      showAlert('Error', e.message || 'No se pudo guardar');
    }
  };

  const onDateChange = (selectedDate) => {
    setDate(selectedDate);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
          <View style={styles.typeRow}>
            <TouchableOpacity style={[styles.typeBtn, type === 'income' && { backgroundColor: '#10B981' }]} onPress={() => { setType('income'); setCategory(''); }}>
              <Ionicons name="arrow-down-outline" size={18} color={type === 'income' ? '#FFF' : '#10B981'} />
              <Text style={[styles.typeBtnText, { color: type === 'income' ? '#FFF' : '#10B981' }]}>Ingreso</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.typeBtn, type === 'expense' && { backgroundColor: '#F43F5E' }]} onPress={() => { setType('expense'); setCategory(''); }}>
              <Ionicons name="arrow-up-outline" size={18} color={type === 'expense' ? '#FFF' : '#F43F5E'} />
              <Text style={[styles.typeBtnText, { color: type === 'expense' ? '#FFF' : '#F43F5E' }]}>Gasto</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Monto</Text>
          <View style={[styles.amountRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.currencyPrefix, { color: theme.colors.text }]}>S/</Text>
            <TextInput style={[styles.amountInput, { color: theme.colors.text }]} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={theme.colors.textSecondary} />
          </View>

          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Categoría</Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat) => (
              <TouchableOpacity key={cat.name} style={[styles.categoryChip, category === cat.name && { backgroundColor: cat.color, borderColor: cat.color }, { borderColor: theme.colors.border }]} onPress={() => setCategory(cat.name)}>
                <Ionicons name={cat.icon} size={16} color={category === cat.name ? '#FFF' : cat.color} />
                <Text style={[styles.categoryChipText, { color: category === cat.name ? '#FFF' : theme.colors.text }]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Etiqueta</Text>
          <View style={styles.categoryGrid}>
            {TRANSACTION_TAGS.map((tag) => {
              const tagColor = TAG_COLORS[tag];
              const isSelected = selectedTag === tag;
              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.categoryChip, isSelected && { backgroundColor: tagColor, borderColor: tagColor }, { borderColor: theme.colors.border }]}
                  onPress={() => setSelectedTag(isSelected ? null : tag)}
                >
                  <Ionicons name="pricetag-outline" size={14} color={isSelected ? '#FFF' : tagColor} />
                  <Text style={[styles.categoryChipText, { color: isSelected ? '#FFF' : theme.colors.text }]}>{tag}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Descripción</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]} value={description} onChangeText={setDescription} placeholder="Ej: Almuerzo" placeholderTextColor={theme.colors.textSecondary} returnKeyType="next" onSubmitEditing={() => scrollRef.current?.scrollToEnd({ animated: true })} />

          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Fecha</Text>
          <TouchableOpacity style={[styles.input, styles.dateBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={() => { Keyboard.dismiss(); setShowDatePicker(true); }}>
            <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
            <Text style={[styles.dateText, { color: theme.colors.text }]}>{formatDateDisplay(date)}</Text>
          </TouchableOpacity>
          <DatePickerField
            visible={showDatePicker}
            date={date}
            theme={theme}
            maximumDate={new Date()}
            onConfirm={onDateChange}
            onCancel={() => setShowDatePicker(false)}
          />

          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Método de pago</Text>
          <TouchableOpacity style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} onPress={() => { Keyboard.dismiss(); setShowPayment(!showPayment); }}>
            <Text style={{ color: paymentMethod ? theme.colors.text : theme.colors.textSecondary }}>{paymentMethod || 'Seleccionar método'}</Text>
          </TouchableOpacity>
          {showPayment && (
            <View style={[styles.dropdown, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              {PAYMENT_METHODS.map((m) => (
                <TouchableOpacity key={m} style={[styles.dropdownItem, { borderBottomColor: theme.colors.border }]} onPress={() => { setPaymentMethod(m); setShowPayment(false); }}>
                  <Text style={{ color: theme.colors.text }}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Nota (opcional)</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]} value={note} onChangeText={setNote} multiline numberOfLines={3} placeholder="Nota adicional..." placeholderTextColor={theme.colors.textSecondary} blurOnSubmit returnKeyType="done" />

          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]} onPress={handleSave}>
            <Text style={styles.saveBtnText}>{existing ? 'Actualizar' : 'Guardar'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  typeRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  typeBtnText: { fontWeight: '600', fontSize: 15 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  amountRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14 },
  currencyPrefix: { fontSize: 18, fontWeight: 'bold', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 20, fontWeight: 'bold', paddingVertical: 14 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  categoryChipText: { fontSize: 13, fontWeight: '500' },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateText: { fontSize: 15, flex: 1 },
  dropdown: { borderWidth: 1, borderRadius: 12, marginTop: -4, marginBottom: 8, overflow: 'hidden' },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 0.5 },
  saveBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
