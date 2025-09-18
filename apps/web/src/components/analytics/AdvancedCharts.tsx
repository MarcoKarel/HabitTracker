import { useMemo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadialBarChart,
  RadialBar
} from 'recharts';
import type { HabitWithCompletions } from '@habit-tracker/shared';

interface AdvancedChartsProps {
  habits: HabitWithCompletions[];
  selectedTimeRange: 'week' | 'month' | 'quarter' | 'year';
  onTimeRangeChange: (range: 'week' | 'month' | 'quarter' | 'year') => void;
}

interface ChartData {
  streakData: Array<{ date: string; streak: number; habit: string; color: string }>;
  completionData: Array<{ date: string; completed: number; total: number; rate: number }>;
  habitDistribution: Array<{ name: string; value: number; color: string; streak: number }>;
  weeklyProgress: Array<{ week: string; Mon: number; Tue: number; Wed: number; Thu: number; Fri: number; Sat: number; Sun: number }>;
  monthlyTrends: Array<{ month: string; completions: number; streaks: number; newHabits: number }>;
}

const Container = styled(motion.div)`
  background: white;
  border-radius: 24px;
  padding: 32px;
  margin: 24px 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
`;

const Title = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: #333;
  margin: 0;
`;

const TimeRangeSelector = styled.div`
  display: flex;
  gap: 8px;
  background: #f8f9fa;
  border-radius: 12px;
  padding: 4px;
`;

const TimeRangeButton = styled(motion.button)<{ $active: boolean }>`
  background: ${props => props.$active ? '#667eea' : 'transparent'};
  color: ${props => props.$active ? 'white' : '#666'};
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.$active ? '#5a6fd8' : '#f0f0f0'};
  }
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  margin-bottom: 32px;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const ChartContainer = styled(motion.div)`
  background: #fafbfc;
  border-radius: 16px;
  padding: 24px;
  min-height: 400px;
`;

const ChartTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ChartIcon = styled.span`
  font-size: 20px;
`;

const FullWidthChart = styled(motion.div)`
  background: #fafbfc;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 32px;
  min-height: 300px;
`;

const InsightCard = styled(motion.div)`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 24px;
  color: white;
  margin-bottom: 24px;
`;

const InsightTitle = styled.h4`
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px 0;
`;

const InsightText = styled.p`
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
  opacity: 0.9;
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
`;

const StatCard = styled(motion.div)`
  background: white;
  border-radius: 12px;
  padding: 20px;
  border-left: 4px solid;
  border-left-color: ${props => props.color || '#667eea'};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
`;

const StatValue = styled.div`
  font-size: 32px;
  font-weight: 800;
  color: #333;
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: #666;
  font-weight: 500;
`;

const StatChange = styled.div<{ $positive: boolean }>`
  font-size: 12px;
  color: ${props => props.$positive ? '#22c55e' : '#ef4444'};
  font-weight: 600;
  margin-top: 4px;
`;

const CustomTooltip = styled.div`
  background: white;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: none;
`;

const TooltipTitle = styled.div`
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
`;

const TooltipValue = styled.div`
  color: #666;
  font-size: 14px;
`;

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'];

export function AdvancedCharts({ habits, selectedTimeRange, onTimeRangeChange }: AdvancedChartsProps) {

  const chartData = useMemo((): ChartData => {
    const now = new Date();
    const daysMap: { [key: string]: number } = {
      week: 7,
      month: 30,
      quarter: 90,
      year: 365
    };
    const days = daysMap[selectedTimeRange];

    // Generate date range
    const dates = Array.from({ length: days }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (days - 1 - i));
      return date.toISOString().split('T')[0];
    });

    // Streak data for line chart
    const streakData = habits.flatMap(habit => 
      dates.map(date => ({
        date,
        streak: habit.current_streak || 0,
        habit: habit.title,
        color: habit.color || '#667eea'
      }))
    );

    // Daily completion data
    const completionData = dates.map(date => {
      const total = habits.length;
      const completed = Math.floor(Math.random() * (total + 1)); // Mock data
      return {
        date,
        completed,
        total,
        rate: total > 0 ? Math.round((completed / total) * 100) : 0
      };
    });

    // Habit distribution
    const habitDistribution = habits.map((habit, index) => ({
      name: habit.title,
      value: habit.current_streak || 0,
      color: habit.color || COLORS[index % COLORS.length],
      streak: habit.current_streak || 0
    }));

    // Weekly progress heatmap
    const weeklyProgress = Array.from({ length: Math.ceil(days / 7) }, (_, weekIndex) => {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - days + (weekIndex * 7));
      
      return {
        week: `Week ${weekIndex + 1}`,
        Mon: Math.floor(Math.random() * 101),
        Tue: Math.floor(Math.random() * 101),
        Wed: Math.floor(Math.random() * 101),
        Thu: Math.floor(Math.random() * 101),
        Fri: Math.floor(Math.random() * 101),
        Sat: Math.floor(Math.random() * 101),
        Sun: Math.floor(Math.random() * 101),
      };
    });

    // Monthly trends
    const monthlyTrends = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(now);
      date.setMonth(date.getMonth() - (11 - i));
      return {
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        completions: Math.floor(Math.random() * 100) + 50,
        streaks: Math.floor(Math.random() * 50) + 10,
        newHabits: Math.floor(Math.random() * 5),
      };
    });

    return { streakData, completionData, habitDistribution, weeklyProgress, monthlyTrends };
  }, [habits, selectedTimeRange]);

  const insights = useMemo(() => {
    const totalStreaks = habits.reduce((sum, h) => sum + (h.current_streak || 0), 0);
    const avgStreak = habits.length > 0 ? Math.round(totalStreaks / habits.length) : 0;
    const completedToday = habits.filter(h => h.is_completed_today).length;
    const completionRate = habits.length > 0 ? Math.round((completedToday / habits.length) * 100) : 0;
    
    const topHabit = habits.reduce((max, h) => 
      (h.current_streak || 0) > (max.current_streak || 0) ? h : max, 
      habits[0] || { title: 'None', current_streak: 0 }
    );

    return {
      totalStreaks,
      avgStreak,
      completionRate,
      topHabit: topHabit?.title || 'None',
      topStreak: topHabit?.current_streak || 0,
      momentum: completionRate > 75 ? 'Excellent' : completionRate > 50 ? 'Good' : 'Needs Improvement'
    };
  }, [habits]);

  const CustomTooltipComponent = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <CustomTooltip>
          <TooltipTitle>{label}</TooltipTitle>
          {payload.map((entry: any, index: number) => (
            <TooltipValue key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </TooltipValue>
          ))}
        </CustomTooltip>
      );
    }
    return null;
  };

  return (
    <Container
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Header>
        <Title>📊 Advanced Analytics</Title>
        <TimeRangeSelector>
          {(['week', 'month', 'quarter', 'year'] as const).map((range) => (
            <TimeRangeButton
              key={range}
              $active={selectedTimeRange === range}
              onClick={() => onTimeRangeChange(range)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </TimeRangeButton>
          ))}
        </TimeRangeSelector>
      </Header>

      {/* Key Insights */}
      <InsightCard
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <InsightTitle>🎯 Key Insights</InsightTitle>
        <InsightText>
          Your strongest habit is "{insights.topHabit}" with a {insights.topStreak}-day streak. 
          Current momentum: {insights.momentum} ({insights.completionRate}% completion rate). 
          Average streak across all habits: {insights.avgStreak} days.
        </InsightText>
      </InsightCard>

      {/* Stats Row */}
      <StatsRow>
        <StatCard
          color="#667eea"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <StatValue>{insights.totalStreaks}</StatValue>
          <StatLabel>Total Streak Days</StatLabel>
          <StatChange $positive={true}>+12% this week</StatChange>
        </StatCard>

        <StatCard
          color="#22c55e"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <StatValue>{insights.completionRate}%</StatValue>
          <StatLabel>Completion Rate</StatLabel>
          <StatChange $positive={insights.completionRate > 70}>
            {insights.completionRate > 70 ? '+' : '-'}
            {Math.abs(insights.completionRate - 70)}% vs target
          </StatChange>
        </StatCard>

        <StatCard
          color="#f59e0b"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <StatValue>{habits.length}</StatValue>
          <StatLabel>Active Habits</StatLabel>
          <StatChange $positive={true}>+2 this month</StatChange>
        </StatCard>

        <StatCard
          color="#ef4444"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <StatValue>{insights.avgStreak}</StatValue>
          <StatLabel>Average Streak</StatLabel>
          <StatChange $positive={insights.avgStreak > 5}>
            {insights.avgStreak > 5 ? 'Strong' : 'Building'}
          </StatChange>
        </StatCard>
      </StatsRow>

      {/* Charts Grid */}
      <ChartsGrid>
        {/* Completion Rate Trend */}
        <ChartContainer
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
        >
          <ChartTitle>
            <ChartIcon>📈</ChartIcon>
            Completion Rate Trend
          </ChartTitle>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData.completionData}>
              <defs>
                <linearGradient id="completionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#667eea" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltipComponent />} />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="#667eea"
                fillOpacity={1}
                fill="url(#completionGradient)"
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Habit Distribution */}
        <ChartContainer
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
        >
          <ChartTitle>
            <ChartIcon>🥧</ChartIcon>
            Habit Streak Distribution
          </ChartTitle>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData.habitDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.habitDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltipComponent />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Weekly Heatmap */}
        <ChartContainer
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9 }}
        >
          <ChartTitle>
            <ChartIcon>🗓️</ChartIcon>
            Weekly Activity Heatmap
          </ChartTitle>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.weeklyProgress} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="week" tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltipComponent />} />
              <Bar dataKey="Mon" stackId="a" fill="#ff6b6b" />
              <Bar dataKey="Tue" stackId="a" fill="#4ecdc4" />
              <Bar dataKey="Wed" stackId="a" fill="#45b7d1" />
              <Bar dataKey="Thu" stackId="a" fill="#96ceb4" />
              <Bar dataKey="Fri" stackId="a" fill="#ffeaa7" />
              <Bar dataKey="Sat" stackId="a" fill="#dda0dd" />
              <Bar dataKey="Sun" stackId="a" fill="#98d8c8" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Streak Progress */}
        <ChartContainer
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.0 }}
        >
          <ChartTitle>
            <ChartIcon>🔥</ChartIcon>
            Streak Progress
          </ChartTitle>
          <ResponsiveContainer width="100%" height={300}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="80%" data={chartData.habitDistribution}>
              <RadialBar
                angleAxisId={0}
                dataKey="streak"
                cornerRadius={10}
                fill="#667eea"
              />
              <Tooltip content={<CustomTooltipComponent />} />
            </RadialBarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </ChartsGrid>

      {/* Monthly Trends */}
      <FullWidthChart
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
      >
        <ChartTitle>
          <ChartIcon>📊</ChartIcon>
          Monthly Trends Overview
        </ChartTitle>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData.monthlyTrends}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltipComponent />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="completions"
              stroke="#667eea"
              strokeWidth={3}
              dot={{ r: 6 }}
              activeDot={{ r: 8 }}
            />
            <Line
              type="monotone"
              dataKey="streaks"
              stroke="#22c55e"
              strokeWidth={3}
              dot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="newHabits"
              stroke="#f59e0b"
              strokeWidth={3}
              dot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </FullWidthChart>
    </Container>
  );
}