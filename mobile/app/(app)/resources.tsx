import React, { useEffect, useState, useMemo } from 'react';
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
import { useResourcesQuery, LegalResource } from '../../services/resources';
import { useLanguage } from '../../context/LanguageContext';

export default function ResourcesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();
  const { language, t, textAlign, flexDirection } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(params.category || '');
  const [selectedResource, setSelectedResource] = useState<LegalResource | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, isRefetching, refetch } = useResourcesQuery({
    q: debouncedQuery || undefined,
    category: selectedCategory || undefined,
    lang: language,
  });

  const resources = useMemo(() => {
    const raw = data?.resources || [];
    return raw.filter(
      (item: LegalResource, index: number, self: LegalResource[]) =>
        index === self.findIndex((r) => r.id === item.id || r.title.trim() === item.title.trim())
    );
  }, [data]);

  const CATEGORIES = [
    { label: t('filterAll'), value: '' },
    { label: t('catGeneral'), value: 'general' },
    { label: t('catLabor'), value: 'travail' },
    { label: t('catHousing'), value: 'logement' },
    { label: t('catFamily'), value: 'famille' },
    { label: t('catCommerce'), value: 'commerce' },
    { label: t('catPenal'), value: 'penal' },
    { label: t('catAdmin'), value: 'administratif' },
  ];

  const getCategoryLabel = (catKey: string) => {
    switch ((catKey || '').toLowerCase()) {
      case 'general': return t('catGeneral');
      case 'travail': case 'labor': return t('catLabor');
      case 'logement': case 'housing': return t('catHousing');
      case 'famille': case 'family': return t('catFamily');
      case 'commerce': case 'commercial': return t('catCommerce');
      case 'penal': case 'penal law': return t('catPenal');
      case 'administratif': case 'admin': return t('catAdmin');
      default: return catKey;
    }
  };

  useEffect(() => {
    if (params.category !== undefined) {
      setSelectedCategory(params.category);
    }
  }, [params.category]);

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
      <View style={[styles.cardHeader, { flexDirection }]}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{getCategoryLabel(item.category)}</Text>
        </View>
        <Feather name={language === 'ar' ? 'chevron-left' : 'chevron-right'} size={18} color={colors.textMuted} />
      </View>
      <Text style={[styles.cardTitle, { textAlign }]}>{item.title}</Text>
      <Text style={[styles.cardPreview, { textAlign }]} numberOfLines={3}>
        {item.content}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={[styles.cardLinkText, { textAlign }]}>{t('seeDetails')}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { textAlign }]}>{t('legalResources')}</Text>
        <Text style={[styles.headerSubtitle, { textAlign }]}>{t('resourcesSubtitle')}</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { flexDirection }]}>
          <Feather name="search" size={18} color={colors.iconDisabled} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { textAlign }]}
            placeholder={t('searchPlaceholder')}
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={[styles.categoryRow, { flexDirection }]}
      >
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.value;
          return (
            <TouchableOpacity
              key={cat.value}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => setSelectedCategory(cat.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{cat.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      {isLoading ? (
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
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="book-open" size={48} color={colors.border} />
              <Text style={styles.emptyTitle}>{t('noResourcesFound')}</Text>
              <Text style={styles.emptySubtitle}>{t('tryModifyingSearch')}</Text>
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
                <View style={[styles.modalHeader, { flexDirection }]}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{getCategoryLabel(selectedResource.category)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedResource(null)}>
                    <Feather name="x" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                  <Text style={[styles.modalTitle, { textAlign }]}>{selectedResource.title}</Text>

                  <View style={styles.contentDivider} />

                  <Text style={[styles.modalBodyText, { textAlign }]}>{selectedResource.content}</Text>

                  {selectedResource.url && (
                    <TouchableOpacity
                      style={[styles.urlButton, { flexDirection }]}
                      onPress={() => Linking.openURL(selectedResource.url!)}
                    >
                      <Feather name="external-link" size={16} color={colors.primary} />
                      <Text style={styles.urlButtonText}>{t('viewOfficialSource')}</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>

                <TouchableOpacity
                  style={[styles.askButton, { flexDirection }]}
                  onPress={() => handleAskAboutResource(selectedResource)}
                >
                  <Ionicons name="chatbubbles-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.askButtonText}>{t('askAboutArticle')}</Text>
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
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  headerSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  searchContainer: { paddingHorizontal: 20, marginTop: 8, marginBottom: 12 },
  searchBox: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: { marginHorizontal: 6 },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  categoryRow: {
    paddingHorizontal: 20,
    paddingVertical: 4,
    gap: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: '#FFF', fontWeight: '700' },
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
  cardHeader: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
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
  modalHeader: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalScroll: { marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 12 },
  contentDivider: { height: 1, backgroundColor: colors.borderLight, marginBottom: 16 },
  modalBodyText: { fontSize: 14, color: colors.textSecondary, lineHeight: 22, marginBottom: 20 },
  urlButton: {
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

