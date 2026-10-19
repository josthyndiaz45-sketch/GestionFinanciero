import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../providers/ThemeContext';
import { useCategories } from '../../providers/CategoryContext';
import { useAppAlert } from '../../providers/AlertContext';
import { CATEGORY_ICONS } from '../../constants/constants';

export default function CategoriesScreen() {
  const { theme } = useTheme();
  const { getCategories, addCategory, removeCategory, pickColor } = useCategories();
  const { showAlert, showConfirm } = useAppAlert();
  const [tab, setTab] = useState('expense');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(CATEGORY_ICONS[0]);

  const categories = getCategories(tab);

  const handleAdd = async () => {
    const label = name.trim();
    if (!label) {
      showAlert('Error', 'Por favor escribe el nombre de la categoría');
      return;
    }
    const normalized = label.toLowerCase().replace(/\s+/g, '_');
    try {
      await addCategory(tab, { name: normalized, label, color: pickColor(tab), icon });
      setName('');
      setIcon(CATEGORY_ICONS[0]);
    } catch (e) {
      showAlert('Error', e.message || 'No se pudo agregar la categoría');
    }
  };

  const handleDelete = (c) => {
    showConfirm('Eliminar categoría', `¿Eliminar la categoría "${c.label}"?`, async () => {
      try {
        await removeCategory(tab, c.name);
      } catch (_) {
        showAlert('Error', 'No se pudo eliminar la categoría');
      }
    }, 'Eliminar');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.tabs}>
        {[
          { key: 'expense', label: 'Gastos' },
          { key: 'income', label: 'Ingresos' },
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

      <FlatList
        data={categories}
        keyExtractor={(item) => item.name}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        renderItem={({ item }) => (
          <View style={[styles.row, { backgroundColor: theme.colors.card }]}>
            <View style={[styles.iconWrap, { backgroundColor: `${item.color}22` }]}>
              <Ionicons name={item.icon} size={20} color={item.color} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>{item.label}</Text>
            <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={20} color="#F43F5E" />
            </TouchableOpacity>
          </View>
        )}
      />

      <View style={[styles.addSection, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
        <Text style={[styles.pickerLabel, { color: theme.colors.textSecondary }]}>Ícono</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iconRow}>
          {CATEGORY_ICONS.map((ic) => {
            const selected = ic === icon;
            return (
              <TouchableOpacity
                key={ic}
                style={[styles.iconOption, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, selected && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                onPress={() => setIcon(ic)}
              >
                <Ionicons name={ic} size={20} color={selected ? '#FFF' : theme.colors.textSecondary} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={styles.addBar}>
          <View style={[styles.previewIcon, { backgroundColor: `${pickColor(tab)}22`, borderColor: theme.colors.border }]}>
            <Ionicons name={icon} size={20} color={pickColor(tab)} />
          </View>
          <TextInput
            style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surface }]}
            placeholder="Nueva categoría"
            placeholderTextColor={theme.colors.textSecondary}
            value={name}
            onChangeText={setName}
          />
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.colors.primary }]} onPress={handleAdd}>
            <Ionicons name="add" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  addSection: { paddingTop: 12, borderTopWidth: 0.5 },
  pickerLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginHorizontal: 16, marginBottom: 8 },
  iconRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  iconOption: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  previewIcon: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  addBar: { flexDirection: 'row', gap: 10, padding: 16, paddingTop: 4, alignItems: 'center' },
  input: { flex: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  addBtn: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});