import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../store/useAuthStore';
import { updateProfile } from '../../services/api';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, updateUser, clearAuth } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await updateProfile({ fullName, bio, phone, email });
      await updateUser(data.user);
      setIsEditing(false);
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            await clearAuth();
            router.replace('/(auth)/login' as any);
          },
        },
      ]
    );
  };

  const getInitials = () => {
    if (!user?.fullName) return '?';
    return user.fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profil</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => isEditing ? handleSave() : setIsEditing(true)}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Feather name={isEditing ? 'check' : 'edit-2'} size={16} color={colors.primary} />
                <Text style={styles.editText}>{isEditing ? 'Sauvegarder' : 'Modifier'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
            <View style={styles.onlineDot} />
          </View>
          <Text style={styles.profileName}>{user?.fullName}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          {user?.bio && <Text style={styles.profileBio}>{user.bio}</Text>}
        </View>

        {/* Edit Form or Info Cards */}
        {isEditing ? (
          <View style={styles.editForm}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>NOM COMPLET</Text>
              <TextInput
                style={styles.fieldInput}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Votre nom"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>E-MAIL</Text>
              <TextInput
                style={styles.fieldInput}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="nom@exemple.com"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>TÉLÉPHONE</Text>
              <TextInput
                style={styles.fieldInput}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+33 6 12 34 56 78"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>BIO</Text>
              <TextInput
                style={[styles.fieldInput, { height: 80 }]}
                value={bio}
                onChangeText={setBio}
                placeholder="Quelques mots sur vous..."
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditing(false)}>
              <Text style={styles.cancelText}>Annuler les modifications</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.infoSection}>
            {/* Info items */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: colors.infoBg }]}>
                  <Feather name="mail" size={16} color={colors.info} />
                </View>
                <View>
                  <Text style={styles.infoLabel}>E-mail</Text>
                  <Text style={styles.infoValue}>{user?.email || '—'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: colors.successBg }]}>
                  <Feather name="phone" size={16} color={colors.success} />
                </View>
                <View>
                  <Text style={styles.infoLabel}>Téléphone</Text>
                  <Text style={styles.infoValue}>{user?.phone || 'Non renseigné'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: colors.warningBg }]}>
                  <Feather name="file-text" size={16} color={colors.warning} />
                </View>
                <View>
                  <Text style={styles.infoLabel}>Bio</Text>
                  <Text style={styles.infoValue}>{user?.bio || 'Non renseignée'}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>PARAMÈTRES</Text>

          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: colors.infoBg }]}>
              <Feather name="bell" size={16} color={colors.info} />
            </View>
            <Text style={styles.menuLabel}>Notifications</Text>
            <Feather name="chevron-right" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: colors.successBg }]}>
              <Feather name="shield" size={16} color={colors.success} />
            </View>
            <Text style={styles.menuLabel}>Confidentialité</Text>
            <Feather name="chevron-right" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: colors.warningBg }]}>
              <Feather name="help-circle" size={16} color={colors.warning} />
            </View>
            <Text style={styles.menuLabel}>Aide & Support</Text>
            <Feather name="chevron-right" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
            <View style={[styles.menuIcon, { backgroundColor: colors.dangerBg }]}>
              <Feather name="log-out" size={16} color={colors.danger} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.danger }]}>Se déconnecter</Text>
            <Feather name="chevron-right" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>

        {/* App info */}
        <Text style={styles.appVersion}>Maison du Droit v1.0.0</Text>
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  editText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  profileCard: {
    alignItems: 'center', paddingVertical: 24, marginHorizontal: 20,
    backgroundColor: colors.surface, borderRadius: 20, marginBottom: 20,
    borderWidth: 1, borderColor: colors.borderLight,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8,
  },
  avatarContainer: { position: 'relative', marginBottom: 14 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 26, fontWeight: '700', color: '#FFF' },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.success, borderWidth: 3, borderColor: colors.surface,
  },
  profileName: { fontSize: 20, fontWeight: '700', color: colors.text },
  profileEmail: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  profileBio: { fontSize: 13, color: colors.textSecondary, marginTop: 8, paddingHorizontal: 32, textAlign: 'center' },
  // Edit form
  editForm: { paddingHorizontal: 20, marginBottom: 20 },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: colors.textSecondary, marginBottom: 6, letterSpacing: 1.2 },
  fieldInput: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 14,
    paddingHorizontal: 16, height: 50, fontSize: 14, color: colors.text,
    backgroundColor: colors.surface,
  },
  cancelButton: { alignItems: 'center', paddingVertical: 12 },
  cancelText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  // Info cards
  infoSection: { paddingHorizontal: 20, marginBottom: 20 },
  infoCard: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: colors.borderLight,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  infoIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', letterSpacing: 0.3 },
  infoValue: { fontSize: 14, color: colors.text, fontWeight: '500', marginTop: 1 },
  // Menu section
  menuSection: { paddingHorizontal: 20, marginBottom: 16 },
  menuSectionTitle: { fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 1.5, marginBottom: 12 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 14, padding: 14,
    marginBottom: 6, borderWidth: 1, borderColor: colors.borderLight,
  },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  logoutItem: { marginTop: 8 },
  appVersion: { textAlign: 'center', fontSize: 11, color: colors.textMuted, marginTop: 16 },
});
