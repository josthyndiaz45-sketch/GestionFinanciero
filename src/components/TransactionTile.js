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

  return (
    <TouchableOpacity style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconContainer, { backgroundColor: cat.color + '1A' }]}>
        <Ionicons name={cat.icon} size={22} color={cat.color} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.description, { color: theme.colors.text }]} numberOfLines={1}>{transaction.description}</Text>
        <Text style={[styles.category, { color: theme.colors.textSecondary }]} numberOfLines={1}>{cat.label} • {formatDateTime(transaction.date)}</Text>
      </View>
      <View style={styles.rightSection}>
        <Text style={[styles.amount, { color: isIncome ? theme.colors.income : theme.colors.expense }]}>
          {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
        </Text>
        {onDelete && (
          <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(transaction)}>
            <Ionicons name="close-circle" size={20} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  iconContainer: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  info: { flex: 1 },
  description: { fontSize: 15, fontWeight: '600' },
  category: { fontSize: 12, marginTop: 3 },
  rightSection: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 15, fontWeight: 'bold' },
  deleteBtn: { padding: 2 },
});
