import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useChatStore } from '../../store/useChatStore';

const SUGGESTIONS = [
  "Quels sont mes droits en tant que locataire ?",
  "Comment contester un licenciement ?",
  "Quelles sont les étapes d'un divorce ?",
  "Comment créer une entreprise ?",
];

export default function ChatScreen() {
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const { messages, isStreaming, isLoading, sendMessage, loadHistory, clearHistory } = useChatStore();

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom on new messages
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || isStreaming) return;
    setInputText('');
    sendMessage(text);
  };

  const handleSuggestion = (text: string) => {
    if (isStreaming) return;
    sendMessage(text);
  };

  const renderMessage = ({ item, index }: { item: any; index: number }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAssistant]}>
        {!isUser && (
          <View style={styles.avatarBox}>
            <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
          </View>
        )}
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}>
          <Text style={[
            styles.messageText,
            isUser ? styles.userText : styles.assistantText,
          ]}>
            {item.content}
            {isStreaming && index === messages.length - 1 && !isUser && (
              <Text style={styles.cursor}>▊</Text>
            )}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconBox}>
        <Ionicons name="shield-checkmark" size={40} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>Assistant Juridique</Text>
      <Text style={styles.emptySubtitle}>
        Posez vos questions juridiques et obtenez des réponses basées sur des sources fiables.
      </Text>

      <Text style={styles.suggestionsTitle}>Suggestions</Text>
      {SUGGESTIONS.map((suggestion, i) => (
        <TouchableOpacity
          key={i}
          style={styles.suggestionChip}
          onPress={() => handleSuggestion(suggestion)}
          activeOpacity={0.7}
        >
          <Feather name="message-circle" size={14} color={colors.primary} />
          <Text style={styles.suggestionText}>{suggestion}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
          <View>
            <Text style={styles.headerTitle}>Assistant Juridique</Text>
            <Text style={styles.headerSubtitle}>
              {isStreaming ? 'En train de répondre...' : 'En ligne'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.clearButton} onPress={clearHistory}>
          <Feather name="trash-2" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(_, i) => i.toString()}
            renderItem={renderMessage}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={[
              styles.messagesList,
              messages.length === 0 && { flex: 1 },
            ]}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Posez votre question juridique..."
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={2000}
              editable={!isStreaming}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || isStreaming) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim() || isStreaming}
            >
              {isStreaming ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Feather name="send" size={18} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.disclaimer}>
            Les réponses de l'IA ne remplacent pas un avis juridique professionnel.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  headerSubtitle: { fontSize: 11, color: colors.success, fontWeight: '500' },
  clearButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messagesList: { paddingHorizontal: 16, paddingVertical: 16 },
  messageRow: { marginBottom: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowAssistant: { justifyContent: 'flex-start' },
  avatarBox: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  messageBubble: {
    maxWidth: '78%', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: colors.userBubble, borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: colors.assistantBubble, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  messageText: { fontSize: 14, lineHeight: 21 },
  userText: { color: colors.userBubbleText },
  assistantText: { color: colors.assistantBubbleText },
  cursor: { color: colors.primary, fontSize: 14 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyIconBox: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    marginBottom: 20, borderWidth: 1, borderColor: colors.border,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19, marginBottom: 28 },
  suggestionsTitle: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1, marginBottom: 12, alignSelf: 'flex-start' },
  suggestionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    width: '100%', backgroundColor: colors.surface, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  suggestionText: { fontSize: 13, color: colors.text, flex: 1 },
  inputContainer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderLight },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: colors.surfaceAlt, borderRadius: 24,
    paddingLeft: 18, paddingRight: 6, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.border,
  },
  input: { flex: 1, fontSize: 14, color: colors.text, maxHeight: 100, paddingVertical: 6 },
  sendButton: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: colors.iconDisabled },
  disclaimer: { fontSize: 9, color: colors.textMuted, textAlign: 'center', marginTop: 6, letterSpacing: 0.2 },
});
