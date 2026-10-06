import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Modal, Switch, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../store/useAuthStore';
import { updateProfile } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { sendLocalNotification, requestNotificationPermissions } from '../../services/notifications';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, updateUser, clearAuth } = useAuthStore();
  const { language, setLanguage, t, textAlign, flexDirection } = useLanguage();

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);

  const [activeModal, setActiveModal] = useState<'notifications' | 'privacy' | 'help' | null>(null);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [requestAlertsEnabled, setRequestAlertsEnabled] = useState(true);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await updateProfile({ fullName, bio, phone, email });
      await updateUser(data.user);
      setIsEditing(false);
    } catch (error: any) {
      Alert.alert(t('error'), error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('logout'),
      t('confirmLogout'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('logout'),
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
        <View style={[styles.header, { flexDirection }]}>
          <Text style={styles.headerTitle}>{t('tabProfile')}</Text>
          <TouchableOpacity
            style={[styles.editButton, { flexDirection }]}
            onPress={() => isEditing ? handleSave() : setIsEditing(true)}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Feather name={isEditing ? 'check' : 'edit-2'} size={16} color={colors.primary} />
                <Text style={styles.editText}>{isEditing ? t('saveProfile') : t('editProfile')}</Text>
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
          {user?.bio && <Text style={[styles.profileBio, { textAlign }]}>{user.bio}</Text>}
        </View>

        {/* Edit Form or Info Cards */}
        {isEditing ? (
          <View style={styles.editForm}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { textAlign }]}>{t('fullName').toUpperCase()}</Text>
              <TextInput
                style={[styles.fieldInput, { textAlign }]}
                value={fullName}
                onChangeText={setFullName}
                placeholder={t('fullName')}
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { textAlign }]}>{t('email').toUpperCase()}</Text>
              <TextInput
                style={[styles.fieldInput, { textAlign }]}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="nom@exemple.com"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { textAlign }]}>{t('phone').toUpperCase()}</Text>
              <TextInput
                style={[styles.fieldInput, { textAlign }]}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+212 6 12 34 56 78"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { textAlign }]}>{t('bio').toUpperCase()}</Text>
              <TextInput
                style={[styles.fieldInput, { height: 80, textAlign }]}
                value={bio}
                onChangeText={setBio}
                placeholder={t('bio')}
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditing(false)}>
              <Text style={styles.cancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.infoSection}>
            {/* Info items */}
            <View style={styles.infoCard}>
              <View style={[styles.infoRow, { flexDirection }]}>
                <View style={[styles.infoIcon, { backgroundColor: colors.infoBg }]}>
                  <Feather name="mail" size={16} color={colors.info} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { textAlign }]}>{t('email')}</Text>
                  <Text style={[styles.infoValue, { textAlign }]}>{user?.email || '—'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={[styles.infoRow, { flexDirection }]}>
                <View style={[styles.infoIcon, { backgroundColor: colors.successBg }]}>
                  <Feather name="phone" size={16} color={colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { textAlign }]}>{t('phone')}</Text>
                  <Text style={[styles.infoValue, { textAlign }]}>{user?.phone || '—'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={[styles.infoRow, { flexDirection }]}>
                <View style={[styles.infoIcon, { backgroundColor: colors.warningBg }]}>
                  <Feather name="file-text" size={16} color={colors.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { textAlign }]}>{t('bio')}</Text>
                  <Text style={[styles.infoValue, { textAlign }]}>{user?.bio || '—'}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Language Changer Section */}
        <View style={styles.menuSection}>
          <Text style={[styles.menuSectionTitle, { textAlign }]}>{t('languageSelectorLabel')}</Text>
          <View style={styles.languageCard}>
            <View style={[styles.languageHeader, { flexDirection }]}>
              <View style={[styles.menuIcon, { backgroundColor: colors.primary + '18' }]}>
                <Feather name="globe" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.languageCurrentText, { textAlign }]}>
                {language === 'fr' ? 'Français' : language === 'ar' ? 'العربية' : 'English'}
              </Text>
            </View>

            <View style={styles.languageOptionsRow}>
              {([
                { code: 'fr', label: 'Français', sub: 'FR' },
                { code: 'ar', label: 'العربية', sub: 'AR' },
                { code: 'en', label: 'English', sub: 'EN' },
              ] as const).map((item) => {
                const isActive = language === item.code;
                return (
                  <TouchableOpacity
                    key={item.code}
                    style={[styles.langOptionCard, isActive && styles.langOptionCardActive]}
                    onPress={() => setLanguage(item.code)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.langOptionText, isActive && styles.langOptionTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <Text style={[styles.menuSectionTitle, { textAlign }]}>{t('settings').toUpperCase()}</Text>

          <TouchableOpacity style={[styles.menuItem, { flexDirection }]} onPress={() => setActiveModal('notifications')}>
            <View style={[styles.menuIcon, { backgroundColor: colors.infoBg }]}>
              <Feather name="bell" size={16} color={colors.info} />
            </View>
            <Text style={[styles.menuLabel, { textAlign }]}>{t('notifications')}</Text>
            <Feather name={language === 'ar' ? 'chevron-left' : 'chevron-right'} size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { flexDirection }]} onPress={() => setActiveModal('privacy')}>
            <View style={[styles.menuIcon, { backgroundColor: colors.successBg }]}>
              <Feather name="shield" size={16} color={colors.success} />
            </View>
            <Text style={[styles.menuLabel, { textAlign }]}>{t('privacy')}</Text>
            <Feather name={language === 'ar' ? 'chevron-left' : 'chevron-right'} size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { flexDirection }]} onPress={() => setActiveModal('help')}>
            <View style={[styles.menuIcon, { backgroundColor: colors.warningBg }]}>
              <Feather name="help-circle" size={16} color={colors.warning} />
            </View>
            <Text style={[styles.menuLabel, { textAlign }]}>{t('help')}</Text>
            <Feather name={language === 'ar' ? 'chevron-left' : 'chevron-right'} size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, styles.logoutItem, { flexDirection }]} onPress={handleLogout}>
            <View style={[styles.menuIcon, { backgroundColor: colors.dangerBg }]}>
              <Feather name="log-out" size={16} color={colors.danger} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.danger, textAlign }]}>{t('logout')}</Text>
            <Feather name={language === 'ar' ? 'chevron-left' : 'chevron-right'} size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>

        {/* App info */}
        <Text style={styles.appVersion}>Maison du Droit v1.0.0</Text>
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Notifications Modal */}
      <Modal visible={activeModal === 'notifications'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, { flexDirection }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.menuIcon, { backgroundColor: colors.infoBg }]}>
                  <Feather name="bell" size={18} color={colors.info} />
                </View>
                <Text style={styles.modalTitle}>{t('notifModalTitle')}</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.settingRow, { flexDirection }]}>
              <Text style={[styles.settingLabel, { textAlign }]}>{t('notifPushEnable')}</Text>
              <Switch
                value={pushEnabled}
                onValueChange={(val) => {
                  setPushEnabled(val);
                  if (val) requestNotificationPermissions();
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            <View style={[styles.settingRow, { flexDirection }]}>
              <Text style={[styles.settingLabel, { textAlign }]}>{t('notifRequestAlerts')}</Text>
              <Switch
                value={requestAlertsEnabled}
                onValueChange={setRequestAlertsEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            <TouchableOpacity
              style={styles.testNotifButton}
              onPress={async () => {
                await sendLocalNotification('Maison du Droit ⚖️', t('testNotifSuccess'));
                Alert.alert(t('notifications'), t('testNotifSuccess'));
              }}
              activeOpacity={0.8}
            >
              <Feather name="send" size={16} color="#FFF" />
              <Text style={styles.testNotifText}>{t('sendTestNotification')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeModalButton} onPress={() => setActiveModal(null)}>
              <Text style={styles.closeModalText}>{t('closeModal')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Privacy Modal */}
      <Modal visible={activeModal === 'privacy'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, { flexDirection }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.menuIcon, { backgroundColor: colors.successBg }]}>
                  <Feather name="shield" size={18} color={colors.success} />
                </View>
                <Text style={styles.modalTitle}>{t('privacyModalTitle')}</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.privacyCard}>
                <Feather name="lock" size={24} color={colors.success} style={{ marginBottom: 10 }} />
                <Text style={[styles.privacyBody, { textAlign }]}>{t('privacyDesc')}</Text>
              </View>

              <View style={styles.privacySection}>
                <Text style={[styles.privacySectionTitle, { textAlign }]}>{t('privacyEncryptionTitle')}</Text>
                <Text style={[styles.privacyBody, { textAlign }]}>{t('privacyEncryptionDesc')}</Text>
              </View>

              <TouchableOpacity style={styles.closeModalButton} onPress={() => setActiveModal(null)}>
                <Text style={styles.closeModalText}>{t('closeModal')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Help Modal */}
      <Modal visible={activeModal === 'help'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, { flexDirection }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.menuIcon, { backgroundColor: colors.warningBg }]}>
                  <Feather name="help-circle" size={18} color={colors.warning} />
                </View>
                <Text style={styles.modalTitle}>{t('helpModalTitle')}</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.faqSectionHeader, { textAlign }]}>{t('faqTitle')}</Text>

              <View style={styles.faqCard}>
                <Text style={[styles.faqQuestion, { textAlign }]}>❓ {t('faq1Q')}</Text>
                <Text style={[styles.faqAnswer, { textAlign }]}>{t('faq1A')}</Text>
              </View>

              <View style={styles.faqCard}>
                <Text style={[styles.faqQuestion, { textAlign }]}>⚖️ {t('faq2Q')}</Text>
                <Text style={[styles.faqAnswer, { textAlign }]}>{t('faq2A')}</Text>
              </View>

              <TouchableOpacity
                style={styles.supportActionButton}
                onPress={() => Linking.openURL('mailto:support@maisondudroit.ma')}
                activeOpacity={0.8}
              >
                <Feather name="mail" size={18} color={colors.primary} />
                <Text style={styles.supportActionText}>{t('contactSupportEmail')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.supportActionButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setActiveModal(null);
                  router.push('/(app)/chat' as any);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubbles-outline" size={18} color="#FFF" />
                <Text style={[styles.supportActionText, { color: '#FFF' }]}>{t('discussWithAi')}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.closeModalButton} onPress={() => setActiveModal(null)}>
                <Text style={styles.closeModalText}>{t('closeModal')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  editButton: { alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
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
  infoRow: { alignItems: 'center', gap: 14 },
  infoIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', letterSpacing: 0.3 },
  infoValue: { fontSize: 14, color: colors.text, fontWeight: '500', marginTop: 1 },
  // Menu section
  menuSection: { paddingHorizontal: 20, marginBottom: 16 },
  menuSectionTitle: { fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 1.5, marginBottom: 12 },
  menuItem: {
    alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 14, padding: 14,
    marginBottom: 6, borderWidth: 1, borderColor: colors.borderLight,
  },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginHorizontal: 6 },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text, marginHorizontal: 8 },
  logoutItem: { marginTop: 8 },
  // Language Card Styles
  languageCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.borderLight, marginBottom: 6,
  },
  languageHeader: {
    alignItems: 'center', marginBottom: 14,
  },
  languageCurrentText: {
    flex: 1, fontSize: 15, fontWeight: '700', color: colors.text, marginHorizontal: 8,
  },
  languageOptionsRow: {
    flexDirection: 'row', gap: 8,
  },
  langOptionCard: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 12,
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  langOptionCardActive: {
    backgroundColor: colors.primary, borderColor: colors.primary,
  },
  langOptionText: {
    fontSize: 13, fontWeight: '600', color: colors.textSecondary,
  },
  langOptionTextActive: {
    color: '#FFF', fontWeight: '700',
  },
  appVersion: { textAlign: 'center', fontSize: 11, color: colors.textMuted, marginTop: 16 },

  // Settings Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingBottom: 40, paddingTop: 20, maxHeight: '85%',
  },
  modalHeader: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  settingRow: {
    alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  settingLabel: { fontSize: 14, color: colors.text, fontWeight: '600', flex: 1, marginRight: 10 },
  testNotifButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.primary, borderRadius: 14, height: 48, marginTop: 24, marginBottom: 12,
  },
  testNotifText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  closeModalButton: {
    alignItems: 'center', paddingVertical: 14, borderRadius: 14, backgroundColor: colors.surfaceAlt,
    borderWidth: 1, borderColor: colors.border, marginTop: 8,
  },
  closeModalText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  privacyCard: {
    backgroundColor: colors.surfaceAlt, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.border, marginBottom: 16, alignItems: 'center',
  },
  privacySection: { marginBottom: 16 },
  privacySectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 6 },
  privacyBody: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  faqSectionHeader: { fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 1.2, marginBottom: 12 },
  faqCard: {
    backgroundColor: colors.surfaceAlt, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.borderLight, marginBottom: 12,
  },
  faqQuestion: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 6 },
  faqAnswer: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  supportActionButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.primary + '40',
    borderRadius: 14, height: 48, marginBottom: 10,
  },
  supportActionText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
});

