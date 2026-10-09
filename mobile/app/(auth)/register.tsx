import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter, Link } from 'expo-router';
import { colors } from '../../theme/colors';
import { useRegisterMutation } from '../../services/auth';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();
  const registerMutation = useRegisterMutation();

  const handleRegister = async () => {
    setHasError(false);
    setErrorMsg('');

    if (!name || !email || !password) {
      setHasError(true);
      setErrorMsg('Veuillez remplir tous les champs');
      return;
    }

    if (password.length < 6) {
      setHasError(true);
      setErrorMsg('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      await registerMutation.mutateAsync({
        fullName: name.trim(),
        email: email.trim(),
        password,
      });
      router.replace('/(auth)/login' as any);
    } catch (error: any) {
      setHasError(true);
      setErrorMsg(error.message || "L'inscription a échoué");
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
              <Text style={styles.screenTitle}>Créer un compte</Text>
              <Text style={styles.subtitle}>Rejoignez Maison du Droit</Text>
            </View>

            {/* Full Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>NOM COMPLET</Text>
              <View style={[styles.inputBox, hasError && styles.inputBoxError]}>
                <Feather name="user" size={18} color={hasError ? colors.danger : colors.iconDisabled} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Jean Dupont"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>ADRESSE E-MAIL</Text>
              <View style={[styles.inputBox, hasError && styles.inputBoxError]}>
                <Feather name="mail" size={18} color={hasError ? colors.danger : colors.iconDisabled} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="nom@exemple.com"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
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
                  placeholder="Min. 6 caractères"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
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

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.button, registerMutation.isPending && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>S&apos;inscrire →</Text>
              )}
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footerTextContainer}>
              <Text style={styles.footerText}>Déjà un compte ? </Text>
              <Link href={'/(auth)/login' as any} asChild>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>Se connecter</Text>
                </TouchableOpacity>
              </Link>
            </View>

            <Text style={styles.termsText}>
              En continuant, vous acceptez nos{' '}
              <Text style={{ textDecorationLine: 'underline' }}>Conditions d&apos;utilisation</Text>
              {' '}et notre{' '}
              <Text style={{ textDecorationLine: 'underline' }}>Politique de confidentialité</Text>
            </Text>
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
  screenTitle: { fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.textSecondary },
  inputContainer: { marginBottom: 18 },
  label: { fontSize: 10, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, letterSpacing: 1.2 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 14,
    paddingHorizontal: 16, height: 52, backgroundColor: colors.surface,
  },
  inputBoxError: { borderColor: colors.danger, backgroundColor: colors.dangerBg },
  icon: { marginRight: 12 },
  input: { flex: 1, fontSize: 14, color: colors.text },
  errorContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  errorText: { color: colors.danger, fontSize: 12, marginLeft: 6, fontWeight: '500' },
  button: {
    backgroundColor: colors.primary, borderRadius: 14, height: 54,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  footerTextContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 13, color: colors.textSecondary },
  footerLink: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  termsText: {
    textAlign: 'center', fontSize: 11, color: colors.textMuted,
    marginTop: 32, paddingHorizontal: 20, lineHeight: 17,
  },
});
