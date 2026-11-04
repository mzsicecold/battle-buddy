import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useVault } from '@/context/vault-context';
import { useTheme } from '@/hooks/use-theme';

/**
 * Key derivation (vault-crypto.ts) never lets the JS thread go back to the event loop: @noble/hashes
 * yields between chunks with a microtask, so React cannot paint anything until it finishes. Wait one
 * short timer first so "Creating your vault…" is on screen before the thread gets busy. The native
 * spinner keeps turning on its own while the JS thread is occupied.
 */
const letBusyStatePaint = () => new Promise<void>((resolve) => setTimeout(resolve, 60));

export function LockScreen() {
  const theme = useTheme();
  const { status, error, createPassword, unlock, clearError } = useVault();
  const isCreate = status === 'no-vault';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    clearError();
    setBusy(true);
    try {
      await letBusyStatePaint();
      if (isCreate) {
        await createPassword(password, confirm);
      } else {
        await unlock(password);
      }
    } finally {
      setBusy(false);
      setPassword('');
      setConfirm('');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.select({ ios: 'padding', default: undefined })}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={[styles.mark, { borderColor: theme.accent }]}>
              <ThemedText type="code" themeColor="accent">
                BB-6
              </ThemedText>
            </View>

            <ThemedText type="title" style={styles.title}>
              {isCreate ? 'Set a Password' : 'Enter Password'}
            </ThemedText>

            <ThemedText themeColor="textSecondary" style={styles.copy}>
              {isCreate
                ? "This encrypts everything you enter — pay info, medical/BDD notes, SAPR contacts, journal entries — before it's stored on this device."
                : 'Battle Buddy is locked. Enter your password to decrypt your data on this device.'}
            </ThemedText>

            {isCreate && (
              <View style={[styles.warning, { backgroundColor: theme.surfaceRaised, borderColor: theme.border, borderLeftColor: theme.accent }]}>
                <ThemedText type="small" themeColor="textFaint">
                  There&apos;s no password recovery. If you forget this password, the data stored
                  here cannot be decrypted or recovered.
                </ThemedText>
              </View>
            )}

            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                Password
              </ThemedText>
              <TextInput
                value={password}
                onChangeText={setPassword}
                editable={!busy}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                style={[
                  styles.input,
                  { color: theme.text, borderColor: theme.border, backgroundColor: theme.background },
                ]}
                placeholderTextColor={theme.textFaint}
              />
            </View>

            {isCreate && (
              <View style={styles.field}>
                <ThemedText type="small" themeColor="textSecondary">
                  Confirm password
                </ThemedText>
                <TextInput
                  value={confirm}
                  onChangeText={setConfirm}
                  editable={!busy}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[
                    styles.input,
                    { color: theme.text, borderColor: theme.border, backgroundColor: theme.background },
                  ]}
                  placeholderTextColor={theme.textFaint}
                />
              </View>
            )}

            {error && (
              <ThemedText type="small" themeColor="crisis" style={styles.error}>
                {error}
              </ThemedText>
            )}

            <Pressable
              onPress={submit}
              disabled={busy || !password}
              style={({ pressed }) => [
                styles.submit,
                { backgroundColor: theme.accent, opacity: pressed || busy || !password ? 0.7 : 1 },
              ]}>
              {busy ? (
                <View style={styles.busyRow}>
                  <ActivityIndicator color={theme.accentInk} />
                  <ThemedText type="smallBold" themeColor="accentInk">
                    {isCreate ? 'Creating your vault…' : 'Unlocking…'}
                  </ThemedText>
                </View>
              ) : (
                <ThemedText type="smallBold" themeColor="accentInk">
                  {isCreate ? 'Create & Unlock' : 'Unlock'}
                </ThemedText>
              )}
            </Pressable>

            {busy && (
              <ThemedText
                type="small"
                themeColor="textSecondary"
                accessibilityLiveRegion="polite"
                style={styles.busyNote}>
                {isCreate
                  ? 'Locking your data behind your password takes a few seconds. Keep this screen open.'
                  : 'Checking your password. This takes a few seconds.'}
              </ThemedText>
            )}

            <ThemedText type="small" themeColor="textFaint" style={styles.scopeNote}>
              AES-256 encryption, key derived from your password (PBKDF2). This protects the
              prototype&apos;s local storage — it is not an accredited system for handling
              official CUI.
            </ThemedText>

            <View style={[styles.crisisRow, { borderTopColor: theme.borderSoft }]}>
              <ThemedText type="small" themeColor="textSecondary">
                In crisis right now?
              </ThemedText>
              <Pressable
                onPress={() => Linking.openURL('tel:988')}
                style={[styles.crisisButton, { backgroundColor: theme.crisis }]}>
                <ThemedText type="smallBold" style={{ color: '#fff' }}>
                  Call 988, press 1
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  mark: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    marginBottom: Spacing.one,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    textTransform: 'uppercase',
  },
  copy: {
    marginBottom: Spacing.one,
  },
  warning: {
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginBottom: Spacing.one,
  },
  field: {
    gap: 5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    fontSize: 15,
  },
  error: {
    marginTop: -Spacing.one,
  },
  submit: {
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  busyNote: {
    lineHeight: 17,
  },
  scopeNote: {
    marginTop: Spacing.two,
    lineHeight: 17,
  },
  crisisRow: {
    borderTopWidth: 1,
    paddingTop: Spacing.three,
    marginTop: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  crisisButton: {
    borderRadius: 6,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
