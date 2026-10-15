import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, ErrorBlock, Field, GhostButton, Header, ListRow, LoadingBlock, PrimaryButton, Screen, uiStyles } from '@/components/ui';
import { createCategory, deleteCategory, listCategories, updateCategory, type CategoryInput } from '@/data/repository';
import { useI18n } from '@/i18n/provider';
import { colors, radius, spacing } from '@/theme/tokens';

type Editor = CategoryInput & { id: string | null };

export default function CategoriesScreen() {
  const { t, language } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: listCategories });
  const categories = categoriesQuery.data ?? [];
  const [editing, setEditing] = useState<Editor | null>(null);
  const refresh = async () => queryClient.invalidateQueries();
  const mutationError = (error: Error) => Alert.alert('Category', error.message || 'The category could not be saved.');
  const add = useMutation({ mutationKey: ['create-category'], mutationFn: createCategory, onSuccess: refresh, onError: mutationError });
  const edit = useMutation({ mutationKey: ['update-category'], mutationFn: ({ id, input }: { id: string; input: CategoryInput }) => updateCategory(id, input), onSuccess: refresh, onError: mutationError });
  const remove = useMutation({ mutationKey: ['delete-category'], mutationFn: deleteCategory, onSuccess: refresh, onError: mutationError });

  const openEditor = (category?: typeof categories[number]) => setEditing(category ? {
    id: category.id, nameEn: category.nameEn, nameUz: category.nameUz,
    descriptionEn: category.descriptionEn ?? '', descriptionUz: category.descriptionUz ?? '',
  } : { id: null, nameEn: '', nameUz: '', descriptionEn: '', descriptionUz: '' });
  const save = async () => {
    if (!editing?.nameEn.trim()) return Alert.alert(t('category'), `${t('categoryEnglish')} is required.`);
    const input: CategoryInput = editing;
    try {
      if (editing.id) await edit.mutateAsync({ id: editing.id, input }); else await add.mutateAsync(input);
      setEditing(null);
    } catch { return; }
  };
  const confirmDelete = () => {
    if (!editing?.id) return;
    Alert.alert('Delete category?', 'Historical expenses remain, but their category link will be cleared.', [
      { text: t('cancel') },
      { text: t('delete'), style: 'destructive', onPress: async () => { try { await remove.mutateAsync(editing.id as string); setEditing(null); } catch { return; } } },
    ]);
  };

  return <>
    <Screen>
      <Header title={t('categories')} action={<Pressable onPress={() => router.back()}><Text style={styles.action}>{t('done')}</Text></Pressable>} />
      <Text style={uiStyles.subtitle}>English is required. Uzbek text is optional and falls back to English when empty.</Text>
      {categoriesQuery.isLoading ? <LoadingBlock label="Loading categories…" /> : categoriesQuery.error ? <ErrorBlock message="Categories could not be loaded. The error was saved locally." onRetry={() => { void categoriesQuery.refetch(); }} /> : <Card>{categories.map((category) => {
        const name = language === 'uz' && category.nameUz.trim() ? category.nameUz : category.nameEn;
        const description = language === 'uz' ? category.descriptionUz || category.descriptionEn : category.descriptionEn;
        return <ListRow key={category.id} title={name} subtitle={description || `${category.useCount} ${t('uses')}`} color={category.color} onPress={() => openEditor(category)} />;
      })}</Card>}
      <PrimaryButton label={`${t('add')} ${t('category').toLowerCase()}`} onPress={() => openEditor()} />
    </Screen>
    <Modal visible={Boolean(editing)} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
      <View style={styles.backdrop}><View style={styles.modal}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
          <Text style={uiStyles.sectionTitle}>{editing?.id ? t('edit') : t('add')} {t('category').toLowerCase()}</Text>
          <Field autoFocus label={`${t('categoryEnglish')} *`} value={editing?.nameEn ?? ''} onChangeText={(nameEn) => setEditing((value) => value ? { ...value, nameEn } : null)} />
          <Field label={`${t('descriptionEnglish')} · ${t('optional')}`} value={editing?.descriptionEn ?? ''} onChangeText={(descriptionEn) => setEditing((value) => value ? { ...value, descriptionEn } : null)} multiline />
          <View style={styles.divider} />
          <Field label={`${t('categoryUzbek')} · ${t('optional')}`} value={editing?.nameUz ?? ''} onChangeText={(nameUz) => setEditing((value) => value ? { ...value, nameUz } : null)} />
          <Field label={`${t('descriptionUzbek')} · ${t('optional')}`} value={editing?.descriptionUz ?? ''} onChangeText={(descriptionUz) => setEditing((value) => value ? { ...value, descriptionUz } : null)} multiline />
          <PrimaryButton label={t('continue')} onPress={() => void save()} loading={add.isPending || edit.isPending} />
          <GhostButton label={t('cancel')} onPress={() => setEditing(null)} />
          {editing?.id ? <GhostButton danger label={t('delete')} onPress={confirmDelete} /> : null}
        </ScrollView>
      </View></View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  action: { color: colors.primary, minHeight: 48, textAlignVertical: 'center', fontWeight: '700' },
  backdrop: { flex: 1, justifyContent: 'center', backgroundColor: colors.overlay, padding: spacing.lg },
  modal: { maxHeight: '92%', backgroundColor: colors.elevated, borderRadius: radius.lg, overflow: 'hidden' },
  form: { padding: spacing.xl, gap: spacing.lg },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
