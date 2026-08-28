import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getCategoryInfo } from '../constants/constants';

export default function TransactionTile({ transaction, onPress, onDelete }) {
  const { theme } = useTheme();
  const cat = getCategoryInfo(transaction.category, transaction.type);
  const isIncome = transaction.type === 'income';

  return (
    <TouchableOpacity style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconContainer, { backgroundColor: cat.color + '20' }]}>
        <Ionicons name={cat.icon} size={22} color={cat.color} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.description, { color: theme.colors.text }]} numberOfLines={1}>{transaction.description}</Text>
        <Text style={[styles.category, { color: theme.colors.textSecondary }]}>{cat.label} • {formatDate(transaction.date)}</Text>
      </View>
      <View style={styles.rightSection}>
        <Text style={[styles.amount, { color: isIncome ? '#10B981' : '#F43F5E' }]}>
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
  container: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  iconContainer: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  info: { flex: 1 },
  description: { fontSize: 15, fontWeight: '600' },
  category: { fontSize: 12, marginTop: 2 },
  rightSection: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 15, fontWeight: 'bold' },
  deleteBtn: { padding: 2 },
});
