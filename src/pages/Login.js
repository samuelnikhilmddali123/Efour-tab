import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import axios from 'axios';
import { API_URL, storage } from '../api/config';
import { Ionicons } from '@expo/vector-icons';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    // Mocking the backend login
    setTimeout(async () => {
      try {
        const mockUser = {
          id: 'user1',
          name: 'Local Admin',
          email: email.toLowerCase(),
          role: 'admin'
        };
        const mockToken = 'local-mock-token';

        await storage.setToken(mockToken);
        await storage.setUser(mockUser);
        onLoginSuccess(mockUser);
      } catch (err) {
        Alert.alert('Login Failed', 'Something went wrong locally.');
      } finally {
        setLoading(false);
      }
    }, 1000);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Image source={require('../../assets/public/logo.jpeg')} style={styles.logo} resizeMode="contain" />
          
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>ETHREE POS SYSTEM</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>EMAIL ADDRESS</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="name@company.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
          </TouchableOpacity>

          <Text style={styles.footer}>Protected by E3 Security System</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
  logo: { width: '100%', height: 60, marginBottom: 20 },
  header: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 10, fontWeight: 'bold', color: '#64748b', letterSpacing: 2, marginTop: 5 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 10, fontWeight: 'bold', color: '#64748b', marginBottom: 8, marginLeft: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 15 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#0f172a' },
  button: { backgroundColor: '#a855f7', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 10, shadowColor: '#a855f7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  footer: { textAlign: 'center', fontSize: 10, color: '#94a3b8', marginTop: 30, textTransform: 'uppercase', letterSpacing: 1 },
});
