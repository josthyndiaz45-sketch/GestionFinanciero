import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeContext';
import { useCategories } from '../providers/CategoryContext';
import { formatCurrency, formatDateTime } from '../utils/formatters';

export default function TransactionTile({ transaction, onPress, onDelete }) {
  const { theme } = useTheme();
  const { getCategories } = useCategories();
  const list = transaction.type === 'income' ? getCategories('income') : getCategories('expense');
  const cat = list.find((c) => c.name === transaction.category) || { name: 'otros', label: 'Otros', color: '#6B7280', icon: 'pricetag-outline' };
  const isIncome = transaction.type === 'income';
  const amountColor = isIncome ? theme.colors.income : theme.colors.expense;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, theme.shadow.soft]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.iconContainer, { backgroundColor: cat.color + '1A' }]}>
        <Ionicons name={cat.icon} size={22} color={cat.color} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.description, { color: theme.colors.text }]} numberOfLines={1}>
          {String(transaction.description || '').trim() || 'Sin mensaje'}
        </Text>
        <View style={styles.metaRow}>
          <View style={[styles.metaDot, { backgroundColor: cat.color }]} />
          <Text style={[styles.category, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {cat.label} • {formatDateTime(transaction.date)}
          </Text>
        </View>
      </View>
      <View style={styles.rightSection}>
        <View style={[styles.amountPill, { backgroundColor: amountColor + '14' }]}>
          <Text style={[styles.amount, { color: amountColor }]}>
            {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
          </Text>
        </View>
        {onDelete && (
          <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(transaction)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={20} color={theme.colors.danger} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18, borderWidth: 1, marginBottom: 10 },
  iconContainer: { width: 46, height: 46, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  info: { flex: 1 },
  description: { fontSize: 15, fontWeight: '700', letterSpacing: 0.1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 6 },
  metaDot: { width: 6, height: 6, borderRadius: 3 },
  category: { fontSize: 12, flexShrink: 1 },
  rightSection: { alignItems: 'flex-end', gap: 6 },
  amountPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  amount: { fontSize: 14, fontWeight: '800', letterSpacing: 0.1 },
  deleteBtn: { padding: 2 },
});
