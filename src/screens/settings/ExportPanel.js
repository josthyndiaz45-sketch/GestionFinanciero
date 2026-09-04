import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../providers/ThemeContext';
import { useAppAlert } from '../../providers/AlertContext';
import { useTransactions } from '../../providers/TransactionContext';
import { useBalance } from '../../providers/BalanceContext';
import { useSavingGoals } from '../../providers/SavingGoalContext';
import { useBudgets } from '../../providers/BudgetContext';
import { useAuth } from '../../providers/AuthContext';
import {
  exportTransactionsCsv,
  exportTransactionsXlsx,
  exportTransactionsPdf,
  buildBackup,
  exportBackup,
} from '../../services/dataTransferService';

const EXPORT_OPTIONS = [
  { key: 'csv', label: 'Movimientos a CSV', desc: 'Abre en Excel / hojas de cálculo', icon: 'document-text-outline', color: '#10B981' },
  { key: 'xlsx', label: 'Movimientos a Excel (.xlsx)', desc: 'Libro de Excel con formato', icon: 'grid-outline', color: '#2563EB' },
  { key: 'pdf', label: 'Movimientos a PDF', desc: 'Reporte imprimible', icon: 'document-outline', color: '#EF4444' },
  { key: 'backup', label: 'Respaldo completo (.json)', desc: 'Movimientos + presupuestos + metas + saldo', icon: 'cloud-download-outline', color: '#8B5CF6' },
];

export default function ExportPanel({ onDone }) {
  const { theme } = useTheme();
  const { showAlert } = useAppAlert();
  const { user } = useAuth();
  const { transactions } = useTransactions();
  const { budgets } = useBudgets();
  const { goals } = useSavingGoals();
  const { initialBalance } = useBalance();

  const notifyAfterClose = (title, message) => {
    onDone?.();
    setTimeout(() => showAlert(title, message), 0);
  };

  const runExport = (option) => {
    if (!transactions || transactions.length === 0) {
      notifyAfterClose('Exportar', 'No hay movimientos para exportar.');
      return;
    }
    let result;
    switch (option.key) {
      case 'csv': result = exportTransactionsCsv(transactions); break;
      case 'xlsx': result = exportTransactionsXlsx(transactions); break;
      case 'pdf': result = exportTransactionsPdf(transactions); break;
      case 'backup': {
        const backup = buildBackup({ userId: user?.id, transactions, budgets, savingGoals: goals, initialBalance });
        result = exportBackup(backup);
        break;
      }
      default: return;
    }
    if (result && !result.downloaded) {
      notifyAfterClose('Exportar', result.reason || 'No se pudo descargar el archivo.');
    } else {
      notifyAfterClose('Exportar', 'Se generó el archivo correctamente. Revisa tus descargas.');
    }
  };

  return (
    <View>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Exportar movimientos</Text>
      {EXPORT_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.key}
          style={[styles.option, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={() => runExport(opt)}
        >
          <View style={[styles.iconWrap, { backgroundColor: `${opt.color}1A` }]}>
            <Ionicons name={opt.icon} size={20} color={opt.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.optionLabel, { color: theme.colors.text }]}>{opt.label}</Text>
            <Text style={[styles.optionDesc, { color: theme.colors.textSecondary }]}>{opt.desc}</Text>
          </View>
          <Ionicons name="download-outline" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      ))}
      <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
        Los archivos CSV y Excel exportados aquí también sirven para importar sin afectar tus movimientos actuales.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  subtitle: { fontSize: 13, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optionLabel: { fontSize: 14, fontWeight: '600' },
  optionDesc: { fontSize: 12, marginTop: 2 },
  hint: { fontSize: 12, marginTop: 6, lineHeight: 17 },
});