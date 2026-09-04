import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
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
  pickJsonFile,
} from '../../services/dataTransferService';
import { clearUserFinancialData, restoreBackup } from '../../services/restoreService';

const EXPORT_OPTIONS = [
  { key: 'csv', label: 'Movimientos a CSV', desc: 'Abre en Excel / hojas de cálculo', icon: 'document-text-outline', color: '#10B981' },
  { key: 'xlsx', label: 'Movimientos a Excel (.xlsx)', desc: 'Libro de Excel con formato', icon: 'grid-outline', color: '#2563EB' },
  { key: 'pdf', label: 'Movimientos a PDF', desc: 'Reporte imprimible', icon: 'document-outline', color: '#EF4444' },
  { key: 'backup', label: 'Respaldo completo (.json)', desc: 'Movimientos + presupuestos + metas + saldo', icon: 'cloud-download-outline', color: '#8B5CF6' },
];

export default function ExportImportPanel({ onDone }) {
  const { theme } = useTheme();
  const { showAlert, showConfirm } = useAppAlert();
  const { user } = useAuth();
  const { transactions, loadTransactions } = useTransactions();
  const { budgets, loadBudgets } = useBudgets();
  const { goals, loadGoals } = useSavingGoals();
  const { initialBalance, updateInitialBalance } = useBalance();
  const [busy, setBusy] = useState(false);

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

  const handleImport = () => {
    showConfirm(
      'Importar respaldo',
      'Esto reemplazará TODOS tus movimientos, presupuestos, metas y saldo actuales con el contenido del respaldo. ¿Deseas continuar?',
      async () => {
        if (busy) return;
        setBusy(true);
        try {
          const backup = await pickJsonFile();
          if (!user) throw new Error('Sesión no iniciada');
          await clearUserFinancialData(user.id);
          const results = await restoreBackup(backup, user.id);
          await Promise.all([
            loadTransactions(),
            loadBudgets(),
            loadGoals(),
          ]);
          if (results.initialBalance !== null) {
            await updateInitialBalance(results.initialBalance);
          }
          notifyAfterClose('Importación completada', `Movimientos: ${results.transactions}\nPresupuestos: ${results.budgets}\nMetas: ${results.savingGoals}\nSaldo inicial: ${results.initialBalance !== null ? `S/ ${results.initialBalance}` : 'sin cambios'}`);
        } catch (e) {
          notifyAfterClose('Error al importar', e?.message || 'No se pudo importar el respaldo.');
        } finally {
          setBusy(false);
        }
      },
      'Importar'
    );
  };

  return (
    <View>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Exportar movimientos</Text>
      {EXPORT_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.key}
          style={[styles.option, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={() => runExport(opt)}
          disabled={busy}
        >
          <View style={[styles.optIcon, { backgroundColor: opt.color + '20' }]}>
            <Ionicons name={opt.icon} size={20} color={opt.color} />
          </View>
          <View style={styles.optInfo}>
            <Text style={[styles.optLabel, { color: theme.colors.text }]}>{opt.label}</Text>
            <Text style={[styles.optDesc, { color: theme.colors.textSecondary }]}>{opt.desc}</Text>
          </View>
          <Ionicons name="download-outline" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      ))}

      <Text style={[styles.subtitle, { color: theme.colors.textSecondary, marginTop: 24 }]}>Importar respaldo completo</Text>
      <TouchableOpacity
        style={[styles.importBtn, { backgroundColor: theme.colors.primary }]}
        onPress={handleImport}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Ionicons name="cloud-upload-outline" size={20} color="#FFF" />
            <Text style={styles.importBtnText}>Importar respaldo (.json)</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  subtitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginLeft: 4 },
  option: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  optIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  optInfo: { flex: 1 },
  optLabel: { fontSize: 15, fontWeight: '600' },
  optDesc: { fontSize: 12, marginTop: 2 },
  importBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14 },
  importBtnText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
});
