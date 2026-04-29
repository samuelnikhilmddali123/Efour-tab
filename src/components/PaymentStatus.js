import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PaymentStatus({ visible, status, onRetry, onCancel, onDone }) {
  const { width } = useWindowDimensions();
  const isLandscape = width > 600;

  const config = {
    awaiting: {
      title: 'AWAITING PAYMENT',
      sub: 'A secure payment window has opened.',
      desc: 'Ask the customer to complete the transaction on their device.',
      statusLabel: 'TRANSACTION STATUS',
      statusVal: 'Scanning for Success...',
      icon: 'sync-outline',
      color: '#3b82f6',
      bg: '#1e293b',
    },
    success: {
      title: 'PAYMENT SUCCESSFUL',
      sub: 'The transaction was completed successfully.',
      desc: 'You can now hand over the tickets to the customer.',
      statusLabel: 'TRANSACTION ID',
      statusVal: 'PAYMENT VERIFIED',
      icon: 'checkmark-circle',
      color: '#10b981',
      bg: '#064e3b',
    },
    error: {
      title: 'TRANSACTION ERROR',
      sub: 'PLEASE ASK CUSTOMER TO TRY PAYMENT AGAIN',
      desc: 'The payment gateway rejected the request. Please verify the QR code or network.',
      statusLabel: 'ERROR DETAIL',
      statusVal: 'UPI Response Error',
      icon: 'close-circle',
      color: '#ef4444',
      bg: '#450a0a',
    }
  };

  const current = config[status] || config.awaiting;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.card, { width: isLandscape ? 450 : '90%' }]}>
          <View style={[styles.iconCircle, { backgroundColor: current.bg }]}>
            <Ionicons name={current.icon} size={60} color={current.color} />
          </View>
          
          <Text style={[styles.title, { color: current.color === '#3b82f6' ? '#fff' : current.color }]}>{current.title}</Text>
          <Text style={styles.sub}>{current.sub}</Text>
          <Text style={styles.desc}>{current.desc}</Text>

          <View style={styles.detailBox}>
            <View style={[styles.smallIcon, { backgroundColor: current.bg }]}>
                <Ionicons name={status === 'success' ? "receipt" : "alert-circle"} size={24} color={current.color} />
            </View>
            <View>
                <Text style={styles.statusLabel}>{current.statusLabel}</Text>
                <Text style={styles.statusVal}>{current.statusVal}</Text>
            </View>
          </View>

          {status === 'error' && (
            <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
                <Ionicons name="refresh" size={20} color="#fff" style={{marginRight: 10}} />
                <Text style={styles.btnText}>RETRY PAYMENT</Text>
            </TouchableOpacity>
          )}

          {(status === 'error' || status === 'awaiting') && (
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                <Ionicons name="home-outline" size={20} color="#94a3b8" style={{marginRight: 10}} />
                <Text style={styles.cancelBtnText}>CANCEL & RETURN</Text>
            </TouchableOpacity>
          )}

          {status === 'success' && (
            <TouchableOpacity style={[styles.retryBtn, { backgroundColor: '#10b981' }]} onPress={onDone}>
                <Text style={styles.btnText}>DONE</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.9)', justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#1e293b', borderRadius: 40, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  iconCircle: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  title: { fontSize: 28, fontWeight: '900', marginBottom: 10, textAlign: 'center' },
  sub: { fontSize: 14, color: '#94a3b8', textAlign: 'center', fontWeight: 'bold', marginBottom: 15, paddingHorizontal: 20 },
  desc: { fontSize: 12, color: '#64748b', textAlign: 'center', marginBottom: 30, lineHeight: 18 },
  detailBox: { backgroundColor: '#334155', width: '100%', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  smallIcon: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  statusLabel: { fontSize: 10, color: '#94a3b8', fontWeight: 'bold' },
  statusVal: { fontSize: 16, color: '#fff', fontWeight: 'bold' },
  retryBtn: { backgroundColor: '#e11d48', width: '100%', padding: 18, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelBtn: { width: '100%', padding: 18, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWeight: 1, borderColor: '#334155', borderWidth: 1 },
  cancelBtnText: { color: '#94a3b8', fontWeight: 'bold', fontSize: 14 },
});
