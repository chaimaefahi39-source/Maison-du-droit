import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, ActivityIndicator, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { useRequestStore } from '../../store/useRequestStore';
import { useLanguage } from '../../context/LanguageContext';

import { notifyRequestStatus } from '../../services/notifications';

function getStatusColor(status: string) {
  switch (status) {
    case 'pending': return colors.statusPending;
    case 'processing': return colors.statusProcessing;
    case 'resolved': return colors.statusResolved;
    case 'closed': return colors.statusClosed;
    default: return colors.textSecondary;
  }
}

function getStatusIcon(status: string): any {
  switch (status) {
    case 'pending': return 'clock';
    case 'processing': return 'loader';
    case 'resolved': return 'check-circle';
    case 'closed': return 'x-circle';
    default: return 'circle';
  }
}

function formatAiResponseText(text: string) {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return <View key={idx} style={{ height: 6 }} />;
    }

    const isHeader = /^###|^[0-9]\.|^📌|^📖|^⚖️|^⚠️|^\*\*/.test(trimmed);
    const isWarning = /⚠️|Avertissement|تنبيه|Warning/i.test(trimmed);

    if (isHeader) {
      const cleanHeader = trimmed.replace(/^###\s*/, '').replace(/\*\*/g, '');
      return (
        <Text
          key={idx}
          style={[
            styles.aiSectionHeader,
            isWarning && { color: colors.warning }
          ]}
        >
          {cleanHeader}
        </Text>
      );
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      const cleanBullet = trimmed.replace(/^[-•]\s*/, '').replace(/\*\*/g, '');
      return (
        <View key={idx} style={styles.bulletRow}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>{cleanBullet}</Text>
        </View>
      );
    }

    const cleanLine = trimmed.replace(/\*\*/g, '');
    return (
      <Text key={idx} style={styles.aiBodyText}>
        {cleanLine}
      </Text>
    );
  });
}

export default function RequestsScreen() {
  const router = useRouter();
  const { requests, isLoading, loadRequests, createRequest, deleteRequest } = useRequestStore();
  const { language, t, textAlign, flexDirection } = useLanguage();

  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [creating, setCreating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const CATEGORIES = [
    { label: t('catGeneral'), value: 'general' },
    { label: t('catLabor'), value: 'travail' },
    { label: t('catHousing'), value: 'logement' },
    { label: t('catFamily'), value: 'famille' },
    { label: t('catCommerce'), value: 'commerce' },
    { label: t('catPenal'), value: 'penal' },
    { label: t('catAdmin'), value: 'administratif' },
  ];

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return t('statusPending');
      case 'processing': return t('statusProcessing');
      case 'resolved': return t('statusResolved');
      case 'closed': return t('statusClosed');
      default: return status;
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = filterStatus
    ? requests.filter(r => r.status === filterStatus)
    : requests;

  const handleCreate = async () => {
    if (!title.trim() || !description.trim()) return;
    const reqTitle = title.trim();
    setCreating(true);
    try {
      await createRequest({ title: reqTitle, description: description.trim(), category, language });
      setShowModal(false);
      setTitle('');
      setDescription('');
      setCategory('general');
      notifyRequestStatus(reqTitle, 'resolved');
    } catch {
      // Handle error
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRequest = (requestToDelete: any) => {
    const executeDelete = async () => {
      try {
        await deleteRequest(requestToDelete.id);
        if (selectedRequest?.id === requestToDelete.id) {
          setSelectedRequest(null);
        }
      } catch (err: any) {
        Alert.alert(t('error'), err.message || t('error'));
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(t('confirmDeleteReq'))) {
        executeDelete();
      }
    } else {
      Alert.alert(
        t('deleteRequest'),
        t('confirmDeleteReq'),
        [
          { text: t('cancel'), style: 'cancel' },
          { text: t('delete'), style: 'destructive', onPress: executeDelete },
        ]
      );
    }
  };

  const handleAskAboutRequest = (req: any) => {
    setSelectedRequest(null);
    router.push({
      pathname: '/(app)/chat',
      params: { initialMessage: `J'ai besoin d'aide pour ma demande "${req.title}": ${req.description}` },
    } as any);
  };

  const renderRequest = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.requestCard}
      activeOpacity={0.8}
      onPress={() => setSelectedRequest(item)}
    >
      <View style={[styles.cardHeader, { flexDirection }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '10' }]}>
            <Text style={[styles.categoryText, { color: colors.primary }]}>{item.category}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '18' }]}>
            <Feather name={getStatusIcon(item.status)} size={12} color={getStatusColor(item.status)} />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => handleDeleteRequest(item)}
        >
          <Feather name="trash-2" size={16} color={colors.danger} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.requestTitle, { textAlign }]}>{item.title}</Text>
      <Text style={[styles.requestDesc, { textAlign }]} numberOfLines={2}>{item.description}</Text>
      <Text style={[styles.requestDate, { textAlign }]}>
        {new Date(item.createdAt).toLocaleDateString(language === 'ar' ? 'ar-MA' : language === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
      </Text>
      {item.aiResponse && (
        <View style={[styles.aiResponseBox, { flexDirection }]}>
          <Feather name="cpu" size={12} color={colors.primary} />
          <Text style={styles.aiResponseLabel}>{t('aiResponseAvailable')}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { flexDirection }]}>
        <Text style={styles.headerTitle}>{t('myRequests')}</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowModal(true)}>
          <Feather name="plus" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={[styles.filterRow, { flexDirection }]}
      >
        <TouchableOpacity
          style={[styles.filterChip, !filterStatus && styles.filterChipActive]}
          onPress={() => setFilterStatus(null)}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, !filterStatus && styles.filterTextActive]}>{t('filterAll')}</Text>
        </TouchableOpacity>
        {['pending', 'processing', 'resolved', 'closed'].map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.filterChip, filterStatus === s && styles.filterChipActive]}
            onPress={() => setFilterStatus(filterStatus === s ? null : s)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, filterStatus === s && styles.filterTextActive]}>
              {getStatusLabel(s)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRequest}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="inbox" size={48} color={colors.border} />
              <Text style={styles.emptyTitle}>{t('noRequests')}</Text>
              <Text style={styles.emptySubtitle}>{t('createFirstRequest')}</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, { flexDirection }]}>
              <Text style={styles.modalTitle}>{t('newRequest')}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { textAlign }]}>{t('inputTitle')}</Text>
              <TextInput
                style={[styles.modalInput, { textAlign }]}
                value={title}
                onChangeText={setTitle}
                placeholder={t('titlePlaceholder')}
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { textAlign }]}>{t('inputDescription')}</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea, { textAlign }]}
                value={description}
                onChangeText={setDescription}
                placeholder={t('descPlaceholder')}
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
              />

              <Text style={[styles.inputLabel, { textAlign }]}>{t('inputCategory')}</Text>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[styles.catOption, category === cat.value && styles.catOptionActive]}
                    onPress={() => setCategory(cat.value)}
                  >
                    <Text style={[styles.catOptionText, category === cat.value && styles.catOptionTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.submitButton, creating && { opacity: 0.7 }]}
                onPress={handleCreate}
                disabled={creating || !title.trim() || !description.trim()}
              >
                {creating ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitText}>{t('submitRequest')}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={!!selectedRequest} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedRequest && (
              <>
                <View style={[styles.modalHeader, { flexDirection }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '10' }]}>
                      <Text style={[styles.categoryText, { color: colors.primary }]}>{selectedRequest.category}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedRequest.status) + '18' }]}>
                      <Feather name={getStatusIcon(selectedRequest.status)} size={12} color={getStatusColor(selectedRequest.status)} />
                      <Text style={[styles.statusText, { color: getStatusColor(selectedRequest.status) }]}>
                        {getStatusLabel(selectedRequest.status)}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <TouchableOpacity onPress={() => handleDeleteRequest(selectedRequest)}>
                      <Feather name="trash-2" size={18} color={colors.danger} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setSelectedRequest(null)}>
                      <Feather name="x" size={24} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={[styles.modalTitle, { textAlign }]}>{selectedRequest.title}</Text>
                  <Text style={[styles.requestDate, { textAlign }]}>
                    {new Date(selectedRequest.createdAt).toLocaleDateString(language === 'ar' ? 'ar-MA' : language === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>

                  <Text style={[styles.inputLabel, { marginTop: 16, textAlign }]}>{t('inputDescription')}</Text>
                  <Text style={[styles.requestDescText, { textAlign }]}>{selectedRequest.description}</Text>

                  {selectedRequest.aiResponse ? (
                    <View style={styles.aiResponseCard}>
                      <View style={[styles.aiResponseHeader, { flexDirection }]}>
                        <Feather name="shield" size={16} color={colors.statusResolved} />
                        <Text style={styles.aiResponseTitle}>{t('aiReportTitle')}</Text>
                      </View>
                      <View style={styles.aiResponseBody}>
                        {formatAiResponseText(selectedRequest.aiResponse)}
                      </View>
                    </View>
                  ) : (
                    <View style={[styles.pendingCard, { flexDirection }]}>
                      <Feather name="clock" size={16} color={colors.warning} />
                      <Text style={styles.pendingText}>{t('analyzingRequest')}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.chatActionButton, { flexDirection }]}
                    onPress={() => handleAskAboutRequest(selectedRequest)}
                  >
                    <Feather name="message-square" size={16} color={colors.primary} />
                    <Text style={styles.chatActionText}>{t('discussWithAi')} →</Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}
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
  addButton: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  filterRow: {
    paddingHorizontal: 20, paddingVertical: 4, gap: 10,
    alignItems: 'center', marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 20, paddingVertical: 10, height: 42, borderRadius: 21,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  filterTextActive: { color: '#FFF', fontWeight: '700' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  requestCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: colors.borderLight,
  },
  cardHeader: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  categoryText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  statusText: { fontSize: 10, fontWeight: '700' },
  requestTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 6 },
  requestDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 8 },
  requestDate: { fontSize: 11, color: colors.textMuted },
  aiResponseBox: {
    alignItems: 'center', gap: 6,
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  aiResponseLabel: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingBottom: 40, paddingTop: 20, maxHeight: '85%',
  },
  modalHeader: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  inputLabel: { fontSize: 10, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, letterSpacing: 1.2 },
  modalInput: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 14,
    paddingHorizontal: 16, height: 50, fontSize: 14, color: colors.text,
    backgroundColor: colors.surfaceAlt, marginBottom: 18,
  },
  textArea: { height: 120, paddingTop: 14 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  catOption: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, height: 40,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
  },
  catOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catOptionText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  catOptionTextActive: { color: '#FFF', fontWeight: '700' },
  submitButton: {
    backgroundColor: colors.primary, borderRadius: 14, height: 54,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  requestDescText: { fontSize: 14, color: colors.text, lineHeight: 21, marginBottom: 16 },
  aiResponseCard: {
    backgroundColor: colors.surfaceAlt, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: colors.border, marginTop: 14, marginBottom: 14,
  },
  aiResponseHeader: {
    alignItems: 'center', gap: 8,
    paddingBottom: 10, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  aiResponseTitle: { fontSize: 13, fontWeight: '700', color: colors.statusResolved, letterSpacing: 0.3 },
  aiResponseBody: { gap: 2 },
  aiSectionHeader: { fontSize: 14, fontWeight: '700', color: colors.primary, marginTop: 10, marginBottom: 4 },
  aiBodyText: { fontSize: 13, color: colors.text, lineHeight: 20, marginBottom: 2 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', paddingLeft: 4, marginBottom: 3 },
  bulletDot: { fontSize: 14, color: colors.primary, marginRight: 8, lineHeight: 20 },
  bulletText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 20 },
  chatActionButton: {
    alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary + '15', borderWidth: 1, borderColor: colors.primary + '40',
    borderRadius: 14, height: 48, marginTop: 8, marginBottom: 24,
  },
  chatActionText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  pendingCard: {
    alignItems: 'center', gap: 10,
    backgroundColor: colors.warningBg, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.warning + '40', marginTop: 12,
  },
  pendingText: { fontSize: 12, color: colors.warning, flex: 1, fontWeight: '500' },
});

