import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput, Modal, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../providers/ThemeContext';
import logo from '../../../assets/monoicon.png';
import { useAuth } from '../../providers/AuthContext';
import { useBalance } from '../../providers/BalanceContext';
import { useAppAlert } from '../../providers/AlertContext';
import { signOut } from '../../services/authService';
import { formatCurrency } from '../../utils/formatters';
import { sendTestMovementNotification } from '../../services/movementReminderService';
import ExportImportPanel from './ExportImportPanel';

export default function SettingsScreen({ navigation }) {
  const { theme, isDark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { initialBalance, updateInitialBalance } = useBalance();
  const { showAlert, showConfirm } = useAppAlert();
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceInput, setBalanceInput] = useState(String(initialBalance));
  const [showTransferModal, setShowTransferModal] = useState(false);

  const handleLogout = () => {
    showConfirm('Cerrar sesión', '¿Estás seguro?', () => signOut(), 'Cerrar sesión');
  };

  const handleSaveBalance = async () => {
    const val = parseFloat(balanceInput);
    if (isNaN(val) || val < 0) {
      showAlert('Error', 'Ingresa un monto válido');
      return;
    }
    await updateInitialBalance(val);
    setShowBalanceModal(false);
  };

  const [testingNotif, setTestingNotif] = useState(false);

  const handleTestNotification = async () => {
    if (testingNotif) return;
    setTestingNotif(true);
    try {
      const res = await sendTestMovementNotification(user?.id);
      if (res.email) {
        showAlert('Notificación de prueba', `Se envió un correo a ${res.email}. Revisa tu bandeja de entrada (y de spam).`);
      } else if (res.reason) {
        showAlert('Notificación de prueba', res.reason);
      } else {
        showAlert('Notificación de prueba', 'No se pudo enviar el correo de prueba. Verifica que RESEND_API_KEY esté configurado.');
      }
    } catch (e) {
      showAlert('Error', `No se pudo enviar la notificación de prueba.\n\nDetalle: ${e?.message || String(e)}`);
    } finally {
      setTestingNotif(false);
    }
  };

  const Section = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        {children}
      </View>
    </View>
  );

  const Row = ({ icon, label, value, onPress, right }) => (
    <TouchableOpacity style={[styles.row, { borderBottomColor: theme.colors.border }]} onPress={onPress} disabled={!onPress}>
      <Ionicons name={icon} size={20} color={theme.colors.textSecondary} />
      <Text style={[styles.rowLabel, { color: theme.colors.text }]}>{label}</Text>
      {right || <Text style={[styles.rowValue, { color: theme.colors.textSecondary }]}>{value}</Text>}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Configuración</Text>

        <View style={[styles.profileCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary + '20' }]}>
            <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
              {user?.email?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={[styles.email, { color: theme.colors.text }]}>{user?.email || 'Sin sesión'}</Text>
        </View>

        <Section title="Finanzas">
          <Row
            icon="cash-outline"
            label="Saldo inicial"
            value={formatCurrency(initialBalance)}
            onPress={() => { setBalanceInput(String(initialBalance)); setShowBalanceModal(true); }}
          />
          <Row icon="flag-outline" label="Metas de ahorro" onPress={() => navigation.navigate('SavingGoals')} />
          <Row icon="wallet-outline" label="Presupuestos" onPress={() => navigation.navigate('Budgets')} />
          <Row icon="pricetags-outline" label="Categorías" onPress={() => navigation.navigate('Categories')} />
          <Row icon="notifications-outline" label="Recordatorios de pago" onPress={() => navigation.navigate('Reminders')} />
        </Section>

        <Section title="General">
          <Row icon="globe-outline" label="Idioma" value="Español" />
          <Row icon="cash-outline" label="Moneda" value="PEN (S/)" />
          <Row
            icon="moon-outline"
            label="Modo oscuro"
            right={<Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: '#D1D5DB', true: theme.colors.primary + '80' }} thumbColor={isDark ? theme.colors.primary : '#F3F4F6'} />}
          />
          <Row
            icon="paper-plane-outline"
            label="Notificación de prueba"
            onPress={handleTestNotification}
            right={testingNotif ? <Text style={[styles.rowValue, { color: theme.colors.textSecondary }]}>Enviando…</Text> : null}
          />
        </Section>

        <Section title="Más">
          <Row icon="swap-vertical-outline" label="Exportar / Importar" onPress={() => setShowTransferModal(true)} />
        </Section>

        <Section title="Seguridad">
          <Row icon="lock-closed-outline" label="Cambiar contraseña" onPress={() => showAlert('Info', 'Función pendiente')} />
          <Row icon="log-out-outline" label="Cerrar sesión" onPress={handleLogout} />
        </Section>

        <Section title="Acerca de">
          <View style={styles.aboutRow}>
            <Image source={logo} style={styles.aboutLogo} resizeMode="contain" />
            <View style={styles.aboutInfo}>
              <Text style={[styles.aboutApp, { color: theme.colors.text }]}>Gestión Financiera</Text>
              <Text style={[styles.aboutDev, { color: theme.colors.textSecondary }]}>Josthyn Diaz Martinez</Text>
              <Text style={[styles.aboutVersion, { color: theme.colors.textSecondary }]}>Versión 1.0.0</Text>
            </View>
          </View>
        </Section>
      </ScrollView>

      <Modal visible={showBalanceModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ justifyContent: 'center' }}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Saldo inicial</Text>
            <Text style={[styles.modalHint, { color: theme.colors.textSecondary }]}>
              Ingresa el dinero que tienes actualmente en tus cuentas (Yape, tarjeta, efectivo, etc.)
            </Text>
            <View style={[styles.amountRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.currencyPrefix, { color: theme.colors.text }]}>S/</Text>
              <TextInput
                style={[styles.amountInput, { color: theme.colors.text }]}
                value={balanceInput}
                onChangeText={setBalanceInput}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={theme.colors.textSecondary}
                autoFocus
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#E5E7EB' }]} onPress={() => setShowBalanceModal(false)}>
                <Text style={{ color: '#6B7280', fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.colors.primary }]} onPress={handleSaveBalance}>
                <Text style={{ color: '#FFF', fontWeight: '600' }}>Guardar</Text>
              </TouchableOpacity>
            </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={showTransferModal} transparent animationType="slide" onRequestClose={() => setShowTransferModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.transferModal, { backgroundColor: theme.colors.card }]}>
            <View style={[styles.transferHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Exportar / Importar</Text>
              <TouchableOpacity onPress={() => setShowTransferModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={26} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.transferScroll} showsVerticalScrollIndicator={false}>
              <ExportImportPanel onDone={() => setShowTransferModal(false)} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  avatar: { width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  avatarText: { fontSize: 24, fontWeight: 'bold' },
  email: { fontSize: 15, fontWeight: '600', flex: 1 },
  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginLeft: 4 },
  sectionCard: { borderRadius: 18, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 16, borderBottomWidth: 0.5 },
  rowLabel: { flex: 1, fontSize: 15, marginLeft: 12 },
  rowValue: { fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { borderRadius: 24, padding: 24 },
  transferModal: { borderRadius: 24, maxHeight: '85%', overflow: 'hidden' },
  transferHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5 },
  transferScroll: { padding: 20, paddingBottom: 30 },  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  modalHint: { fontSize: 13, marginBottom: 16 },
  amountRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, paddingHorizontal: 14 },
  currencyPrefix: { fontSize: 18, fontWeight: 'bold', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 24, fontWeight: 'bold', paddingVertical: 14 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  aboutRow: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16 },
  aboutLogo: { width: 68, height: 68, borderRadius: 16 },
  aboutInfo: { flex: 1 },
  aboutApp: { fontSize: 16, fontWeight: 'bold' },
  aboutDev: { fontSize: 14, marginTop: 4, fontWeight: '500' },
  aboutVersion: { fontSize: 12, marginTop: 2 },
});
