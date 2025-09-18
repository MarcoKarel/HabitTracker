import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import type { Habit } from '@habit-tracker/shared';

const { width } = Dimensions.get('window');

interface MobileHabitFormProps {
  visible: boolean;
  onClose: () => void;
  onSave: (habit: Omit<Habit, 'id' | 'user_id' | 'created_at'>) => void;
  habit?: Habit;
}

export function MobileHabitForm({ visible, onClose, onSave, habit }: MobileHabitFormProps) {
  const [title, setTitle] = useState(habit?.title || '');
  const [description, setDescription] = useState(habit?.description || '');
  const [frequency, setFrequency] = useState(habit?.frequency || 127); // All days
  const [color, setColor] = useState(habit?.color || '#6366f1');
  const [icon, setIcon] = useState(habit?.icon || '📝');

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a habit title');
      return;
    }

    const habitData = {
      title: title.trim(),
      description: description.trim(),
      frequency,
      start_date: new Date().toISOString(),
      color,
      icon,
      is_active: true,
    };

    onSave(habitData);
    handleClose();
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setFrequency(127);
    setColor('#6366f1');
    setIcon('📝');
    onClose();
  };

  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
    '#f97316', '#eab308', '#22c55e', '#06b6d4',
    '#3b82f6', '#6b7280'
  ];

  const icons = [
    '📝', '💪', '📚', '🏃', '🧘', '💧', '🍎', '🎯', 
    '⭐', '🔥', '🎨', '🎵', '💼', '🏠', '🌱', '❤️'
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.button}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {habit ? 'Edit Habit' : 'New Habit'}
          </Text>
          <TouchableOpacity onPress={handleSave} style={styles.button}>
            <Text style={[styles.buttonText, styles.saveButton]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter habit title"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Optional description"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Appearance</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Color</Text>
              <View style={styles.colorGrid}>
                {colors.map((colorOption) => (
                  <TouchableOpacity
                    key={colorOption}
                    style={[
                      styles.colorOption,
                      { backgroundColor: colorOption },
                      color === colorOption && styles.selectedColor
                    ]}
                    onPress={() => setColor(colorOption)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Icon</Text>
              <View style={styles.iconGrid}>
                {icons.map((iconOption) => (
                  <TouchableOpacity
                    key={iconOption}
                    style={[
                      styles.iconOption,
                      icon === iconOption && styles.selectedIcon
                    ]}
                    onPress={() => setIcon(iconOption)}
                  >
                    <Text style={styles.iconText}>{iconOption}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Frequency</Text>
            <Text style={styles.helperText}>
              Currently set to daily (this can be customized in a future update)
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  buttonText: {
    fontSize: 16,
    color: '#6366f1',
  },
  saveButton: {
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#1f2937',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIcon: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  iconText: {
    fontSize: 20,
  },
  helperText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
});