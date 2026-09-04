import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { useTheme } from './ThemeContext';

const AlertContext = createContext();

export function AlertProvider({ children }) {
  const { theme } = useTheme();
  const [state, setState] = useState(null);

  const showAlert = useCallback((title, message, okText = 'OK') => {
    setState({ title, message, type: 'alert', okText });
  }, []);

  const showConfirm = useCallback((title, message, onConfirm, confirmText = 'Eliminar', cancelText = 'Cancelar') => {
    setState({ title, message, type: 'confirm', onConfirm, confirmText, cancelText });
  }, []);

  const close = useCallback(() => setState(null), []);

  const handleConfirm = useCallback(() => {
    const cb = state?.onConfirm;
    setState(null);
    if (cb) cb();
  }, [state]);

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {state && (
        <Modal transparent animationType="fade" onRequestClose={close}>
          <View style={styles.overlay}>
            <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.title, { color: theme.colors.text }]}>{state.title}</Text>
              <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{state.message}</Text>
              <View style={styles.actions}>
                {state.type === 'confirm' && (
                  <TouchableOpacity style={[styles.btn, { backgroundColor: theme.colors.surface }]} onPress={close}>
                    <Text style={{ color: theme.colors.textSecondary, fontWeight: '600' }}>{state.cancelText || 'Cancelar'}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: state.type === 'confirm' ? '#F43F5E' : theme.colors.primary }]}
                  onPress={state.type === 'confirm' ? handleConfirm : close}
                >
                  <Text style={{ color: '#FFF', fontWeight: '600' }}>{state.type === 'confirm' ? state.confirmText || 'Eliminar' : state.okText || 'OK'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </AlertContext.Provider>
  );
}

export function useAppAlert() {
  return useContext(AlertContext);
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 340, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 12 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  message: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  actions: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: 'center' },
});