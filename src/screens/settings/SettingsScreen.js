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
import ExportPanel from './ExportPanel';
import ImportPanel from './ImportPanel';
import { PressableScale, useFocusKey } from '../../components/Animated';

export default function SettingsScreen({ navigation }) {
  const { theme, isDark, toggleTheme, accentKey, setAccent, accentPresets } = useTheme();
  const { user } = useAuth();
  const [showAccentModal, setShowAccentModal] = useState(false);
  const currentPreset = accentPresets.find((p) => p.key === accentKey) || accentPresets[0];
  const focusKey = useFocusKey();
  const { initialBalance, updateInitialBalance } = useBalance();
  const { showAlert, showConfirm } = useAppAlert();
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceInput, setBalanceInput] = useState(String(initialBalance));
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

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
      <View style={[styles.sectionCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, theme.shadow.soft]}>
        {children}
      </View>
    </View>
  );

  const Row = ({ icon, label, value, onPress, right, iconColor, iconBg, last }) => (
    <PressableScale
      style={[styles.row, !last && { borderBottomWidth: 0.5, borderBottomColor: theme.colors.border }]}
      onPress={onPress}
      disabled={!onPress}
      scaleTo={0.97}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBg || theme.colors.surface }]}>
        <Ionicons name={icon} size={18} color={iconColor || theme.colors.textSecondary} />
      </View>
      <Text style={[styles.rowLabel, { color: theme.colors.text }]}>{label}</Text>
      {right || <Text style={[styles.rowValue, { color: theme.colors.textSecondary }]}>{value}</Text>}
      {onPress && !right && <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} style={{ opacity: 0.6 }} />}
    </PressableScale>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView key={focusKey} contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Configuración</Text>

        <View style={[styles.profileCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, theme.shadow.card]}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
            <Text style={[styles.avatarText, { color: '#FFF' }]}>
              {user?.email?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.email, { color: theme.colors.text }]} numberOfLines={1}>{user?.email || 'Sin sesión'}</Text>
            <Text style={[styles.profileSub, { color: theme.colors.textSecondary }]}>Sesión activa</Text>
          </View>
          <View style={[styles.profileBadge, { backgroundColor: theme.colors.incomeSoft }]}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.income} />
          </View>
        </View>

        <Section title="Finanzas">
          <Row
            icon="cash-outline"
            label="Saldo inicial"
            value={formatCurrency(initialBalance)}
            iconColor={theme.colors.income}
            iconBg={theme.colors.incomeSoft}
            onPress={() => { setBalanceInput(String(initialBalance)); setShowBalanceModal(true); }}
          />
          <Row icon="flag-outline" label="Metas de ahorro" iconColor={theme.colors.info} iconBg={theme.colors.infoSoft} onPress={() => navigation.navigate('SavingGoals')} />
          <Row icon="wallet-outline" label="Presupuestos" iconColor={theme.colors.warning} iconBg={theme.colors.warningSoft} onPress={() => navigation.navigate('Budgets')} />
          <Row icon="swap-horizontal-outline" label="Préstamos y deudas" iconColor={theme.colors.accent} iconBg={theme.colors.accentSoft} onPress={() => navigation.navigate('Loans')} />
          <Row icon="pricetags-outline" label="Categorías" iconColor={theme.colors.primary} iconBg={theme.colors.primarySoft} onPress={() => navigation.navigate('Categories')} />
          <Row icon="notifications-outline" label="Recordatorios de pago" iconColor={theme.colors.expense} iconBg={theme.colors.expenseSoft} onPress={() => navigation.navigate('Reminders')} last />
        </Section>

        <Section title="General">
          <Row icon="calendar-outline" label="Horarios" iconColor={theme.colors.accent} iconBg={theme.colors.accentSoft} onPress={() => navigation.navigate('Schedule')} />
          <Row icon="globe-outline" label="Idioma" value="Español" iconColor={theme.colors.info} iconBg={theme.colors.infoSoft} />
          <Row icon="cash-outline" label="Moneda" value="PEN (S/)" iconColor={theme.colors.income} iconBg={theme.colors.incomeSoft} />
          <Row
            icon="moon-outline"
            label="Modo oscuro"
            iconColor={theme.colors.accent}
            iconBg={theme.colors.accentSoft}
            right={<Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: '#CBD5E1', true: theme.colors.primary + '80' }} thumbColor={isDark ? theme.colors.primary : '#F8FAFC'} />}
          />
          <Row
            icon="color-palette-outline"
            label="Color de la app"
            iconColor={theme.colors.primary}
            iconBg={theme.colors.primarySoft}
            onPress={() => setShowAccentModal(true)}
            right={
              <View style={styles.accentPreviewRow}>
                <Text style={[styles.rowValue, { color: theme.colors.textSecondary }]}>{currentPreset.label}</Text>
                <View style={[styles.accentSwatch, { backgroundColor: currentPreset.color }]} />
              </View>
            }
          />
          <Row
            icon="paper-plane-outline"
            label="Notificación de prueba"
            iconColor={theme.colors.primary}
            iconBg={theme.colors.primarySoft}
            onPress={handleTestNotification}
            right={testingNotif ? <Text style={[styles.rowValue, { color: theme.colors.textSecondary }]}>Enviando…</Text> : null}
            last
          />
        </Section>

        <Section title="Más">
          <Row icon="download-outline" label="Exportar" iconColor={theme.colors.info} iconBg={theme.colors.infoSoft} onPress={() => setShowExportModal(true)} />
          <Row icon="upload-outline" label="Importar" iconColor={theme.colors.accent} iconBg={theme.colors.accentSoft} onPress={() => setShowImportModal(true)} last />
        </Section>

        <Section title="Seguridad">
          <Row icon="lock-closed-outline" label="Cambiar contraseña" iconColor={theme.colors.warning} iconBg={theme.colors.warningSoft} onPress={() => showAlert('Info', 'Función pendiente')} />
          <Row icon="log-out-outline" label="Cerrar sesión" iconColor={theme.colors.expense} iconBg={theme.colors.expenseSoft} onPress={handleLogout} last />
        </Section>

        <Section title="Acerca de">
          <View style={styles.aboutRow}>
            <Image source={logo} style={styles.aboutLogo} resizeMode="contain" />
            <View style={styles.aboutInfo}>
              <Text style={[styles.aboutApp, { color: theme.colors.text }]}>Gestión Financiera</Text>
              <Text style={[styles.aboutDev, { color: theme.colors.textSecondary }]}>Josthyn Alberto Diaz Martinez</Text>
              <Text style={[styles.aboutVersion, { color: theme.colors.textSecondary }]}>Versión 2.0</Text>
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
              <PressableScale containerStyle={styles.modalBtnWrap} style={[styles.modalBtn, { backgroundColor: theme.colors.surface }]} onPress={() => setShowBalanceModal(false)} scaleTo={0.96}>
                <Text style={{ color: theme.colors.textSecondary, fontWeight: '700' }}>Cancelar</Text>
              </PressableScale>
              <PressableScale containerStyle={styles.modalBtnWrap} style={[styles.modalBtn, { backgroundColor: theme.colors.primary }]} onPress={handleSaveBalance} scaleTo={0.96}>
                <Text style={{ color: '#FFF', fontWeight: '700' }}>Guardar</Text>
              </PressableScale>
            </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={showAccentModal} transparent animationType="slide" onRequestClose={() => setShowAccentModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.transferModal, { backgroundColor: theme.colors.card }]}>
            <View style={[styles.transferHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Color de la app</Text>
              <TouchableOpacity onPress={() => setShowAccentModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={26} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalHint, { color: theme.colors.textSecondary, paddingHorizontal: 20, marginTop: 12 }]}>
              Elige el color principal que se usará en toda la aplicación.
            </Text>
            <View style={styles.accentGrid}>
              {accentPresets.map((p) => {
                const active = p.key === accentKey;
                return (
                  <TouchableOpacity
                    key={p.key}
                    style={[styles.accentOption, { borderColor: active ? p.color : theme.colors.border, backgroundColor: theme.colors.surface }]}
                    onPress={() => setAccent(p.key)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.accentCircle, { backgroundColor: p.color }]}>
                      {active && <Ionicons name="checkmark" size={20} color="#FFF" />}
                    </View>
                    <Text style={[styles.accentLabel, { color: theme.colors.text }]} numberOfLines={1}>{p.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.modalActions}>
              <PressableScale containerStyle={styles.modalBtnWrap} style={[styles.modalBtn, { backgroundColor: theme.colors.primary }]} onPress={() => setShowAccentModal(false)} scaleTo={0.96}>
                <Text style={{ color: '#FFF', fontWeight: '700' }}>Listo</Text>
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showExportModal} transparent animationType="slide" onRequestClose={() => setShowExportModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.transferModal, { backgroundColor: theme.colors.card }]}>
            <View style={[styles.transferHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Exportar</Text>
              <TouchableOpacity onPress={() => setShowExportModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={26} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.transferScroll} showsVerticalScrollIndicator={false}>
              <ExportPanel onDone={() => setShowExportModal(false)} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showImportModal} transparent animationType="slide" onRequestClose={() => setShowImportModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.transferModal, { backgroundColor: theme.colors.card }]}>
            <View style={[styles.transferHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Importar</Text>
              <TouchableOpacity onPress={() => setShowImportModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={26} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.transferScroll} showsVerticalScrollIndicator={false}>
              <ImportPanel onDone={() => setShowImportModal(false)} />
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
  title: { fontSize: 28, fontWeight: '800', marginBottom: 20, letterSpacing: -0.4 },
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 24, borderWidth: 1, marginBottom: 24 },
  avatar: { width: 54, height: 54, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  avatarText: { fontSize: 22, fontWeight: '800' },
  profileInfo: { flex: 1 },
  email: { fontSize: 15, fontWeight: '700' },
  profileSub: { fontSize: 12.5, marginTop: 3, fontWeight: '500' },
  profileBadge: { width: 34, height: 34, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10, marginLeft: 6 },
  sectionCard: { borderRadius: 22, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16 },
  rowIcon: { width: 38, height: 38, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  rowValue: { fontSize: 14, fontWeight: '600' },
  accentPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  accentSwatch: { width: 22, height: 22, borderRadius: 11 },
  accentGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 8 },
  accentOption: { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 12 },
  accentCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  accentLabel: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { borderRadius: 26, padding: 24 },
  transferModal: { borderRadius: 26, maxHeight: '85%', overflow: 'hidden' },
  transferHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5 },
  transferScroll: { padding: 20, paddingBottom: 30 },  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  modalHint: { fontSize: 13, marginBottom: 16, lineHeight: 19 },
  amountRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingHorizontal: 14 },
  currencyPrefix: { fontSize: 18, fontWeight: '800', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 24, fontWeight: '800', paddingVertical: 14 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtnWrap: { flex: 1 },
  modalBtn: { paddingVertical: 15, borderRadius: 16, alignItems: 'center' },
  aboutRow: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16 },
  aboutLogo: { width: 68, height: 68, borderRadius: 20 },
  aboutInfo: { flex: 1 },
  aboutApp: { fontSize: 16, fontWeight: '800' },
  aboutDev: { fontSize: 14, marginTop: 4, fontWeight: '600' },
  aboutVersion: { fontSize: 12, marginTop: 2 },
});
