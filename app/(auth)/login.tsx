import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Button, Field, Screen } from '../../src/components/ui';
import { useAuth } from '../../src/store/auth';
import { colors } from '../../src/theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (!email || !password) {
      Alert.alert('Missing info', 'Please enter your email and password.');
      return;
    }
    try {
      setBusy(true);
      await login({ email, password });
    } catch (e: any) {
      Alert.alert('Could not sign in', e.message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: 16 }}>
          <View style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 32, fontWeight: '800', color: colors.text }}>Miri Comunity</Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>
              Sign in to buy, sell, send parcels and book rides around Miri.
            </Text>
          </View>
          <Field label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@example.com" />
          <Field label="Password" secureTextEntry value={password} onChangeText={setPassword} placeholder="••••••••" />
          <Button title={busy ? 'Signing in…' : 'Sign in'} onPress={onSubmit} disabled={busy} />
          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <Text style={{ color: colors.muted }}>
              New here?{' '}
              <Link href="/(auth)/register" style={{ color: colors.primary, fontWeight: '700' }}>
                Create an account
              </Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
