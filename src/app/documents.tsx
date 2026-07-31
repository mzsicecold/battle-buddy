import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BBButton } from '@/components/bb/bb-button';
import { Card } from '@/components/bb/card';
import { ChipSelect } from '@/components/bb/chip-select';
import { Field } from '@/components/bb/field';
import { EmptyNote } from '@/components/bb/list-row';
import { ScreenHeader } from '@/components/bb/screen-header';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useVault } from '@/context/vault-context';
import { useTheme } from '@/hooks/use-theme';
import { DocumentCategory, DocumentEntry, uid } from '@/lib/app-data';
import { deleteDocumentFile, saveDocumentFile } from '@/lib/vault-storage';

const CATEGORIES: readonly DocumentCategory[] = ['Service', 'Finance', 'Medical / BDD', 'Other'];
const ALLOWED_EXT = ['pdf', 'jpeg', 'jpg', 'docx'];
const MAX_FILE_BYTES = 25 * 1024 * 1024;

function extOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}
function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
function fmtDate(d: string): string {
  if (!d) return '—';
  const parts = d.split('-');
  if (parts.length !== 3) return d;
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${parts[2]} ${months[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
}

export default function DocumentsScreen() {
  const { data, updateData } = useVault();
  const theme = useTheme();
  const [category, setCategory] = useState<DocumentCategory>('Service');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!data) return null;
  const { documents } = data;
  const totalBytes = documents.reduce((sum, d) => sum + d.size, 0);

  const ingestPickedFile = async (uri: string, name: string, mime: string | undefined) => {
    const ext = extOf(name);
    if (!ALLOWED_EXT.includes(ext)) {
      setError('Only .pdf, .jpeg, and .docx files are allowed.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const saved = await saveDocumentFile(uri, name);
      if (saved.size > MAX_FILE_BYTES) {
        deleteDocumentFile(saved.uri);
        setError(`That file is ${fmtBytes(saved.size)} — Battle Buddy caps single files at ${fmtBytes(MAX_FILE_BYTES)}.`);
        return;
      }
      const entry: DocumentEntry = {
        id: uid(),
        name,
        category,
        note: note.trim(),
        mime: mime ?? '',
        size: saved.size,
        fileUri: saved.uri,
        addedDate: new Date().toISOString().slice(0, 10),
      };
      updateData((d) => ({ ...d, documents: [...d.documents, entry] }));
      setNote('');
    } catch {
      setError('Could not add that file — try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleChooseFile = async () => {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'image/jpeg',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    await ingestPickedFile(asset.uri, asset.name, asset.mimeType);
  };

  const handleAddPhoto = async () => {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Photo library access is needed to add a photo — enable it in Settings > Battle Buddy.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.9 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const name = asset.fileName || `photo-${Date.now()}.jpg`;
    await ingestPickedFile(asset.uri, name, asset.mimeType ?? 'image/jpeg');
  };

  const removeDocument = (entry: DocumentEntry) => {
    deleteDocumentFile(entry.fileUri);
    updateData((d) => ({ ...d, documents: d.documents.filter((x) => x.id !== entry.id) }));
  };

  const shareDocument = async (entry: DocumentEntry) => {
    const available = await Sharing.isAvailableAsync();
    if (!available) return;
    await Sharing.shareAsync(entry.fileUri);
  };

  const sorted = [...documents].sort((a, b) => b.addedDate.localeCompare(a.addedDate));

  return (
    <SafeAreaView edges={['top']} style={styles.flex}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + Spacing.four }]}>
        <ScreenHeader
          eyebrow="06 · REPOSITORY"
          title="Documents"
          description="Travel receipts, signed extension contracts, BDD paperwork — encrypted and stored right alongside everything else here."
        />

        <Card title="Add a File" hint=".pdf, .jpeg, .docx only">
          <ChipSelect label="Category" value={category} options={CATEGORIES} onChange={(v) => setCategory(v as DocumentCategory)} />
          <Field
            label="Description"
            placeholder="e.g. Airfare receipt, PCS move Aug 2026"
            value={note}
            onChangeText={setNote}
          />
          {error ? (
            <ThemedText type="small" themeColor="crisis">
              {error}
            </ThemedText>
          ) : null}
          <View style={styles.buttonRow}>
            <BBButton label="Choose File" variant="accent" onPress={handleChooseFile} disabled={busy} />
            <BBButton label="Add Photo" onPress={handleAddPhoto} disabled={busy} />
          </View>
          <ThemedText type="small" themeColor="textFaint" style={styles.usage}>
            {documents.length === 0
              ? 'No files yet.'
              : `${fmtBytes(totalBytes)} across ${documents.length} file${documents.length === 1 ? '' : 's'} on this device.`}
          </ThemedText>
        </Card>

        <Card title="Repository" hint={`${documents.length} file${documents.length === 1 ? '' : 's'}`}>
          {sorted.length === 0 ? (
            <EmptyNote text="No files uploaded yet." />
          ) : (
            sorted.map((d) => (
              <View key={d.id} style={[styles.docRow, { borderTopColor: theme.borderSoft }]}>
                {d.mime.startsWith('image/') ? (
                  <Image source={{ uri: d.fileUri }} style={[styles.thumb, { borderColor: theme.border }]} />
                ) : (
                  <View style={[styles.iconBox, { borderColor: theme.border, backgroundColor: theme.surfaceRaised }]}>
                    <ThemedText type="code" themeColor="accent" style={styles.iconText}>
                      {extOf(d.name).toUpperCase()}
                    </ThemedText>
                  </View>
                )}
                <View style={styles.docMain}>
                  <ThemedText type="small" style={styles.docName}>
                    {d.name}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {d.category}
                    {d.note ? ` · ${d.note}` : ''} · {fmtBytes(d.size)} · {fmtDate(d.addedDate)}
                  </ThemedText>
                </View>
                <View style={styles.docActions}>
                  <Pressable onPress={() => shareDocument(d)} hitSlop={8} style={styles.docActionBtn}>
                    <ThemedText type="smallBold" themeColor="teal">
                      Share
                    </ThemedText>
                  </Pressable>
                  <Pressable onPress={() => removeDocument(d)} hitSlop={8} style={styles.docActionBtn}>
                    <ThemedText type="small" themeColor="textFaint">
                      ✕
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.one },
  buttonRow: { flexDirection: 'row', gap: Spacing.two },
  usage: { marginTop: Spacing.one },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two, borderTopWidth: 1 },
  thumb: { width: 40, height: 40, borderRadius: 6, borderWidth: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 10 },
  docMain: { flex: 1, gap: 2 },
  docName: { fontWeight: '600' },
  docActions: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  docActionBtn: { padding: 4 },
});
