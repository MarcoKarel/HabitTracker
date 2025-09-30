import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function HabitHeatmap({ completionData, selectedHabit }) {
  const generateHeatmapData = () => {
    const data = [];
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    // Generate 365 days of data
    for (let i = 0; i < 365; i++) {
      const date = new Date(oneYearAgo);
      date.setDate(oneYearAgo.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      
      const completion = completionData?.find(
        entry => entry.habitId === selectedHabit?.id && entry.date === dateString
      );
      
      data.push({
        date: dateString,
        count: completion ? 1 : 0,
        displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });
    }
    
    return data;
  };

  const getColorForCount = (count) => {
    if (count === 0) return '#ebedf0';
    return '#239a3b'; // Green for completed
  };

  const renderWeeks = () => {
    const data = generateHeatmapData();
    const weeks = [];
    
    // Group data into weeks (7 days each)
    for (let i = 0; i < data.length; i += 7) {
      weeks.push(data.slice(i, i + 7));
    }

    return weeks.map((week, weekIndex) => (
      <View key={weekIndex} style={styles.week}>
        {week.map((day, dayIndex) => (
          <View
            key={dayIndex}
            style={[
              styles.day,
              { backgroundColor: getColorForCount(day.count) }
            ]}
            title={`${day.displayDate}: ${day.count} completion${day.count === 1 ? '' : 's'}`}
          />
        ))}
      </View>
    ));
  };

  const getCompletionStats = () => {
    if (!completionData || !selectedHabit) return { total: 0, streak: 0 };
    
    const habitCompletions = completionData.filter(c => c.habitId === selectedHabit.id);
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {selectedHabit ? `${selectedHabit.name} Activity` : 'Habit Activity'}
      </Text>
      
      {selectedHabit && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.streak}</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.heatmapContainer}>
          <View style={styles.monthLabels}>
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => (
              <Text key={index} style={styles.monthLabel}>{month}</Text>
            ))}
          </View>
          
          <View style={styles.heatmap}>
            {renderWeeks()}
          </View>
          
          <View style={styles.weekdayLabels}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <Text key={index} style={styles.weekdayLabel}>{day}</Text>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.legend}>
        <Text style={styles.legendText}>Less</Text>
        <View style={styles.legendSquares}>
          <View style={[styles.legendSquare, { backgroundColor: '#ebedf0' }]} />
          <View style={[styles.legendSquare, { backgroundColor: '#c6e48b' }]} />
          <View style={[styles.legendSquare, { backgroundColor: '#7bc96f' }]} />
          <View style={[styles.legendSquare, { backgroundColor: '#239a3b' }]} />
          <View style={[styles.legendSquare, { backgroundColor: '#196127' }]} />
        </View>
        <Text style={styles.legendText}>More</Text>
      </View>
    </View>
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
  monthLabel: {
    fontSize: 10,
    color: '#666',
    width: 60,
    textAlign: 'left',
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
    position: 'absolute',
    left: 0,
    top: 25,
  },
  weekdayLabel: {
    fontSize: 9,
    color: '#666',
    height: 13,
    textAlign: 'center',
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