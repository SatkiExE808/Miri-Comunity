import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Field, Screen } from '../../../src/components/ui';
import { useAuth } from '../../../src/store/auth';
import { useData } from '../../../src/store/data';
import { colors, radius, spacing } from '../../../src/theme';

export default function NewListing() {
  const { user } = useAuth();
  const { addListing } = useData();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to attach an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function onSubmit() {
    const priceNum = parseFloat(price);
    if (!title.trim() || !description.trim() || Number.isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Missing info', 'Please enter a title, price and description.');
      return;
    }
    if (!user) return;
    try {
      setBusy(true);
      await addListing({
        title: title.trim(),
        price: priceNum,
        description: description.trim(),
        imageUri,
        sellerId: user.id,
        sellerName: user.name,
      });
      router.back();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl }}>
          <Pressable onPress={pickImage} style={styles.imageBox}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.image} />
            ) : (
              <View style={{ alignItems: 'center', gap: 6 }}>
                <Ionicons name="camera-outline" size={32} color={colors.muted} />
                <Text style={{ color: colors.muted }}>Tap to add a photo</Text>
              </View>
            )}
          </Pressable>

          <Field label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Used iPhone 12" />
          <Field label="Price (RM)" keyboardType="decimal-pad" value={price} onChangeText={setPrice} placeholder="0.00" />
          <Field
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Condition, pickup location, etc."
            multiline
            numberOfLines={4}
            style={{ minHeight: 100, textAlignVertical: 'top' }}
          />

          <Button title={busy ? 'Posting…' : 'Post listing'} onPress={onSubmit} disabled={busy} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  imageBox: {
    height: 200,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
});
