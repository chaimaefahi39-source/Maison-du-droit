import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../../theme/colors';
import { getResources, LegalResource } from '../../services/api';

const CATEGORIES = [
  { label: 'Toutes', value: '' },
  { label: 'Général', value: 'general' },
  { label: 'Travail', value: 'travail' },
  { label: 'Logement', value: 'logement' },
  { label: 'Famille', value: 'famille' },
  { label: 'Commerce', value: 'commerce' },
  { label: 'Pénal', value: 'penal' },
  { label: 'Administratif', value: 'administratif' },
];

export default function ResourcesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(params.category || '');
  const [resources, setResources] = useState<LegalResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResource, setSelectedResource] = useState<LegalResource | null>(null);

  useEffect(() => {
    if (params.category !== undefined) {
      setSelectedCategory(params.category);
    }
  }, [params.category]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await getResources({
        q: searchQuery.trim() || undefined,
        category: selectedCategory || undefined,
      });
      if (res.success) {
        setResources(res.resources || []);
      }
    } catch {
      // Keep existing list on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchResources();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory]);

  const handleAskAboutResource = (resource: LegalResource) => {
    setSelectedResource(null);
    router.push({
      pathname: '/(app)/chat',
      params: { initialMessage: `J'ai une question concernant l'article "${resource.title}": ${resource.content.slice(0, 150)}...` },
    } as any);
  };

  const renderResource = ({ item }: { item: LegalResource }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => setSelectedResource(item)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.textMuted} />
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardPreview} numberOfLines={3}>
        {item.content}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardLinkText}>Consulter les détails →</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ressources Juridiques</Text>
        <Text style={styles.headerSubtitle}>Explorez les articles et textes de loi</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Feather name="search" size={18} color={colors.iconDisabled} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un article, mot-clé..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={18} color={colors.iconDisabled} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.value;
          return (
            <TouchableOpacity
              key={cat.value}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => setSelectedCategory(cat.value)}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{cat.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={resources}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderResource}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="book-open" size={48} color={colors.border} />
              <Text style={styles.emptyTitle}>Aucune ressource trouvée</Text>
              <Text style={styles.emptySubtitle}>Essayez de modifier votre recherche ou la catégorie</Text>
            </View>
          }
        />
      )}

      {/* Resource Detail Modal */}
      <Modal visible={!!selectedResource} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedResource && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{selectedResource.category}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedResource(null)}>
                    <Feather name="x" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                  <Text style={styles.modalTitle}>{selectedResource.title}</Text>

                  <View style={styles.contentDivider} />

                  <Text style={styles.modalBodyText}>{selectedResource.content}</Text>

                  {selectedResource.url && (
                    <TouchableOpacity
                      style={styles.urlButton}
                      onPress={() => Linking.openURL(selectedResource.url!)}
                    >
                      <Feather name="external-link" size={16} color={colors.primary} />
                      <Text style={styles.urlButtonText}>Voir la source officielle (Service Public)</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>

                <TouchableOpacity
                  style={styles.askButton}
                  onPress={() => handleAskAboutResource(selectedResource)}
                >
                  <Ionicons name="chatbubbles-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.askButtonText}>Poser une question sur cet article</Text>
                </TouchableOpacity>
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
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  headerSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  searchContainer: { paddingHorizontal: 20, marginVertical: 12 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  categoryRow: { paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: '#FFF' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  categoryBadge: {
    backgroundColor: colors.primary + '18',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: { fontSize: 10, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 6 },
  cardPreview: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: 12 },
  cardFooter: { borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 10 },
  cardLinkText: { fontSize: 12, fontWeight: '600', color: colors.accent },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 36,
    maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalScroll: { marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 12 },
  contentDivider: { height: 1, backgroundColor: colors.borderLight, marginBottom: 16 },
  modalBodyText: { fontSize: 14, color: colors.textSecondary, lineHeight: 22, marginBottom: 20 },
  urlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  urlButtonText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  askButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 52,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  askButtonText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
