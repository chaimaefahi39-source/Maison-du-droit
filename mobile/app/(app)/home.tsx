import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../store/useAuthStore';
import { useRequestStore } from '../../store/useRequestStore';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 56) / 2;

const QUICK_ACTIONS = [
  { icon: 'message-circle' as const, label: 'Poser une question', route: '/(app)/chat', color: colors.primary },
  { icon: 'file-plus' as const, label: 'Nouvelle demande', route: '/(app)/requests', color: colors.accent },
  { icon: 'book-open' as const, label: 'Ressources', route: '/(app)/resources', color: colors.primary },
  { icon: 'shield' as const, label: 'Mes droits', route: '/(app)/resources', color: colors.success },
];

const CATEGORIES = [
  { icon: '⚖️', label: 'Travail', value: 'travail' },
  { icon: '🏠', label: 'Logement', value: 'logement' },
  { icon: '👨‍👩‍👧', label: 'Famille', value: 'famille' },
  { icon: '💼', label: 'Commerce', value: 'commerce' },
  { icon: '🔒', label: 'Pénal', value: 'penal' },
  { icon: '🏛️', label: 'Administratif', value: 'administratif' },
];

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { requests, loadRequests } = useRequestStore();

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const resolvedCount = requests.filter(r => r.status === 'resolved').length;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{user?.fullName || 'Utilisateur'}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push('/(app)/profile' as any)}
          >
            <Feather name="user" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Hero Card */}
        <TouchableOpacity
          style={styles.heroCard}
          activeOpacity={0.9}
          onPress={() => router.push('/(app)/chat' as any)}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroIconBox}>
              <Ionicons name="shield-checkmark" size={28} color="#FFF" />
            </View>
            <Text style={styles.heroTitle}>Assistant Juridique IA</Text>
            <Text style={styles.heroSubtitle}>
              Posez vos questions juridiques et recevez des réponses personnalisées instantanément
            </Text>
            <View style={styles.heroButton}>
              <Text style={styles.heroButtonText}>Commencer une conversation</Text>
              <Feather name="arrow-right" size={16} color={colors.accent} />
            </View>
          </View>
          <View style={styles.heroDecor} />
        </TouchableOpacity>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/(app)/requests' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.statNumber}>{requests.length}</Text>
            <Text style={styles.statLabel}>Total demandes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.surfaceAlt }]}
            onPress={() => router.push('/(app)/requests' as any)}
            activeOpacity={0.7}
          >
            <Text style={[styles.statNumber, { color: colors.accent }]}>{pendingCount}</Text>
            <Text style={styles.statLabel}>En attente</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: colors.surfaceAlt }]}
            onPress={() => router.push('/(app)/requests' as any)}
            activeOpacity={0.7}
          >
            <Text style={[styles.statNumber, { color: colors.success }]}>{resolvedCount}</Text>
            <Text style={styles.statLabel}>Résolues</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>
        </View>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionCard}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconBox, { backgroundColor: action.color + '12' }]}>
                <Feather name={action.icon} size={20} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Categories */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Domaines juridiques</Text>
          <TouchableOpacity onPress={() => router.push('/(app)/resources' as any)}>
            <Text style={styles.seeAll}>Voir tout →</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {CATEGORIES.map((cat, index) => (
            <TouchableOpacity
              key={index}
              style={styles.categoryChip}
              activeOpacity={0.7}
              onPress={() => router.push({ pathname: '/(app)/resources', params: { category: cat.value } } as any)}
            >
              <Text style={styles.categoryEmoji}>{cat.icon}</Text>
              <Text style={styles.categoryLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Recent Requests */}
        {requests.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Demandes récentes</Text>
              <TouchableOpacity onPress={() => router.push('/(app)/requests' as any)}>
                <Text style={styles.seeAll}>Voir tout →</Text>
              </TouchableOpacity>
            </View>
            {requests.slice(0, 3).map((req) => (
              <TouchableOpacity
                key={req.id}
                style={styles.requestCard}
                activeOpacity={0.8}
                onPress={() => router.push('/(app)/requests' as any)}
              >
                <View style={styles.requestHeader}>
                  <Text style={styles.requestTitle} numberOfLines={1}>{req.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(req.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(req.status) }]}>
                      {getStatusLabel(req.status)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.requestCategory}>{req.category} • {new Date(req.createdAt).toLocaleDateString('fr-FR')}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'pending': return colors.accent;
    case 'processing': return colors.primary;
    case 'resolved': return colors.success;
    case 'closed': return colors.textSecondary;
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
  },
  greeting: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  userName: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 2 },
  profileButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  heroCard: {
    marginHorizontal: 20, borderRadius: 20, backgroundColor: colors.primary,
    overflow: 'hidden', marginBottom: 20,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  heroContent: { padding: 24, zIndex: 2 },
  heroIconBox: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  heroTitle: { fontSize: 20, fontWeight: '700', color: '#FFF', marginBottom: 8 },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 19, marginBottom: 20 },
  heroButton: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroButtonText: { fontSize: 14, fontWeight: '600', color: colors.accent },
  heroDecor: {
    position: 'absolute', right: -30, top: -30,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(200,164,92,0.1)',
  },
  statsRow: {
    flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 24,
  },
  statCard: {
    flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 14, padding: 14, alignItems: 'center',
  },
  statNumber: { fontSize: 22, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: 10, fontWeight: '600', color: colors.textSecondary, marginTop: 4, letterSpacing: 0.3 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  seeAll: { fontSize: 12, fontWeight: '600', color: colors.accent },
  actionsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8, marginBottom: 24,
  },
  actionCard: {
    width: CARD_WIDTH, backgroundColor: colors.surface, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: colors.border,
  },
  actionIconBox: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  actionLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  categoriesScroll: { paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 50,
    borderWidth: 1, borderColor: colors.border, gap: 6,
  },
  categoryEmoji: { fontSize: 16 },
  categoryLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  requestCard: {
    marginHorizontal: 20, backgroundColor: colors.surface, borderRadius: 14,
    padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.border,
  },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  requestTitle: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  requestCategory: { fontSize: 12, color: colors.textSecondary },
});
