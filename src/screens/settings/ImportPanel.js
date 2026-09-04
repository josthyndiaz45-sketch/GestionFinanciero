import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../providers/ThemeContext';
import { useAppAlert } from '../../providers/AlertContext';
import { useTransactions } from '../../providers/TransactionContext';
import { useBalance } from '../../providers/BalanceContext';
import { useSavingGoals } from '../../providers/SavingGoalContext';
import { useBudgets } from '../../providers/BudgetContext';
import { useAuth } from '../../providers/AuthContext';
import { pickTransactionsFile, createTransactionsMany } from '../../services/transactionImportService';
import { pickJsonFile } from '../../services/dataTransferService';
import { clearUserFinancialData, restoreBackup } from '../../services/restoreService';

function formatDate(iso) {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export default function ImportPanel({ onDone }) {
  const { theme } = useTheme();
  const { showAlert, showConfirm } = useAppAlert();
  const { user } = useAuth();
  const { loadTransactions } = useTransactions();
  const { budgets, loadBudgets } = useBudgets();
  const { goals, loadGoals } = useSavingGoals();
  const { updateInitialBalance } = useBalance();
  const [parsed, setParsed] = useState(null);
  const [busy, setBusy] = useState(false);

  const notifyAfterClose = (title, message) => {
    onDone?.();
    setTimeout(() => showAlert(title, message), 0);
  };

  const handlePickFile = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await pickTransactionsFile();
      setParsed(result);
    } catch (e) {
      if (e?.message && e.message !== 'Importación cancelada' && e.message !== 'No se seleccionó ningún archivo') {
        showAlert('Importar movimientos', e.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleImportItems = async () => {
    if (!parsed || busy) return;
    setBusy(true);
    try {
      await createTransactionsMany(user.id, parsed.items);
      await loadTransactions();
      const added = parsed.items.length;
      setParsed(null);
      notifyAfterClose('Importación completada', `Se agregaron ${added} movimientos sin modificar los actuales.`);
    } catch (e) {
      showAlert('Error al importar', e?.message || 'No se pudo importar el archivo.');
    } finally {
      setBusy(false);
    }
  };

  const handleImportBackup = () => {
    showConfirm(
      'Restaurar respaldo',
      'Esto reemplazará TODOS tus movimientos, presupuestos, metas y saldo actuales con el contenido del respaldo. ¿Deseas continuar?',
      async () => {
        if (busy) return;
        setBusy(true);
        try {
          const backup = await pickJsonFile();
          if (!user) throw new Error('Sesión no iniciada');
          await clearUserFinancialData(user.id);
          const results = await restoreBackup(backup, user.id);
          await Promise.all([loadTransactions(), loadBudgets(), loadGoals()]);
          if (results.initialBalance !== null) {
            await updateInitialBalance(results.initialBalance);
          }
          notifyAfterClose(
            'Importación completada',
            `Movimientos: ${results.transactions}\nPresupuestos: ${results.budgets}\nMetas: ${results.savingGoals}\nSaldo inicial: ${results.initialBalance !== null ? `S/ ${results.initialBalance}` : 'sin cambios'}`
          );
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
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Agregar movimientos (sin afectar lo actual)</Text>
      <Text style={[styles.sectionHint, { color: theme.colors.textSecondary }]}>
        Importa desde un archivo CSV o Excel de Yape, BCP u otra app. Solo se AGREGAN los movimientos, no se tocan los existentes. También sirven los archivos CSV/Excel exportados desde Gestión Financiera.
      </Text>

      {parsed ? (
        <View style={[styles.previewCard, { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primaryMuted }]}>
          <View style={styles.previewHeader}>
            <Ionicons name="document-outline" size={20} color={theme.colors.primary} />
            <Text style={[styles.previewTitle, { color: theme.colors.text }]} numberOfLines={1}>Movimientos detectados</Text>
          </View>
          <Text style={[styles.previewRow, { color: theme.colors.text }]}>
            Archivo: <Text style={{ fontWeight: '600' }}>{parsed.name}</Text>
          </Text>
          <Text style={[styles.previewRow, { color: theme.colors.text }]}>
            {parsed.total} movimientos válidos
            {parsed.skipped > 0 ? ` · ${parsed.skipped} omitidos (sin datos completos)` : ''}
          </Text>
          <Text style={[styles.previewRow, { color: theme.colors.text }]}>
            Rango: {formatDate(parsed.fromDate)} – {formatDate(parsed.toDate)}
          </Text>
          <Text style={[styles.previewRow, { color: theme.colors.textSecondary }]}>
            Se agregarán sin modificar tus movimientos actuales.
          </Text>
          <View style={styles.previewActions}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: theme.colors.surface }]}
              onPress={() => setParsed(null)}
              disabled={busy}
            >
              <Text style={{ color: theme.colors.textSecondary, fontWeight: '600' }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: theme.colors.primary }]}
              onPress={handleImportItems}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={{ color: '#FFF', fontWeight: '600' }}>Importar {parsed.total}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.primaryAction, { backgroundColor: theme.colors.primary }]}
          onPress={handlePickFile}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={20} color="#FFF" />
              <Text style={styles.primaryActionText}>Seleccionar archivo (CSV / Excel)</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      <Text style={[styles.subtitle, { color: theme.colors.textSecondary, marginTop: 28 }]}>Restaurar respaldo completo (.json)</Text>
      <Text style={[styles.sectionHint, { color: theme.colors.textSecondary }]}>
        Reemplaza TODO (movimientos, presupuestos, metas y saldo) con un respaldo .json generado desde "Exportar".
      </Text>
      <TouchableOpacity
        style={[styles.outlineAction, { borderColor: theme.colors.border }]}
        onPress={handleImportBackup}
        disabled={busy}
      >
        <Ionicons name="swap-vertical-outline" size={20} color={theme.colors.text} />
        <Text style={[styles.outlineActionText, { color: theme.colors.text }]}>Importar respaldo (.json)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  subtitle: { fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionHint: { fontSize: 12, lineHeight: 17, marginBottom: 12 },
  primaryAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 16 },
  primaryActionText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  outlineAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 16, borderWidth: 1 },
  outlineActionText: { fontWeight: '600', fontSize: 14 },
  previewCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  previewTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  previewRow: { fontSize: 13, marginBottom: 4, lineHeight: 18 },
  previewActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});