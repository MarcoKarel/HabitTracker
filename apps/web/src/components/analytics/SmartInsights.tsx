import { useMemo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import type { HabitWithCompletions } from '@habit-tracker/shared';

interface SmartInsightsProps {
  habits: HabitWithCompletions[];
}

interface Insight {
  id: string;
  type: 'success' | 'warning' | 'info' | 'celebration';
  title: string;
  description: string;
  action?: string;
  icon: string;
  priority: number;
}

interface HeatmapData {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

const Container = styled(motion.div)`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin: 24px 0;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const InsightsPanel = styled(motion.div)`
  background: white;
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
`;

const HeatmapPanel = styled(motion.div)`
  background: white;
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
`;

const CalendarPanel = styled(motion.div)`
  background: white;
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  grid-column: 1 / -1;
  margin-top: 24px;
`;

const PanelTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  color: #333;
  margin: 0 0 24px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const InsightCard = styled(motion.div)<{ $type: 'success' | 'warning' | 'info' | 'celebration' }>`
  background: ${props => {
    switch (props.$type) {
      case 'success': return 'linear-gradient(135deg, #22c55e, #16a34a)';
      case 'warning': return 'linear-gradient(135deg, #f59e0b, #d97706)';
      case 'info': return 'linear-gradient(135deg, #3b82f6, #2563eb)';
      case 'celebration': return 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
      default: return 'linear-gradient(135deg, #667eea, #764ba2)';
    }
  }};
  border-radius: 16px;
  padding: 20px;
  color: white;
  margin-bottom: 16px;
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }
`;

const InsightHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const InsightIcon = styled.span`
  font-size: 24px;
`;

const InsightPriority = styled.div<{ $priority: number }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.$priority > 7 ? '#ef4444' : props.$priority > 4 ? '#f59e0b' : '#22c55e'};
`;

const InsightTitle = styled.h4`
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
`;

const InsightDescription = styled.p`
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
  opacity: 0.9;
`;

const InsightAction = styled.div`
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 13px;
  font-weight: 500;
  opacity: 0.8;
`;

const HeatmapContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(53, 1fr);
  gap: 3px;
  margin-top: 16px;
`;

const HeatmapCell = styled.div<{ $level: number }>`
  width: 12px;
  height: 12px;
  border-radius: 2px;
  background: ${props => {
    const colors = ['#ebedf0', '#c6e48b', '#7bc96f', '#239a3b', '#196127'];
    return colors[props.$level] || colors[0];
  }};
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.2);
  }
`;

const HeatmapLegend = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  font-size: 12px;
  color: #666;
`;

const HeatmapScale = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`;

const CalendarContainer = styled.div`
  height: 600px;
  
  .rbc-calendar {
    font-family: inherit;
  }
  
  .rbc-header {
    background: #f8f9fa;
    font-weight: 600;
    color: #333;
    border-bottom: 1px solid #e9ecef;
  }
  
  .rbc-month-view {
    border: 1px solid #e9ecef;
    border-radius: 12px;
    overflow: hidden;
  }
  
  .rbc-date-cell {
    text-align: center;
    padding: 8px;
  }
  
  .rbc-today {
    background-color: #667eea20;
  }
  
  .rbc-event {
    background: #667eea;
    border: none;
    border-radius: 4px;
    padding: 2px 4px;
    font-size: 11px;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
`;

const StatItem = styled.div`
  text-align: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 12px;
`;

const StatValue = styled.div`
  font-size: 24px;
  font-weight: 800;
  color: #333;
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 12px;
  color: #666;
  font-weight: 500;
`;

export function SmartInsights({ habits }: SmartInsightsProps) {
  const insights = useMemo((): Insight[] => {
    const insights: Insight[] = [];
    
    // Calculate various metrics
    const totalHabits = habits.length;
    const completedToday = habits.filter(h => h.is_completed_today).length;
    const completionRate = totalHabits > 0 ? (completedToday / totalHabits) * 100 : 0;
    const avgStreak = totalHabits > 0 ? habits.reduce((sum, h) => sum + (h.current_streak || 0), 0) / totalHabits : 0;
    const strugglingHabits = habits.filter(h => (h.current_streak || 0) === 0);

    // Perfect day achievement
    if (completionRate === 100 && totalHabits > 0) {
      insights.push({
        id: 'perfect-day',
        type: 'celebration',
        title: 'Perfect Day! 🎉',
        description: `You've completed all ${totalHabits} habits today! This is what consistency looks like.`,
        action: 'Keep this momentum going tomorrow!',
        icon: '🏆',
        priority: 10
      });
    }

    // High completion rate
    if (completionRate >= 80 && completionRate < 100 && totalHabits > 0) {
      insights.push({
        id: 'high-completion',
        type: 'success',
        title: 'Great Progress! 💪',
        description: `${completionRate.toFixed(0)}% completion rate today. You're building strong momentum.`,
        action: 'Just a few more habits to complete the day perfectly!',
        icon: '📈',
        priority: 8
      });
    }

    // Milestone achievements
    habits.forEach(habit => {
      const streak = habit.current_streak || 0;
      if ([7, 14, 21, 30, 60, 90, 100].includes(streak)) {
        insights.push({
          id: `milestone-${habit.id}`,
          type: 'celebration',
          title: `${streak}-Day Milestone! 🔥`,
          description: `"${habit.title}" has reached ${streak} consecutive days. Incredible dedication!`,
          action: 'Celebrate this achievement and keep the streak alive!',
          icon: '🎯',
          priority: 9
        });
      }
    });

    // Struggling habits warning
    if (strugglingHabits.length > 0) {
      insights.push({
        id: 'struggling-habits',
        type: 'warning',
        title: 'Habits Need Attention ⚠️',
        description: `${strugglingHabits.length} habit${strugglingHabits.length > 1 ? 's' : ''} haven't been completed recently.`,
        action: `Focus on: ${strugglingHabits.slice(0, 2).map(h => h.title).join(', ')}`,
        icon: '🎯',
        priority: 7
      });
    }

    // Best performing habit
    const bestHabit = habits.reduce((max, h) => 
      (h.current_streak || 0) > (max.current_streak || 0) ? h : max, 
      habits[0]
    );
    
    if (bestHabit && (bestHabit.current_streak || 0) > 3) {
      insights.push({
        id: 'best-habit',
        type: 'success',
        title: 'Streak Champion! 👑',
        description: `"${bestHabit.title}" is your strongest habit with ${bestHabit.current_streak} days.`,
        action: 'Use this habit as a model for building others!',
        icon: '🌟',
        priority: 6
      });
    }

    // Consistency insight
    if (avgStreak > 10) {
      insights.push({
        id: 'consistency',
        type: 'info',
        title: 'Consistency Master! 📊',
        description: `Your average streak is ${avgStreak.toFixed(1)} days. You're building lasting change.`,
        action: 'Keep focusing on small, daily improvements!',
        icon: '⚡',
        priority: 5
      });
    }

    // Weekly momentum
    const weeklyCompletion = Math.random() * 100; // Mock data - would calculate from actual data
    if (weeklyCompletion > 85) {
      insights.push({
        id: 'weekly-momentum',
        type: 'success',
        title: 'Weekly Winner! 🏅',
        description: `${weeklyCompletion.toFixed(0)}% completion rate this week. You're on fire!`,
        action: 'Finish the week strong!',
        icon: '🔥',
        priority: 7
      });
    }

    return insights.sort((a, b) => b.priority - a.priority).slice(0, 5);
  }, [habits]);

  const heatmapData = useMemo((): HeatmapData[] => {
    // Generate last 365 days
    const data: HeatmapData[] = [];
    const today = new Date();
    
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Mock completion data - in real app, this would come from actual completions
      const completions = Math.floor(Math.random() * habits.length);
      const level = habits.length === 0 ? 0 : Math.min(4, Math.floor((completions / habits.length) * 5)) as 0 | 1 | 2 | 3 | 4;
      
      data.push({
        date: date.toISOString().split('T')[0],
        count: completions,
        level
      });
    }
    
    return data;
  }, [habits]);

  const calendarEvents = useMemo(() => {
    // Create events for streaks and milestones
    const events: any[] = [];
    
    habits.forEach(habit => {
      const streak = habit.current_streak || 0;
      if (streak >= 7) {
        const today = new Date();
        events.push({
          id: `streak-${habit.id}`,
          title: `🔥 ${habit.title} (${streak} days)`,
          start: today,
          end: today,
          resource: habit
        });
      }
    });
    
    return events;
  }, [habits]);

  const stats = useMemo(() => {
    const totalCompletions = habits.reduce((sum, h) => sum + (h.current_streak || 0), 0);
    const activeStreak = habits.filter(h => (h.current_streak || 0) > 0).length;
    const weeklyAvg = Math.random() * 100; // Mock - would calculate from real data
    const monthlyGrowth = Math.random() * 50; // Mock - would calculate from real data
    
    return {
      totalCompletions,
      activeStreak,
      weeklyAvg: weeklyAvg.toFixed(1),
      monthlyGrowth: monthlyGrowth.toFixed(1)
    };
  }, [habits]);

  return (
    <>
      <Container>
        <InsightsPanel
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <PanelTitle>
            🧠 Smart Insights
          </PanelTitle>
          
          <StatsGrid>
            <StatItem>
              <StatValue>{stats.totalCompletions}</StatValue>
              <StatLabel>Total Completions</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>{stats.activeStreak}</StatValue>
              <StatLabel>Active Streaks</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>{stats.weeklyAvg}%</StatValue>
              <StatLabel>Weekly Average</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>+{stats.monthlyGrowth}%</StatValue>
              <StatLabel>Monthly Growth</StatLabel>
            </StatItem>
          </StatsGrid>

          {insights.map((insight, index) => (
            <InsightCard
              key={insight.id}
              $type={insight.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <InsightHeader>
                <InsightIcon>{insight.icon}</InsightIcon>
                <InsightPriority $priority={insight.priority} />
              </InsightHeader>
              <InsightTitle>{insight.title}</InsightTitle>
              <InsightDescription>{insight.description}</InsightDescription>
              {insight.action && (
                <InsightAction>💡 {insight.action}</InsightAction>
              )}
            </InsightCard>
          ))}
        </InsightsPanel>

        <HeatmapPanel
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <PanelTitle>
            📅 Activity Heatmap
          </PanelTitle>
          
          <HeatmapContainer>
            {heatmapData.map((day) => (
              <HeatmapCell
                key={day.date}
                $level={day.level}
                title={`${day.date}: ${day.count} completions`}
              />
            ))}
          </HeatmapContainer>
          
          <HeatmapLegend>
            <span>Less</span>
            <HeatmapScale>
              {[0, 1, 2, 3, 4].map(level => (
                <HeatmapCell key={level} $level={level} />
              ))}
            </HeatmapScale>
            <span>More</span>
          </HeatmapLegend>
        </HeatmapPanel>
      </Container>

      <CalendarPanel
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <PanelTitle>
          🗓️ Habit Calendar
        </PanelTitle>
        
        <CalendarContainer>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)', 
            gap: '8px',
            textAlign: 'center'
          }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} style={{ fontWeight: 600, padding: '8px', background: '#f8f9fa', borderRadius: '4px' }}>
                {day}
              </div>
            ))}
            {calendarEvents.map((event) => (
              <div
                key={event.id}
                style={{
                  padding: '12px',
                  background: event.resource?.color || '#667eea',
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 500
                }}
              >
                {event.title}
              </div>
            ))}
          </div>
        </CalendarContainer>
      </CalendarPanel>
    </>
  );
}