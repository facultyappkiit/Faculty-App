import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createRequest, getRequest, SubstituteRequestType, updateRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';

const REQUEST_TYPES: Array<{
  value: SubstituteRequestType;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    value: 'class',
    title: 'Class Substitute',
    subtitle: 'Subject, room, date and time',
    icon: 'book-outline',
  },
  {
    value: 'exam',
    title: 'Exam Substitute',
    subtitle: 'Campus, date and time',
    icon: 'document-text-outline',
  },
];

const CAMPUS_OPTIONS = ['Campus 25A', 'Campus 25B', 'Campus 25C', 'Campus 14', 'Campus 15A', 'Campus 15B'];

const RequestSubstituteScreen = () => {
  const router = useRouter();
  const { requestId } = useLocalSearchParams<{ requestId?: string }>();
  const { user } = useAuth();

  const parsedRequestId = requestId ? Number(requestId) : null;
  const isEditing = Boolean(parsedRequestId);

  const [requestType, setRequestType] = useState<SubstituteRequestType>('class');
  const [subject, setSubject] = useState('');
  const [roomNo, setRoomNo] = useState('');
  const [campus, setCampus] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEditing);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showCampusDropdown, setShowCampusDropdown] = useState(false);

  useEffect(() => {
    const loadRequest = async () => {
      if (!parsedRequestId || !user) {
        setIsFetching(false);
        return;
      }

      try {
        const existingRequest = await getRequest(parsedRequestId);

        if (existingRequest.teacher_id !== user.id) {
          Alert.alert('Error', 'You can only edit your own request.');
          router.back();
          return;
        }

        setRequestType(existingRequest.request_type || 'class');
        setSubject(existingRequest.subject || '');
        if ((existingRequest.request_type || 'class') === 'class') {
          const parsedClassroom = parseClassroomDetails(existingRequest.classroom || '');
          setCampus(parsedClassroom.campus);
          setRoomNo(parsedClassroom.roomNo);
        } else {
          setCampus(existingRequest.campus || '');
          setRoomNo('');
        }
        setDate(new Date(existingRequest.date));
        setTime(parseTimeString(existingRequest.time));
        setNotes(existingRequest.notes || '');
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to load request details');
        router.back();
      } finally {
        setIsFetching(false);
      }
    };

    loadRequest();
  }, [parsedRequestId, router, user]);

  const formatDate = (value: Date) => {
    return value.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (value: Date) => {
    return value.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleTypeChange = (nextType: SubstituteRequestType) => {
    setRequestType(nextType);
    setShowCampusDropdown(false);

    if (nextType === 'class') {
      setRoomNo('');
    } else {
      setSubject('');
      setRoomNo('');
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'Please login again');
      return;
    }

    if (requestType === 'class' && (!subject.trim() || !campus.trim() || !roomNo.trim())) {
      Alert.alert('Error', 'Please fill in subject, campus, and room number');
      return;
    }

    if (requestType === 'exam' && !campus.trim()) {
      Alert.alert('Error', 'Please enter the exam campus');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        request_type: requestType,
        subject: requestType === 'class' ? subject.trim() : undefined,
        date: date.toISOString().split('T')[0],
        time: formatTime(time),
        duration: 60,
        classroom: requestType === 'class' ? `${campus.trim()} - ${roomNo.trim()}` : undefined,
        campus: requestType === 'exam' ? campus.trim() : undefined,
        notes: notes.trim() || undefined,
      };

      if (isEditing && parsedRequestId) {
        await updateRequest(parsedRequestId, user.id, payload);
      } else {
        await createRequest({
          teacher_id: user.id,
          ...payload,
        });
      }

      Alert.alert(
        'Success',
        isEditing ? 'Your substitute request has been updated.' : 'Your substitute request has been submitted.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save request');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#10B981" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Update Request' : 'Request Substitute'}</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.divider} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionTitle}>REQUEST TYPE</Text>
          <View style={styles.typeCardGrid}>
            {REQUEST_TYPES.map((option) => {
              const active = requestType === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.typeCard, active && styles.typeCardActive]}
                  onPress={() => handleTypeChange(option.value)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={option.icon}
                    size={22}
                    color={active ? '#10B981' : '#6B7280'}
                  />
                  <Text style={[styles.typeTitle, active && styles.typeTitleActive]}>{option.title}</Text>
                  <Text style={styles.typeSubtitle}>{option.subtitle}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.sectionDivider} />

          <Text style={styles.sectionTitle}>{requestType === 'class' ? 'CLASS DETAILS' : 'EXAM DETAILS'}</Text>

          {requestType === 'class' ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Subject Name</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="book-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., CS-101 Data Structures"
                    placeholderTextColor="#9CA3AF"
                    value={subject}
                    onChangeText={setSubject}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Campus and Room No</Text>

                <TouchableOpacity
                  style={styles.inputContainer}
                  onPress={() => setShowCampusDropdown((prev) => !prev)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="business-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <Text style={[styles.dropdownText, !campus && styles.dropdownPlaceholder]}>
                    {campus || 'Select campus'}
                  </Text>
                  <Ionicons
                    name={showCampusDropdown ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>

                {showCampusDropdown && (
                  <View style={styles.dropdownMenu}>
                    {CAMPUS_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={styles.dropdownOption}
                        onPress={() => {
                          setCampus(option);
                          setShowCampusDropdown(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.dropdownOptionText}>{option}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <View style={[styles.inputContainer, styles.roomInputContainer]}>
                  <Ionicons name="location-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Room no (e.g., C-105)"
                    placeholderTextColor="#9CA3AF"
                    value={roomNo}
                    onChangeText={setRoomNo}
                  />
                </View>
              </View>
            </>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Campus</Text>

              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => setShowCampusDropdown((prev) => !prev)}
                activeOpacity={0.8}
              >
                <Ionicons name="business-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <Text style={[styles.dropdownText, !campus && styles.dropdownPlaceholder]}>
                  {campus || 'Select campus'}
                </Text>
                <Ionicons
                  name={showCampusDropdown ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#9CA3AF"
                />
              </TouchableOpacity>

              {showCampusDropdown && (
                <View style={styles.dropdownMenu}>
                  {CAMPUS_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={styles.dropdownOption}
                      onPress={() => {
                        setCampus(option);
                        setShowCampusDropdown(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.dropdownOptionText}>{option}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={styles.sectionDivider} />

          <Text style={styles.sectionTitle}>SCHEDULE</Text>

          <View style={styles.dateTimeRow}>
            <View style={styles.dateTimeField}>
              <Text style={styles.label}>Date</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={18} color="#6B7280" style={styles.inlineIcon} />
                <Text style={styles.dateTimeText}>{formatDate(date)}</Text>
                <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.dateTimeField}>
              <Text style={styles.label}>Time</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowTimePicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="time-outline" size={18} color="#6B7280" style={styles.inlineIcon} />
                <Text style={styles.dateTimeText}>{formatTime(time)}</Text>
                <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={(_, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setDate(selectedDate);
              }}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={time}
              mode="time"
              display="default"
              onChange={(_, selectedTime) => {
                setShowTimePicker(false);
                if (selectedTime) setTime(selectedTime);
              }}
            />
          )}

          <View style={styles.sectionDivider} />

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>ADDITIONAL INFO</Text>
            <Text style={styles.optionalText}>Optional</Text>
          </View>

          <View style={styles.textAreaContainer}>
            <TextInput
              style={styles.textArea}
              placeholder={
                requestType === 'class'
                  ? 'Any special instructions for the substitute...'
                  : 'Any exam-related instructions to share...'
              }
              placeholderTextColor="#9CA3AF"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Saving...' : isEditing ? 'Update Request' : 'Submit Request'}
            </Text>
            {!isLoading && <Text style={styles.arrowIcon}>→</Text>}
          </TouchableOpacity>

          <Text style={styles.disclaimer}>By submitting, you agree to the faculty guidelines.</Text>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const parseTimeString = (timeValue: string) => {
  const result = new Date();
  const timeParts = timeValue.match(/(\d+):(\d+)\s*(AM|PM)/i);

  if (!timeParts) {
    return result;
  }

  let hours = parseInt(timeParts[1], 10);
  const minutes = parseInt(timeParts[2], 10);
  const meridian = timeParts[3].toUpperCase();

  if (meridian === 'PM' && hours !== 12) {
    hours += 12;
  }

  if (meridian === 'AM' && hours === 12) {
    hours = 0;
  }

  result.setHours(hours, minutes, 0, 0);
  return result;
};

const parseClassroomDetails = (classroomValue: string) => {
  if (!classroomValue) {
    return { campus: '', roomNo: '' };
  }

  const parts = classroomValue.split(' - ');
  if (parts.length >= 2) {
    return { campus: parts[0], roomNo: parts.slice(1).join(' - ') };
  }

  return { campus: '', roomNo: classroomValue };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 20,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 1,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionalText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  typeCardGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  typeCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  typeCardActive: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  typeTitle: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  typeTitleActive: {
    color: '#065F46',
  },
  typeSubtitle: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    height: 54,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  dropdownText: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  dropdownPlaceholder: {
    color: '#9CA3AF',
  },
  dropdownMenu: {
    marginTop: 8,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  dropdownOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownOptionText: {
    fontSize: 15,
    color: '#1F2937',
  },
  roomInputContainer: {
    marginTop: 10,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 24,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 16,
  },
  dateTimeField: {
    flex: 1,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    height: 54,
  },
  inlineIcon: {
    marginRight: 8,
  },
  dateTimeText: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
  },
  textAreaContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    minHeight: 120,
  },
  textArea: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 22,
  },
  submitButton: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 8,
  },
  arrowIcon: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  disclaimer: {
    marginTop: 16,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    color: '#6B7280',
  },
  bottomPadding: {
    height: 32,
  },
});

export default RequestSubstituteScreen;
