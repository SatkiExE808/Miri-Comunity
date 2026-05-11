import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Button, Field, Screen } from '../../src/components/ui';
import { useAuth } from '../../src/store/auth';
import { colors } from '../../src/theme';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (!name || !email || !phone || !password) {
      Alert.alert('Missing info', 'Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Use at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }
    try {
      setBusy(true);
      await register({ name, email, phone, password });
    } catch (e: any) {
      Alert.alert('Could not register', e.message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: 14 }}>
          <View style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text }}>Create your account</Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>It only takes a minute.</Text>
          </View>
          <Field label="Full name" value={name} onChangeText={setName} placeholder="Your name" />
          <Field label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@example.com" />
          <Field label="Phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} placeholder="+60 ..." />
          <Field label="Password" secureTextEntry value={password} onChangeText={setPassword} placeholder="At least 6 characters" />
          <Field label="Confirm password" secureTextEntry value={confirm} onChangeText={setConfirm} placeholder="Repeat password" />
          <Button title={busy ? 'Creating…' : 'Create account'} onPress={onSubmit} disabled={busy} />
          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <Text style={{ color: colors.muted }}>
              Already have an account?{' '}
              <Link href="/(auth)/login" style={{ color: colors.primary, fontWeight: '700' }}>
                Sign in
              </Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
