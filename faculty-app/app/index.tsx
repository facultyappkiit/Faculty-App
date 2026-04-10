import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  Text, 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  ScrollView,
  RefreshControl,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { getTeacherRequests, getPendingRequests, updatePushToken } from '../services/api';

const PROJECT_ID = 'ed1e64f3-437b-4909-b789-f85fdc03f788';

const HomeScreen = () => {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [availableCount, setAvailableCount] = useState(0);
  const [myPendingCount, setMyPendingCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pushRegistered = useRef(false);

  // Register push notifications when home screen loads
  useEffect(() => {
    if (user && !pushRegistered.current) {
      pushRegistered.current = true;
      registerPushNotifications();
    }
  }, [user]);

  const registerPushNotifications = async () => {
    if (Platform.OS === 'web' || !user) return;

    try {
      // Check if already registered
      const existingToken = await AsyncStorage.getItem('pushToken');
      if (existingToken) {
        console.log('Push token already exists:', existingToken.substring(0, 30));
        return;
      }

      // Check device
      if (!Device.isDevice) {
        console.log('Not a physical device');
        return;
      }

      // Setup Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('substitute-requests', {
          name: 'Substitute Requests',
          importance: Notifications.AndroidImportance.MAX,
        });
      }

      // Get permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert('Notifications', 'Please enable notifications in settings to receive updates.');
        return;
      }

      // Get token
      const tokenResponse = await Notifications.getExpoPushTokenAsync({
        projectId: PROJECT_ID,
      });
      const token = tokenResponse.data;

      // Save to backend
      await updatePushToken(user.id, token);
      await AsyncStorage.setItem('pushToken', token);
      
      console.log('Push token registered successfully:', token.substring(0, 30));
    } catch (error: any) {
      console.log('Push notification error:', error.message);
    }
  };

  const fetchCounts = useCallback(async () => {
    if (!user) return;
    try {
      const [myRequests, pendingRequests] = await Promise.all([
        getTeacherRequests(user.id),
        getPendingRequests()
      ]);
      
      const myPending = myRequests.filter((r: any) => r.status === 'pending').length;
      const pendingFromOthers = pendingRequests.filter((r: any) => r.teacher_id !== user.id).length;

      // Pending card should show only the current user's pending requests.
      setPendingCount(myPending);
      setAvailableCount(pendingFromOthers);
      setMyPendingCount(myPending);
    } catch (error) {
      console.log('Error fetching counts:', error);
    }
  }, [user]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login' as any);
    }
  }, [user, isLoading]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCounts();
    setRefreshing(false);
  }, [fetchCounts]);

  if (isLoading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10B981']} />
        }
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.portalText}>Facultyfy</Text>
          <Text style={styles.welcomeText}>Welcome,</Text>
          <Text style={styles.userName}>{user.name}</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.statCardGreen]}>
            <Text style={styles.statNumber}>{pendingCount}</Text>
            <Text style={styles.statLabel}>My Pending Requests</Text>
          </View>
          <View style={[styles.statCard, styles.statCardWhite]}>
            <Text style={[styles.statNumber, styles.statNumberDark]}>{availableCount}</Text>
            <Text style={[styles.statLabel, styles.statLabelDark]}>Available to Accept</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <TouchableOpacity 
          style={styles.actionCardPrimary}
          onPress={() => router.push('/request-substitute')}
          activeOpacity={0.8}
        >
          <View style={styles.actionIconContainer}>
            <Ionicons name="add-circle" size={28} color="#FFFFFF" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Request Substitute</Text>
            <Text style={styles.actionSubtitle}>Create a new request for leave.</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => router.push('/my-requests')}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIconContainer, styles.actionIconBlue]}>
            <Ionicons name="document-text" size={24} color="#3B82F6" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>My Requests</Text>
            <Text style={styles.actionSubtitle}>Track status of submitted requests</Text>
          </View>
          {myPendingCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{myPendingCount} Pending</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => router.push('/view-requests')}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIconContainer, styles.actionIconPurple]}>
            <Ionicons name="hand-left" size={24} color="#9333EA" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Available Requests</Text>
            <Text style={styles.actionSubtitle}>Step in for colleagues</Text>
          </View>
          {availableCount > 0 && (
            <Text style={styles.countText}>{availableCount}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => router.push('/accepted-requests')}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIconContainer, styles.actionIconGreen]}>
            <Ionicons name="checkmark-done" size={24} color="#059669" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Accepted by Me</Text>
            <Text style={styles.actionSubtitle}>Classes you're substituting</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => router.push('/view-schedule')}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIconContainer, styles.actionIconTeal]}>
            <Ionicons name="calendar" size={24} color="#0D9488" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>My Schedule</Text>
            <Text style={styles.actionSubtitle}>View your class schedule</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} activeOpacity={0.7}>
          <View style={[styles.navIcon, styles.navIconActive]}>
            <Ionicons name="home" size={22} color="#FFFFFF" />
          </View>
          <Text style={[styles.navLabel, styles.navLabelActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => router.push('/my-requests')}
          activeOpacity={0.7}
        >
          <View style={styles.navIcon}>
            <Ionicons name="document-text-outline" size={22} color="#6B7280" />
          </View>
          <Text style={styles.navLabel}>Requests</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => router.push('/view-requests')}
          activeOpacity={0.7}
        >
          <View style={styles.navIcon}>
            <Ionicons name="hand-left-outline" size={22} color="#6B7280" />
          </View>
          <Text style={styles.navLabel}>Available</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => router.push('/account')}
          activeOpacity={0.7}
        >
          <View style={styles.navIcon}>
            <Ionicons name="person-outline" size={22} color="#6B7280" />
          </View>
          <Text style={styles.navLabel}>Account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    fontSize: 18,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  welcomeSection: {
    paddingTop: 24,
    paddingBottom: 20,
  },
  portalText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '300',
    color: '#1F2937',
  },
  userName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#10B981',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
  },
  statCardGreen: {
    backgroundColor: '#ECFDF5',
  },
  statCardWhite: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#10B981',
    marginBottom: 4,
  },
  statNumberDark: {
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  statLabelDark: {
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  actionCardPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionIconBlue: {
    backgroundColor: '#EFF6FF',
  },
  actionIconPurple: {
    backgroundColor: '#F3E8FF',
  },
  actionIconGreen: {
    backgroundColor: '#D1FAE5',
  },
  actionIconTeal: {
    backgroundColor: '#CCFBF1',
  },
  actionIconPlus: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  actionIconEmoji: {
    fontSize: 22,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  actionArrow: {
    fontSize: 28,
    color: '#D1D5DB',
    fontWeight: '300',
  },
  badge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  countText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B7280',
  },
  bottomPadding: {
    height: 80,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  navIconActive: {
    backgroundColor: '#10B981',
  },
  navIconText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  navIconTextActive: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  navLabelActive: {
    color: '#10B981',
  },
  actionIconText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default HomeScreen;
