import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useTheme } from '../../providers/ThemeContext';
import { signIn, signUp } from '../../services/authService';
import logo from '../../../assets/monoicon.png';

export default function LoginScreen() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Ingresa email y contraseña');
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
        Alert.alert('Cuenta creada', 'Revisa tu email para confirmar tu cuenta.');
      }
    } catch (e) {
      let msg = 'Ocurrió un error';
      if (e.message?.includes('Invalid login')) msg = 'Email o contraseña incorrectos';
      else if (e.message?.includes('already registered')) msg = 'Este email ya está registrado';
      else if (e.message?.includes('Password')) msg = 'La contraseña debe tener al menos 6 caracteres';
      else msg = e.message || msg;
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: theme.colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.title, { color: theme.colors.text }]}>Gestión Financiera</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Controla tus finanzas personales</Text>

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
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  logo: { width: 120, height: 120, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: 32 },
  toggleRow: { flexDirection: 'row', marginBottom: 20, borderRadius: 12, overflow: 'hidden' },
  toggleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#E5E7EB' },
  toggleText: { fontWeight: '600', color: '#6B7280' },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 12 },
  btn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
