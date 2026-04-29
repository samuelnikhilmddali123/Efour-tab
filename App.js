import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Image, Text, Animated, ScrollView, TouchableOpacity, Modal, FlatList, Platform, PermissionsAndroid, Alert, ActivityIndicator, useWindowDimensions, TextInput, RefreshControl } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetInfo } from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL, storage } from './src/api/config';
import Login from './src/pages/Login';
import AdminDashboard from './src/pages/AdminDashboard';
import PaymentWebView from './src/components/PaymentWebView';
import PaymentStatus from './src/components/PaymentStatus';
import { generateTicketsForCart } from './src/utils/TicketFormatter';
import PrinterService, { isNativePrinter } from './src/utils/PrinterService';
import ridesData from './assets/data/rides.json';

const FEATURED_NAMES = ['ETHREE BUS', 'SUN @ MOON', 'TL TRAIN', 'BALLOON SHOOTING'];
const TARGET_PRINTER_NAME = 'Printer001-6D49';
const FALLBACK_IMAGE = require('./assets/public/train_files/stackvil_logo.png');

function MainApp({ user, onLogout }) {
  const insets = useSafeAreaInsets();
  const netInfo = useNetInfo();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  
  const [isAdminView, setIsAdminView] = useState(false);
  const [cartModalVisible, setCartModalVisible] = useState(false);
  const [showAllRides, setShowAllRides] = useState(false);
  
  const [btStatus, setBtStatus] = useState('disconnected');
  const [rides, setRides] = useState([]);
  const [loadingRides, setLoadingRides] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [cart, setCart] = useState([]);
  const [mobile, setMobile] = useState('');
  
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [statusVisible, setStatusVisible] = useState(false);
  const [statusMode, setStatusMode] = useState('awaiting'); // awaiting, success, error

  // Connection Loop
  const autoConnect = async () => {
    if (btStatus === 'connected') return;
    try {
      setBtStatus('connecting');
      await PrinterService.init();
      const devices = await PrinterService.getDeviceList();
      const target = devices.find(d => (d.device_name || d.name || '').toLowerCase().includes(TARGET_PRINTER_NAME.toLowerCase()));
      if (target) {
        await PrinterService.connectPrinter(target.inner_mac_address || target.address);
        setBtStatus('connected');
      } else {
        setBtStatus('disconnected');
      }
    } catch (e) { setBtStatus('disconnected'); }
  };

  useEffect(() => {
    const init = async () => {
        if (Platform.OS === 'android') {
            try {
              await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
              ]);
            } catch (e) {}
        }
        fetchRides();
        autoConnect();
    };
    init();
    const timer = setInterval(() => { if (btStatus !== 'connected') autoConnect(); }, 15000);
    return () => clearInterval(timer);
  }, []);

  const fetchRides = async () => {
    try {
      // Using local data instead of backend API
      setRides(ridesData);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoadingRides(false); 
      setRefreshing(false); 
    }
  };

  const addToCart = (ride) => {
    const existing = cart.find(i => (i.id || i._id) === (ride.id || ride._id));
    if (existing) {
        setCart(cart.map(i => (i.id || i._id) === (ride.id || ride._id) ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
        setCart([...cart, { ...ride, quantity: 1, cartId: Math.random().toString() }]);
    }
  };

  const updateQuantity = (cartId, delta) => {
    setCart(cart.map(item => (item.cartId === cartId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item)).filter(i => i.quantity > 0));
  };

  const initiatePayment = async () => {
    if (cart.length === 0) return;
    try {
      // Bypassing payment gateway and server initiation
      Alert.alert(
        'Confirm Print',
        'Process order and print tickets?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Print', onPress: () => handlePaymentSuccess() }
        ]
      );
    } catch (err) { 
        setStatusMode('error');
        setStatusVisible(true);
    }
  };

  const handlePaymentSuccess = async () => {
    console.log('Payment success triggered. Starting print process...');
    setPaymentVisible(false);
    setStatusMode('success');
    setStatusVisible(true);
    
    const ticketId = `TXN-${Date.now().toString().slice(-8)}`;
    const ticketsToPrint = generateTicketsForCart(cart, ticketId, mobile, user, 'UPI');
    
    // 1. Quick Printer Check/Reconnect
    if (btStatus !== 'connected') {
        console.log('Printer not connected, attempting quick reconnect...');
        await autoConnect();
    }

    // 2. Start Printing Loop (Non-blocking)
    const runPrint = async () => {
        for (const t of ticketsToPrint) {
            try {
                console.log(`Printing ticket: ${t.id}`);
                await PrinterService.printText(t.text);
                if (PrinterService.printQRCode) await PrinterService.printQRCode(t.id);
                await PrinterService.printText("\n\n\n\n");
                await PrinterService.cutPaper();
                // Small delay between tickets for stability
                await new Promise(r => setTimeout(r, 500));
            } catch (e) {
                console.error('Print Error:', e);
            }
        }
        console.log('Printing loop finished.');
    };
    runPrint();

    // 3. Sync with server in background - DISABLED for local-only mode
    console.log('Server sync disabled in local mode.');

    setCart([]); 
    setMobile(''); 
    setCartModalVisible(false);
  };

  const handlePaymentFailure = () => {
    setPaymentVisible(false);
    setStatusMode('error');
    setStatusVisible(true);
  };

  const handleTestPrint = async () => {
    try {
      await PrinterService.printText("ETHREE POS TEST PRINT\n" + new Date().toLocaleString() + "\n\n\n\n");
      await PrinterService.cutPaper();
      Alert.alert('Success', 'Test print sent.');
    } catch (e) {
      Alert.alert('Error', 'Test print failed: ' + e.message);
    }
  };

  // UI Components
  const moreCardWidth = isLandscape ? (width * 0.65 / 2) - 20 : (width / 2) - 20;
  const cardHeight = isLandscape ? (height - 200) / 2 : 280;

  const renderRideCard = ({ item }) => {
    const imageUri = item.image ? `${API_URL}/images/${encodeURIComponent(item.image)}?ngrok-skip-browser-warning=1` : null;
    return (
      <View style={[styles.rideCard, { width: moreCardWidth, height: cardHeight }]}>
        <View style={styles.imageContainer}>
            <Image source={imageUri ? { uri: imageUri } : FALLBACK_IMAGE} style={styles.rideImage} defaultSource={FALLBACK_IMAGE} />
            <View style={styles.imageOverlay} />
            <View style={styles.imageTextRow}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.name.toUpperCase()}</Text>
                <View style={styles.priceTag}><Text style={styles.priceTagText}>₹{item.price}</Text></View>
            </View>
        </View>
        <View style={styles.cardFooter}>
            <Text style={styles.cardDesc} numberOfLines={isLandscape ? 1 : 2}>{item.description || 'No description available.'}</Text>
            <TouchableOpacity style={styles.addBtnExact} onPress={() => addToCart(item)}>
                <View style={styles.plusCircle}><Ionicons name="add" size={12} color="#475569" /></View>
                <Text style={styles.addBtnTextExact}>Add to Order</Text>
            </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderMoreCard = () => (
    <TouchableOpacity activeOpacity={0.8} onPress={() => setShowAllRides(!showAllRides)} style={[styles.rideCard, styles.moreCardExact, { width: moreCardWidth, height: cardHeight }]}>
      <View style={styles.moreIconBox}><Ionicons name={showAllRides ? "close" : "add-circle"} size={32} color="#94a3b8" /></View>
      <Text style={styles.moreTitle}>{showAllRides ? 'SHOW LESS' : 'SHOW MORE RIDES'}</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }) => (item.id === 'more-button' ? renderMoreCard() : renderRideCard({ item }));

  const featured = rides.filter(r => FEATURED_NAMES.includes(r.name.toUpperCase()));
  const finalDisplay = showAllRides ? rides : featured;
  const listData = [...finalDisplay];
  if (rides.length > 4) listData.push({ id: 'more-button' });

  const renderCart = () => (
    <View style={styles.cartContainer}>
      <View style={styles.cartHeader}><Ionicons name="cart" size={20} color="#1e293b" /><Text style={styles.cartHeaderText}>Current Order</Text></View>
      <ScrollView style={styles.cartScroll}>
        {cart.map((item) => (
           <View key={item.cartId} style={styles.cartItem}>
             <View style={{flex: 1}}><Text style={styles.itemName}>{item.name}</Text><Text style={styles.itemPrice}>₹{item.price}</Text></View>
             <View style={styles.qtyRow}>
                <TouchableOpacity onPress={() => updateQuantity(item.cartId, -1)} style={styles.qtyBtn}><Ionicons name="remove" size={12} color="#64748b" /></TouchableOpacity>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <TouchableOpacity onPress={() => updateQuantity(item.cartId, 1)} style={styles.qtyBtn}><Ionicons name="add" size={12} color="#64748b" /></TouchableOpacity>
             </View>
             <Text style={styles.itemTotal}>₹{item.price * item.quantity}</Text>
           </View>
        ))}
      </ScrollView>
      <View style={styles.cartFooterFull}>
        <TextInput style={styles.input} placeholder="Customer Mobile (Optional)" value={mobile} onChangeText={setMobile} keyboardType="numeric" maxLength={10} />
        <View style={styles.totalBox}>
            <View><Text style={styles.totalLabel}>Total Payable</Text><Text style={styles.totalValLarge}>₹{cart.reduce((s,i)=>s+(i.price*i.quantity),0)}</Text></View>
            <View style={styles.instantBox}><Text style={styles.instantText}>Instant Print</Text><Text style={styles.readyText}>READY</Text></View>
        </View>
        <TouchableOpacity style={styles.payBtnFull} onPress={initiatePayment}>
            <View style={styles.printerCircle}><Ionicons name="print" size={14} color="#0f172a" /></View>
            <Text style={styles.payBtnTextFull}>PRINT FINAL TICKET</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isAdminView) return <AdminDashboard onBack={() => setIsAdminView(false)} btStatus={btStatus} />;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 5 }]}>
         <View style={styles.headerTop}>
            <Image source={require('./assets/public/logo.jpeg')} style={styles.headerLogo} />
            <Text style={styles.headerTitle}>ETHREE <Text style={{color:'#f0c05a'}}>POS</Text></Text>
            <View style={styles.headerActions}>
                <View style={[styles.btIndicator, {backgroundColor: btStatus === 'connected' ? '#10b981' : '#ef4444'}]}>
                    <Text style={styles.btText}>{btStatus.toUpperCase()}</Text>
                </View>
                <TouchableOpacity onPress={handleTestPrint} style={styles.testBtn}>
                    <Text style={styles.testBtnText}>TEST</Text>
                </TouchableOpacity>
                {user.role === 'admin' && <TouchableOpacity onPress={() => setIsAdminView(true)} style={styles.adminBadge}><Text style={styles.adminLabel}>ADMIN</Text></TouchableOpacity>}
                <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}><Ionicons name="log-out-outline" size={20} color="#fff" /></TouchableOpacity>
            </View>
         </View>
      </View>

      <View style={[styles.body, { flexDirection: isLandscape ? 'row' : 'column' }]}>
        <View style={[styles.leftSide, isLandscape && { flex: 2.2 }]}>
            <View style={styles.sectionHeader}><View style={styles.accent} /><Text style={styles.sectionTitle}>Available Rides</Text></View>
            <FlatList data={listData} key={isLandscape ? 'h' : 'v'} numColumns={2} contentContainerStyle={styles.list} renderItem={renderItem} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchRides();}} />} />
        </View>
        {isLandscape && <View style={styles.rightSide}>{renderCart()}</View>}
      </View>
      
      {!isLandscape && cart.length > 0 && (
        <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 20 }]} onPress={() => setCartModalVisible(true)}>
             <Text style={styles.fabText}>VIEW CART • {cart.length} ITEMS</Text>
        </TouchableOpacity>
      )}

      <Modal visible={cartModalVisible} animationType="slide">
        <SafeAreaProvider style={{paddingTop: insets.top}}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Your Cart</Text><TouchableOpacity onPress={() => setCartModalVisible(false)}><Ionicons name="close" size={28} color="#000" /></TouchableOpacity></View>
            {renderCart()}
        </SafeAreaProvider>
      </Modal>

      <PaymentWebView visible={paymentVisible} url={paymentUrl} onCancel={() => setPaymentVisible(false)} onSuccess={handlePaymentSuccess} onFailure={handlePaymentFailure} />
      <PaymentStatus visible={statusVisible} status={statusMode} onRetry={() => { setStatusVisible(false); initiatePayment(); }} onCancel={() => setStatusVisible(false)} onDone={() => setStatusVisible(false)} />
      <StatusBar style="light" />
    </View>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storage.getUser().then(u => { if (u) setUser(u); setLoading(false); });
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#0084c2" /></View>;
  return <SafeAreaProvider>{user ? <MainApp user={user} onLogout={async () => { await storage.clear(); setUser(null); }} /> : <Login onLoginSuccess={setUser} />}</SafeAreaProvider>;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  root: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { backgroundColor: '#0f172a', paddingHorizontal: 15, paddingBottom: 15 },
  headerTop: { flexDirection: 'row', alignItems: 'center' },
  headerLogo: { width: 35, height: 35, borderRadius: 8, marginRight: 10 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff', flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  btIndicator: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 10, marginRight: 10 },
  btText: { color: '#fff', fontSize: 7, fontWeight: 'bold' },
  adminBadge: { backgroundColor: '#3b82f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginRight: 15 },
  adminLabel: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  testBtn: { backgroundColor: '#334155', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 15 },
  testBtnText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  logoutBtn: { padding: 5 },
  body: { flex: 1 },
  leftSide: { flex: 1, padding: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingHorizontal: 5 },
  accent: { width: 4, height: 18, backgroundColor: '#f0c05a', borderRadius: 2, marginRight: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', flex: 1 },
  list: { paddingBottom: 100 },
  rideCard: { backgroundColor: '#fff', borderRadius: 15, margin: 7, elevation: 3, overflow: 'hidden' },
  imageContainer: { width: '100%', height: 160, position: 'relative' },
  rideImage: { width: '100%', height: '100%' },
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.4)' },
  imageTextRow: { position: 'absolute', bottom: 10, left: 10, right: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 14, fontWeight: '900', color: '#fff', flex: 1 },
  priceTag: { backgroundColor: '#f0c05a', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  priceTagText: { fontWeight: '900', fontSize: 10, color: '#0f172a' },
  cardFooter: { padding: 10, flex: 1 },
  cardDesc: { fontSize: 10, color: '#64748b', marginBottom: 12 },
  addBtnExact: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  plusCircle: { backgroundColor: '#e2e8f0', borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  addBtnTextExact: { color: '#475569', fontWeight: 'bold', fontSize: 11 },
  moreCardExact: { borderStyle: 'dashed', borderWidth: 2, borderColor: '#cad5e2', backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  moreIconBox: { backgroundColor: '#fff', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  moreTitle: { fontSize: 14, fontWeight: '900', color: '#64748b' },
  rightSide: { flex: 1, backgroundColor: '#fff', borderLeftWidth: 1, borderLeftColor: '#e2e8f0' },
  cartContainer: { flex: 1, backgroundColor: '#fff' },
  cartHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  cartHeaderText: { flex: 1, marginLeft: 10, fontSize: 16, fontWeight: 'bold' },
  cartScroll: { flex: 1, padding: 15 },
  cartItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  itemName: { fontSize: 13, fontWeight: 'bold' },
  itemPrice: { fontSize: 10, color: '#64748b' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 8, padding: 2, marginHorizontal: 10 },
  qtyBtn: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  qtyText: { width: 20, textAlign: 'center', fontWeight: 'bold', fontSize: 11 },
  itemTotal: { fontSize: 13, fontWeight: '900' },
  cartFooterFull: { padding: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: '#fff' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, marginBottom: 15, fontSize: 13 },
  totalBox: { backgroundColor: '#0f172a', borderRadius: 15, padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  totalLabel: { fontSize: 8, fontWeight: '900', color: '#f0c05a' },
  totalValLarge: { fontSize: 26, fontWeight: '900', color: '#fff' },
  instantBox: { alignItems: 'flex-end' },
  instantText: { fontSize: 8, color: '#94a3b8' },
  readyText: { fontSize: 10, color: '#10b981', fontWeight: '900' },
  payBtnFull: { backgroundColor: '#0f172a', padding: 15, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  printerCircle: { backgroundColor: '#f0c05a', width: 24, height: 24, borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  payBtnTextFull: { color: '#fff', fontWeight: '900', fontSize: 12 },
  fab: { position: 'absolute', right: 20, left: 20, backgroundColor: '#0f172a', padding: 15, borderRadius: 30, alignItems: 'center' },
  fabText: { color: '#fff', fontWeight: 'bold' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' }
});
