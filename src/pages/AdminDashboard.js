import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, TextInput, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL, storage } from '../api/config';
import { generateTicketsForCart } from '../utils/TicketFormatter';

const { width } = Dimensions.get('window');

// Mock or Native Printer check for re-printing
let NativePrinter = null;
try { 
  const p = require('react-native-thermal-receipt-printer-image-qr');
  if (p && p.BLEPrinter) NativePrinter = p.BLEPrinter;
} catch (e) {}

const Printer = NativePrinter || {
  printText: (t) => { console.log('Mock Reprint:', t); return Promise.resolve(); },
  printQRCode: (d) => { console.log('Mock QR:', d); return Promise.resolve(); },
  cutPaper: () => Promise.resolve(),
};

export default function AdminDashboard({ onBack, btStatus }) {
    const [stats, setStats] = useState({ total: 0, revenue: 0, scanned: 0, pending: 0 });
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isPrinting, setIsPrinting] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Mocking data for local-only mode
            setStats({
                total: 0,
                revenue: 0,
                scanned: 0,
                pending: 0
            });
            setTickets([]);
        } catch (err) {
            console.error('Admin Fetch Error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleReprint = async (masterTicket) => {
        if (btStatus !== 'connected' && NativePrinter) {
             Alert.alert('Printers Offline', 'Please connect bluetooth in POS screen first.');
             return;
        }

        setIsPrinting(true);
        try {
            const user = await storage.getUser();
            // Re-generate tickets from the master record items
            const ticketsToPrint = generateTicketsForCart(masterTicket.items || [], masterTicket.id, masterTicket.mobile, user, masterTicket.paymentMode || 'UPI');
            
            for (const t of ticketsToPrint) {
                await Printer.printText(t.text);
                if (Printer.printQRCode) await Printer.printQRCode(t.id);
                await Printer.printText("\n\n\n\n");
                if (Printer.cutPaper) await Printer.cutPaper();
            }
            Alert.alert('Success', 'Reprint command sent to printer.');
        } catch (e) {
            Alert.alert('Reprint Failed', e.message);
        } finally {
            setIsPrinting(false);
        }
    };

    const filteredTickets = tickets.filter(t => 
        (t.id && t.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.mobile && t.mobile.includes(searchTerm))
    );

    if (loading) return (
        <View style={styles.center}><ActivityIndicator size="large" color="#0084c2" /></View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.brandRow}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Ionicons name="apps" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>EFOUR <Text style={{color:'#3b82f6'}}>ADMIN</Text></Text>
                        <Text style={styles.headerSub}>MANAGEMENT & REPRINT CONSOLE</Text>
                    </View>
                    <View style={[styles.btBadge, {backgroundColor: btStatus === 'connected' ? '#10b981' : '#64748b'}]}>
                        <Ionicons name="bluetooth" size={10} color="#fff" />
                    </View>
                    <TouchableOpacity onPress={fetchData} style={styles.refreshBtn}>
                        <Ionicons name="refresh" size={18} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                    <View style={[styles.iconBox, {backgroundColor:'#ecfdf5'}]}><Ionicons name="bar-chart" size={20} color="#10b981" /></View>
                    <Text style={styles.statLabel}>TODAY REVENUE</Text>
                    <Text style={styles.statValue}>₹{stats.revenue?.toLocaleString() || 0}</Text>
                </View>
                <View style={styles.statCard}>
                    <View style={[styles.iconBox, {backgroundColor:'#eff6ff'}]}><Ionicons name="receipt" size={20} color="#3b82f6" /></View>
                    <Text style={styles.statLabel}>TICKETS SOLD</Text>
                    <Text style={styles.statValue}>{stats.total || 0}</Text>
                </View>
            </View>

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color="#94a3b8" style={{marginLeft: 15}} />
                <TextInput style={styles.searchInput} placeholder="Search Transaction ID or Mobile..." value={searchTerm} onChangeText={setSearchTerm} />
            </View>

            <View style={styles.listHeader}>
                <Text style={styles.listTitle}>All Transactions</Text>
                <Text style={styles.listCount}>{filteredTickets.length} Found</Text>
            </View>

            <FlatList
                data={filteredTickets}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listPadding}
                renderItem={({ item }) => (
                    <View style={styles.ticketCard}>
                        <View style={styles.ticketMain}>
                            <View style={styles.ticketBadge}><Ionicons name="ticket" size={14} color="#3b82f6" /></View>
                            <View style={{flex: 1}}>
                                <Text style={styles.ticketId}>{item.id}</Text>
                                <Text style={styles.ticketDetails}>{new Date(item.createdAt).toLocaleTimeString()} • {item.paymentMode?.toUpperCase()}</Text>
                            </View>
                            <View style={{alignItems:'flex-end'}}>
                                <Text style={styles.ticketAmount}>₹{item.amount}</Text>
                                <TouchableOpacity style={styles.reprintBtn} onPress={() => handleReprint(item)} disabled={isPrinting}>
                                    <Ionicons name="print" size={12} color="#fff" />
                                    <Text style={styles.reprintText}>REPRINT</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        {item.mobile && (
                            <View style={styles.ticketFooter}>
                                <Ionicons name="phone-portrait-outline" size={12} color="#64748b" />
                                <Text style={styles.mobileText}>{item.mobile}</Text>
                            </View>
                        )}
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { backgroundColor: '#0f172a', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    brandRow: { flexDirection: 'row', alignItems: 'center' },
    backButton: { marginRight: 15 },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 8, color: '#64748b', fontWeight: 'bold', letterSpacing: 1 },
    btBadge: { width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginLeft: 15 },
    refreshBtn: { marginLeft: 'auto', padding: 5 },
    statsGrid: { padding: 15, flexDirection: 'row', justifyContent: 'space-between' },
    statCard: { backgroundColor: '#fff', width: (width - 40) / 2, padding: 15, borderRadius: 20, elevation: 2 },
    iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    statLabel: { fontSize: 8, fontWeight: 'bold', color: '#64748b', marginBottom: 4 },
    statValue: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 15, borderRadius: 15, height: 50, elevation: 1 },
    searchInput: { flex: 1, paddingHorizontal: 10, fontSize: 13, color: '#1e293b' },
    listHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 20, marginBottom: 10 },
    listTitle: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
    listCount: { fontSize: 10, color: '#64748b', fontWeight: 'bold' },
    listPadding: { paddingHorizontal: 15, paddingBottom: 50 },
    ticketCard: { backgroundColor: '#fff', borderRadius: 18, padding: 15, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#3b82f6' },
    ticketMain: { flexDirection: 'row', alignItems: 'center' },
    ticketBadge: { width: 30, height: 30, backgroundColor: '#eff6ff', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    ticketId: { fontSize: 11, fontWeight: 'bold', color: '#1e293b' },
    ticketDetails: { fontSize: 9, color: '#64748b', marginTop: 2 },
    ticketAmount: { fontSize: 14, fontWeight: '900', color: '#00cc99' },
    reprintBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 5 },
    reprintText: { color: '#fff', fontSize: 8, fontWeight: 'bold', marginLeft: 4 },
    ticketFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    mobileText: { fontSize: 10, fontWeight: 'bold', color: '#64748b', marginLeft: 5 }
});
