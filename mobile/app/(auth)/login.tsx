import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter, Link } from 'expo-router';
import { colors } from '../../theme/colors';
import { useLoginMutation } from '../../services/auth';
import { useAuthStore } from '../../store/useAuthStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const loginMutation = useLoginMutation();

  const handleLogin = async () => {
    setHasError(false);
    setErrorMsg('');

    if (!email || !password) {
      setHasError(true);
      setErrorMsg('Veuillez remplir tous les champs');
      return;
    }

    try {
      const data = await loginMutation.mutateAsync({ email: email.trim(), password });
      await setAuth(data.token, data.user);
      router.replace('/(app)/home' as any);
    } catch (error: any) {
      setHasError(true);
      setErrorMsg(error.message || 'Erreur de connexion au serveur');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoBox}>
                <Ionicons name="shield-checkmark" size={28} color={colors.primary} />
              </View>
              <Text style={styles.brandTitle}>Maison du Droit</Text>
              <Text style={styles.screenTitle}>Connexion</Text>
              <Text style={styles.subtitle}>Ravi de vous revoir.</Text>
            </View>

            {/* Email */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>ADRESSE E-MAIL</Text>
              <View style={[styles.inputBox, hasError && styles.inputBoxError]}>
                <Feather name="mail" size={18} color={hasError ? colors.danger : colors.iconDisabled} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="nom@exemple.com"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>MOT DE PASSE</Text>
              <View style={[styles.inputBox, hasError && styles.inputBoxError]}>
                <Feather name="lock" size={18} color={hasError ? colors.danger : colors.iconDisabled} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Feather name={showPassword ? "eye" : "eye-off"} size={18} color={hasError ? colors.danger : colors.iconDisabled} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Error */}
            {hasError && (
              <View style={styles.errorContainer}>
                <Feather name="alert-circle" size={14} color={colors.danger} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {/* Options */}
            <View style={styles.optionsRow}>
              <TouchableOpacity style={styles.checkboxContainer}>
                <View style={styles.checkbox} />
                <Text style={styles.optionsText}>SE SOUVENIR DE MOI</Text>
              </TouchableOpacity>
              <TouchableOpacity>
                <Text style={[styles.optionsText, { color: colors.accent }]}>MOT DE PASSE OUBLIÉ ?</Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.button, loginMutation.isPending && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>Se connecter →</Text>
              )}
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footerTextContainer}>
              <Text style={styles.footerText}>Pas encore de compte ? </Text>
              <Link href={'/(auth)/register' as any} asChild>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>S&apos;inscrire</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 36 },
  logoBox: {
    width: 56, height: 56, backgroundColor: colors.surfaceAlt,
    borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  brandTitle: { fontSize: 18, fontWeight: '600', color: colors.primary, letterSpacing: 0.5 },
  screenTitle: { fontSize: 24, fontWeight: '700', color: colors.text, marginTop: 16 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  inputContainer: { marginBottom: 16 },
  label: { fontSize: 10, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, letterSpacing: 1.2 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 14,
    paddingHorizontal: 16, height: 52, backgroundColor: colors.surface,
  },
  inputBoxError: { borderColor: colors.danger, backgroundColor: colors.dangerBg },
  icon: { marginRight: 12 },
  input: { flex: 1, fontSize: 14, color: colors.text },
  errorContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  errorText: { color: colors.danger, fontSize: 12, marginLeft: 6, fontWeight: '500' },
  optionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 16, height: 16, borderWidth: 1.5, borderColor: colors.border, borderRadius: 4, marginRight: 8 },
  optionsText: { fontSize: 9, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.5 },
  button: {
    backgroundColor: colors.primary, borderRadius: 14, height: 54,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  footerTextContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 13, color: colors.textSecondary },
  footerLink: { fontSize: 13, color: colors.primary, fontWeight: '700' },
});
