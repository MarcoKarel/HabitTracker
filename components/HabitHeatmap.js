import React, { useRef, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../constants/Theme';
import { shared } from '../ui/SharedStyles';
import { FadeIn } from '../ui/animations';

export default function HabitHeatmap({ completionData, selectedHabit }) {
  // Visual config
  const MONTHS_TO_SHOW = 12; // months available in picker history (not used directly)
  const MAX_DAY_SIZE = 28; // px maximum square size (increased)
  const MIN_DAY_SIZE = 10;
  const DAY_GAP = 4; // gap between day squares
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [containerWidth, setContainerWidth] = useState(null);
  const generateHeatmapData = () => {
    // This function is no longer used — replaced by generateMonthlyData
    return [];
  };

  const getColorForCount = (count) => {
    if (!count || count === 0) return '#ebedf0';
    return '#239a3b'; // Green for completed
  };

  const generateMonthlyDataFor = (date) => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = date.getMonth();
    const monthLabelShort = date.toLocaleString('en-US', { month: 'short' });
    const monthLabel = `${monthLabelShort} ${year}`;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekday = new Date(year, month, 1).getDay();
    const weeksCount = Math.ceil((firstWeekday + daysInMonth) / 7);

    // initialize weeks array (columns)
    const weeks = Array.from({ length: weeksCount }, () => Array(7).fill(null));

    for (let d = 1; d <= daysInMonth; d++) {
      const dayIndex = firstWeekday + (d - 1);
      const weekIdx = Math.floor(dayIndex / 7);
      const originalDayOfWeek = dayIndex % 7; // 0 = Sunday
      // convert to Monday-first ordering where 0 = Monday, 6 = Sunday
      const dayOfWeek = (originalDayOfWeek + 6) % 7;

      const cur = new Date(year, month, d);
      const dateString = cur.toISOString().split('T')[0];

      const completion = completionData?.find(
        entry => (entry.habit_id || entry.habitId) === selectedHabit?.id && entry.date === dateString
      );

      weeks[weekIdx][dayOfWeek] = {
        date: dateString,
        count: completion ? 1 : 0,
        displayDate: cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      };
    }

    return {
      label: monthLabel,
      year,
      month,
      weeks,
    };
  };

  const monthData = useMemo(() => generateMonthlyDataFor(selectedDate), [completionData, selectedHabit, selectedDate]);

  const renderSelectedMonth = () => {
    if (!selectedHabit || !monthData) return null;
    const m = monthData;
    const weeks = m.weeks;

    // compute available width (fallback to 320 if unknown)
    const avail = containerWidth ? Math.max(containerWidth - 20, 320) : 320;
    const weeksCount = weeks.length || 1;

    // Responsive weekday column: proportional to available width, clamped
    const weekdayWidth = Math.min(64, Math.max(32, Math.floor(avail * 0.12)));

    // grid space left for the heatmap columns
    let gridAvail = Math.max(avail - weekdayWidth - 12, 140);
    const totalGap = (weeksCount - 1) * DAY_GAP;
    let computedDaySize = Math.floor((gridAvail - totalGap) / weeksCount);
    let daySize = Math.max(MIN_DAY_SIZE, Math.min(MAX_DAY_SIZE, computedDaySize));

    // If computed size is below minimum, try to shrink weekday column to fit
    if (daySize <= MIN_DAY_SIZE) {
      const needed = weeksCount * MIN_DAY_SIZE + totalGap + 12; // include paddings
      if (avail > needed) {
        const newWeekday = Math.max(24, avail - needed);
        gridAvail = avail - newWeekday - 12;
        computedDaySize = Math.floor((gridAvail - totalGap) / weeksCount);
        daySize = Math.max(MIN_DAY_SIZE, Math.min(MAX_DAY_SIZE, computedDaySize));
      }
    }

    return (
      <View key={`${m.year}-${m.month}`} style={[styles.monthBlock, { width: avail }]}>
        <Text style={[styles.monthLabel, { color: '#999', marginLeft: 4 }]}>{m.label}</Text>

        <View style={styles.rowWithWeekdays}>
          <View style={styles.weekdayColumnContainer}>
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((w, i) => (
              <Text key={i} style={styles.weekdayLabel}>{w}</Text>
            ))}
          </View>

          <View style={[styles.monthGrid, { width: gridAvail }] }>
            {weeks.map((week, weekIndex) => (
              <View key={weekIndex} style={[styles.weekColumn, { marginRight: DAY_GAP }]}>
                {week.map((day, dayIndex) => (
                  <View
                    key={dayIndex}
                    style={[
                      styles.day,
                      { width: daySize, height: daySize, marginBottom: 2, backgroundColor: getColorForCount(day?.count) }
                    ]}
                    title={day ? `${day.displayDate}: ${day.count} completion${day.count === 1 ? '' : 's'}` : ''}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const getCompletionStats = () => {
    if (!completionData || !selectedHabit) return { total: 0, streak: 0 };
    
    const habitCompletions = completionData.filter(c => (c.habit_id || c.habitId) === selectedHabit.id);
    const total = habitCompletions.length;
    
    // Calculate current streak
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateString = checkDate.toISOString().split('T')[0];
      
      const hasCompletion = habitCompletions.some(c => c.date === dateString);
      if (hasCompletion) {
        streak++;
      } else {
        break;
      }
    }
    
    return { total, streak };
  };

  const stats = getCompletionStats();

  const theme = useTheme();
  return (
    <FadeIn style={[styles.container, shared.card(theme)]}>
      <Text style={[styles.title, shared.title(theme)]}>
        {selectedHabit ? `${selectedHabit.name} Activity` : 'Habit Activity'}
      </Text>

      {selectedHabit && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, shared.statValue(theme)]}>{stats.total}</Text>
            <Text style={[styles.statLabel, shared.statLabel(theme)]}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, shared.statValue(theme)]}>{stats.streak}</Text>
            <Text style={[styles.statLabel, shared.statLabel(theme)]}>Streak</Text>
          </View>
        </View>
      )}

      {/* Month selector (uses system date picker) */}
      <View style={styles.pickerRow}>
        <TouchableOpacity style={styles.pickerButton} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.pickerText}>{monthData?.label || selectedDate.toLocaleString('en-US', { month: 'short', year: 'numeric' })}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) {
                // Normalize date to first of month
                const normalized = new Date(date.getFullYear(), date.getMonth(), 1);
                setSelectedDate(normalized);
              }
            }}
            maximumDate={new Date()}
          />
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View
          style={styles.heatmapContainer}
          onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
          <View style={styles.monthsRow}>
            {renderSelectedMonth()}
          </View>

          {/* weekday labels rendered inline inside the month block; removed duplicate column */}
        </View>
      </ScrollView>

      <View style={styles.legend}>
        <Text style={styles.legendText}>Less</Text>
        <View style={styles.legendSquares}>
          <View style={[styles.legendSquare, { backgroundColor: theme.colors.surface }]} />
          <View style={[styles.legendSquare, { backgroundColor: theme.colors.tertiary || '#c6e48b' }]} />
          <View style={[styles.legendSquare, { backgroundColor: theme.colors.success || '#7bc96f' }]} />
          <View style={[styles.legendSquare, { backgroundColor: theme.colors.primary || '#239a3b' }]} />
          <View style={[styles.legendSquare, { backgroundColor: theme.colors.primaryDark || '#196127' }]} />
        </View>
        <Text style={styles.legendText}>More</Text>
      </View>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    marginHorizontal: 20,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#239a3b',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  heatmapContainer: {
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  monthLabels: {
    flexDirection: 'row',
    marginBottom: 5,
    paddingLeft: 20,
  },
  monthsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: 6,
  },
  monthBlock: {
    marginRight: 8,
    alignItems: 'flex-start',
  },
  monthLabel: {
    fontSize: 12,
    color: '#ddd',
    marginBottom: 6,
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  pickerRow: {
    marginHorizontal: 6,
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  picker: {
    height: 44,
    color: '#fff',
  },
  pickerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  pickerText: {
    color: '#fff',
    fontSize: 14,
  },
  monthGrid: {
    flexDirection: 'row',
  },
  weekColumn: {
    flexDirection: 'column',
    marginRight: 2,
  },
  heatmap: {
    flexDirection: 'row',
  },
  week: {
    flexDirection: 'column',
    marginRight: 1,
  },
  day: {
    width: 12,
    height: 12,
    marginBottom: 1,
    borderRadius: 2,
  },
  weekdayLabels: {
    flexDirection: 'column',
    marginTop: 5,
    paddingRight: 5,
    // removed absolute positioning: weekday labels are rendered inline now
  },
  weekdayLabel: {
    fontSize: 12,
    color: '#999',
    height: 22,
    textAlign: 'left',
    marginBottom: 6,
  },
  rowWithWeekdays: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  weekdayColumnContainer: {
    width: 80,
    alignItems: 'flex-start',
    paddingTop: 6,
    paddingRight: 8,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
    marginHorizontal: 8,
  },
  legendSquares: {
    flexDirection: 'row',
  },
  legendSquare: {
    width: 12,
    height: 12,
    marginHorizontal: 1,
    borderRadius: 2,
  },
});