import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, spacing, borderRadius, fontSize, fontWeight, getShadowStyle } from '../constants/Theme';

export default function HabitCard({ habit, onToggleCompletion, isCompleted }) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [checkAnim] = useState(new Animated.Value(isCompleted ? 1 : 0));
  const [pulseAnim] = useState(new Animated.Value(1));

  React.useEffect(() => {
    Animated.timing(checkAnim, {
      toValue: isCompleted ? 1 : 0,
      duration: 300,
      easing: Easing.out(Easing.back(1.5)),
      useNativeDriver: true,
    }).start();
  }, [isCompleted]);

  const handlePress = () => {
    // Haptic feedback
    if (isCompleted) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Button animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Success pulse animation for completion
    if (!isCompleted) {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }

    onToggleCompletion(habit.id);
  };

  return (
    <Animated.View style={[
      styles.card, 
      { 
        transform: [{ scale: scaleAnim }],
        opacity: isCompleted ? 0.8 : 1,
      }
    ]}>
      <View style={styles.habitInfo}>
        <Text style={[styles.habitName, isCompleted && styles.completedText]}>
          {habit.name}
        </Text>
        <Text style={[styles.habitDescription, isCompleted && styles.completedDescription]}>
          {habit.description}
        </Text>
      </View>
      
      <TouchableOpacity
        style={[styles.checkbox, isCompleted && styles.checkboxCompleted]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Animated.View style={{
          transform: [
            { scale: checkAnim },
            { scale: pulseAnim }
          ]
        }}>
          {isCompleted && (
            <Ionicons name="checkmark" size={20} color="white" />
          )}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    padding: spacing.md,
    marginVertical: spacing.sm,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    ...getShadowStyle(theme, 'default'),
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  habitDescription: {
    fontSize: fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: theme.colors.textTertiary,
  },
  completedDescription: {
    color: theme.colors.textTertiary,
  },
  checkbox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginLeft: spacing.md,
  },
  checkboxCompleted: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
});