import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useTheme } from '../../providers/ThemeContext';
import { useAppAlert } from '../../providers/AlertContext';
import { signIn, signUp } from '../../services/authService';
import logo from '../../../assets/monoicon.png';

export default function LoginScreen() {
  const { theme } = useTheme();
  const { showAlert } = useAppAlert();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      showAlert('Error', 'Ingresa email y contraseña');
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
        showAlert('Cuenta creada', 'Revisa tu email para confirmar tu cuenta.');
      }
    } catch (e) {
      let msg = 'Ocurrió un error';
      if (e.message?.includes('Invalid login')) msg = 'Email o contraseña incorrectos';
      else if (e.message?.includes('already registered')) msg = 'Este email ya está registrado';
      else if (e.message?.includes('Password')) msg = 'La contraseña debe tener al menos 6 caracteres';
      else msg = e.message || msg;
      showAlert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: theme.colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.hero, { backgroundColor: theme.colors.primary }]}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Gestión Financiera</Text>
        <Text style={styles.subtitle}>Controla tus finanzas en un solo lugar</Text>
      </View>
      <View style={styles.inner}>
        <View style={styles.toggleRow}>
          <TouchableOpacity style={[styles.toggleBtn, isLogin && { backgroundColor: theme.colors.primary }]} onPress={() => setIsLogin(true)}>
            <Text style={[styles.toggleText, isLogin && { color: '#FFF' }]}>Iniciar sesión</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toggleBtn, !isLogin && { backgroundColor: theme.colors.primary }]} onPress={() => setIsLogin(false)}>
            <Text style={[styles.toggleText, !isLogin && { color: '#FFF' }]}>Crear cuenta</Text>
          </TouchableOpacity>
        </View>

        <TextInput style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]} placeholder="Email" placeholderTextColor={theme.colors.textSecondary} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]} placeholder="Contraseña" placeholderTextColor={theme.colors.textSecondary} value={password} onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity style={[styles.btn, { backgroundColor: theme.colors.primary }]} onPress={handleSubmit} disabled={loading}>
          <Text style={styles.btnText}>{loading ? 'Cargando...' : isLogin ? 'Iniciar sesión' : 'Crear cuenta'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { paddingTop: 90, paddingBottom: 44, alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  logo: { width: 96, height: 96, marginBottom: 16, borderRadius: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFF' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  inner: { flex: 1, padding: 24, paddingTop: 32, justifyContent: 'center' },
  toggleRow: { flexDirection: 'row', marginBottom: 20, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  toggleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#E5E7EB' },
  toggleText: { fontWeight: '600', color: '#6B7280' },
  input: { borderWidth: 1, borderRadius: 14, padding: 15, fontSize: 16, marginBottom: 14 },
  btn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
