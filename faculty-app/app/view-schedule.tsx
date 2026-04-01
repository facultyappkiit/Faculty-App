import { useEffect, useState, useCallback } from 'react';
import {
  Text,
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getClassSchedule, ClassScheduleItem } from '../services/api';
import { useAuth } from '../context/AuthContext';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const ViewScheduleScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<ClassScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedule = async () => {
    if (!user) return;
    
    try {
      setError(null);
      const data = await getClassSchedule(user.id);
      setSchedule(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch schedule';
      setError(message);
      console.error('Error fetching schedule:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSchedule();
  }, []);

  const formatTime = (timeStr: string) => {
    try {
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours);
      const minute = minutes;
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minute} ${period}`;
    } catch {
      return timeStr;
    }
  };

  const groupScheduleByDay = () => {
    const grouped: { [key: number]: ClassScheduleItem[] } = {};
    schedule.forEach(item => {
      if (!grouped[item.day_of_week]) {
        grouped[item.day_of_week] = [];
      }
      grouped[item.day_of_week].push(item);
    });
    return grouped;
  };

  const renderScheduleItem = ({ item }: { item: ClassScheduleItem }) => (
    <View style={styles.scheduleCard}>
      <View style={[styles.scheduleDayHeader, item.substitute_request_id ? styles.headerSubstitute : {}]}>
        <View style={styles.headerContent}>
          <Text style={styles.dayText}>{DAY_NAMES[item.day_of_week]}</Text>
          {item.substitute_request_id && (
            <View style={styles.substituteTag}>
              <Ionicons name="swap-horizontal" size={12} color="#FFFFFF" />
              <Text style={styles.substituteTagText}>Substitute</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.scheduleContent}>
        <View style={styles.timeContainer}>
          <Ionicons name="time-outline" size={18} color="#6B7280" />
          <Text style={styles.timeText}>
            {formatTime(item.start_time)} - {formatTime(item.end_time)}
          </Text>
        </View>
        
        {item.subject && (
          <View style={styles.subjectContainer}>
            <Ionicons name="book-outline" size={18} color="#6B7280" />
            <Text style={styles.subjectText}>{item.subject}</Text>
          </View>
        )}

        {item.classroom && (
          <View style={[styles.subjectContainer, { marginTop: 4 }]}>
            <Ionicons name="business-outline" size={18} color="#6B7280" />
            <Text style={styles.subjectText}>{item.classroom}</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1E3A5F" />
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Class Schedule</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#0F766E" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A5F" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Class Schedule</Text>
        <View style={styles.placeholder} />
      </View>

      {error && !schedule.length ? (
        <View style={styles.centerContent}>
          <Ionicons name="warning-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchSchedule}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : schedule.length === 0 ? (
        <View style={styles.centerContent}>
          <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>No schedule uploaded yet</Text>
          <Text style={styles.emptySubText}>Upload your class schedule from the account page</Text>
        </View>
      ) : (
        <FlatList
          data={schedule}
          renderItem={renderScheduleItem}
          keyExtractor={(item) => `${item.id}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#0F766E']}
              tintColor="#0F766E"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1E3A5F',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  scheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  scheduleDayHeader: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerSubstitute: {
    backgroundColor: '#7C3AED',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  substituteTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  substituteTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  scheduleContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  subjectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subjectText: {
    marginLeft: 10,
    fontSize: 13,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#0F766E',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
});

export default ViewScheduleScreen;
