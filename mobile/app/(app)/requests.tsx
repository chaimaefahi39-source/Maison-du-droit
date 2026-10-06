import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { useRequestStore } from '../../store/useRequestStore';

const CATEGORIES = [
  { label: 'Général', value: 'general' },
  { label: 'Travail', value: 'travail' },
  { label: 'Logement', value: 'logement' },
  { label: 'Famille', value: 'famille' },
  { label: 'Commerce', value: 'commerce' },
  { label: 'Pénal', value: 'penal' },
  { label: 'Administratif', value: 'administratif' },
];

function getStatusColor(status: string) {
  switch (status) {
    case 'pending': return colors.statusPending;
    case 'processing': return colors.statusProcessing;
    case 'resolved': return colors.statusResolved;
    case 'closed': return colors.statusClosed;
    default: return colors.textSecondary;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'pending': return 'En attente';
    case 'processing': return 'En cours';
    case 'resolved': return 'Résolue';
    case 'closed': return 'Fermée';
    default: return status;
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

export default function RequestsScreen() {
  const router = useRouter();
  const { requests, isLoading, loadRequests, createRequest } = useRequestStore();
  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [creating, setCreating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = filterStatus
    ? requests.filter(r => r.status === filterStatus)
    : requests;

  const handleCreate = async () => {
    if (!title.trim() || !description.trim()) return;
    setCreating(true);
    try {
      await createRequest({ title: title.trim(), description: description.trim(), category });
      setShowModal(false);
      setTitle('');
      setDescription('');
      setCategory('general');
    } catch {
      // Handle error
    } finally {
      setCreating(false);
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
      <View style={styles.cardHeader}>
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
      <Text style={styles.requestTitle}>{item.title}</Text>
      <Text style={styles.requestDesc} numberOfLines={2}>{item.description}</Text>
      <Text style={styles.requestDate}>
        {new Date(item.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
      </Text>
      {item.aiResponse && (
        <View style={styles.aiResponseBox}>
          <Feather name="cpu" size={12} color={colors.primary} />
          <Text style={styles.aiResponseLabel}>Réponse IA disponible</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes demandes</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowModal(true)}>
          <Feather name="plus" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, !filterStatus && styles.filterChipActive]}
          onPress={() => setFilterStatus(null)}
        >
          <Text style={[styles.filterText, !filterStatus && styles.filterTextActive]}>Toutes</Text>
        </TouchableOpacity>
        {['pending', 'processing', 'resolved', 'closed'].map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.filterChip, filterStatus === s && styles.filterChipActive]}
            onPress={() => setFilterStatus(filterStatus === s ? null : s)}
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
              <Text style={styles.emptyTitle}>Aucune demande</Text>
              <Text style={styles.emptySubtitle}>Créez votre première demande juridique</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle demande</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>TITRE</Text>
              <TextInput
                style={styles.modalInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Ex: Litige avec mon employeur"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.inputLabel}>DESCRIPTION</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Décrivez votre situation en détail..."
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
              />

              <Text style={styles.inputLabel}>CATÉGORIE</Text>
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
                  <Text style={styles.submitText}>Soumettre la demande</Text>
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
                <View style={styles.modalHeader}>
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
                  <TouchableOpacity onPress={() => setSelectedRequest(null)}>
                    <Feather name="x" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.modalTitle}>{selectedRequest.title}</Text>
                  <Text style={styles.requestDate}>
                    Créé le {new Date(selectedRequest.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>

                  <Text style={[styles.inputLabel, { marginTop: 16 }]}>DESCRIPTION DU PROBLÈME</Text>
                  <Text style={styles.requestDescText}>{selectedRequest.description}</Text>

                  {selectedRequest.aiResponse ? (
                    <View style={styles.aiResponseCard}>
                      <View style={styles.aiResponseHeader}>
                        <Feather name="cpu" size={16} color={colors.primary} />
                        <Text style={styles.aiResponseTitle}>Réponse de l'Assistant Juridique</Text>
                      </View>
                      <Text style={styles.aiResponseText}>{selectedRequest.aiResponse}</Text>
                    </View>
                  ) : (
                    <View style={styles.pendingCard}>
                      <Feather name="clock" size={16} color={colors.warning} />
                      <Text style={styles.pendingText}>Votre demande est en cours d'analyse par l'assistant juridique.</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.submitButton, { marginTop: 20 }]}
                    onPress={() => handleAskAboutRequest(selectedRequest)}
                  >
                    <Text style={styles.submitText}>Discuter de cette demande avec l'IA →</Text>
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  addButton: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  filterRow: { paddingHorizontal: 20, gap: 8, marginBottom: 12 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  filterTextActive: { color: '#FFF' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  requestCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: colors.borderLight,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  categoryText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  statusText: { fontSize: 10, fontWeight: '700' },
  requestTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 6 },
  requestDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 8 },
  requestDate: { fontSize: 11, color: colors.textMuted },
  aiResponseBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
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
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  inputLabel: { fontSize: 10, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, letterSpacing: 1.2 },
  modalInput: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 14,
    paddingHorizontal: 16, height: 50, fontSize: 14, color: colors.text,
    backgroundColor: colors.surfaceAlt, marginBottom: 18,
  },
  textArea: { height: 120, paddingTop: 14 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  catOption: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
  },
  catOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catOptionText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  catOptionTextActive: { color: '#FFF' },
  submitButton: {
    backgroundColor: colors.primary, borderRadius: 14, height: 54,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  requestDescText: { fontSize: 14, color: colors.text, lineHeight: 21, marginBottom: 16 },
  aiResponseCard: {
    backgroundColor: colors.surfaceAlt, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.border, marginTop: 12,
  },
  aiResponseHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  aiResponseTitle: { fontSize: 13, fontWeight: '700', color: colors.primary },
  aiResponseText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  pendingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.warningBg, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.warning + '40', marginTop: 12,
  },
  pendingText: { fontSize: 12, color: colors.warning, flex: 1, fontWeight: '500' },
});
