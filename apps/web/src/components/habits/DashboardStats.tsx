import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import type { HabitWithCompletions } from '@habit-tracker/shared';

const Container = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const StatCard = styled(motion.div)`
  background: white;
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  }
`;

const StatIcon = styled.div`
  font-size: 32px;
  margin-bottom: 12px;
`;

const StatValue = styled.div`
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: #666;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatDescription = styled.div`
  font-size: 12px;
  color: #999;
  margin-top: 4px;
`;

interface DashboardStatsProps {
  habits: HabitWithCompletions[];
}

export function DashboardStats({ habits }: DashboardStatsProps) {
  const [stats, setStats] = useState({
    totalHabits: 0,
    completedToday: 0,
    activeStreaks: 0,
    completionRate: 0,
  });

  useEffect(() => {
    const totalHabits = habits.length;
    const completedToday = habits.filter(habit => habit.is_completed_today).length;
    const activeStreaks = habits.filter(habit => habit.current_streak > 0).length;
    
    // Calculate overall completion rate
    const totalCompletions = habits.reduce((sum, habit) => sum + habit.completions.length, 0);
    const totalDays = habits.reduce((sum, habit) => {
      const startDate = new Date(habit.start_date);
      const daysSinceStart = Math.ceil((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      return sum + Math.max(1, daysSinceStart);
    }, 0);
    
    const completionRate = totalDays > 0 ? Math.round((totalCompletions / totalDays) * 100) : 0;

    setStats({
      totalHabits,
      completedToday,
      activeStreaks,
      completionRate,
    });
  }, [habits]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <Container
      as={motion.div}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <StatCard variants={cardVariants}>
        <StatIcon>📈</StatIcon>
        <StatValue>{stats.totalHabits}</StatValue>
        <StatLabel>Total Habits</StatLabel>
        <StatDescription>
          {stats.totalHabits === 0 ? 'Start your first habit!' : 'Keep building!'}
        </StatDescription>
      </StatCard>

      <StatCard variants={cardVariants}>
        <StatIcon>✅</StatIcon>
        <StatValue>{stats.completedToday}</StatValue>
        <StatLabel>Completed Today</StatLabel>
        <StatDescription>
          {stats.totalHabits > 0 
            ? `${Math.round((stats.completedToday / stats.totalHabits) * 100)}% of today's habits`
            : 'No habits to complete'
          }
        </StatDescription>
      </StatCard>

      <StatCard variants={cardVariants}>
        <StatIcon>🔥</StatIcon>
        <StatValue>{stats.activeStreaks}</StatValue>
        <StatLabel>Active Streaks</StatLabel>
        <StatDescription>
          {stats.activeStreaks === 0 ? 'Start a streak today!' : 'Keep it going!'}
        </StatDescription>
      </StatCard>

      <StatCard variants={cardVariants}>
        <StatIcon>🎯</StatIcon>
        <StatValue>{stats.completionRate}%</StatValue>
        <StatLabel>Success Rate</StatLabel>
        <StatDescription>
          {stats.completionRate >= 80 ? 'Excellent!' : 
           stats.completionRate >= 60 ? 'Good progress!' : 
           stats.completionRate >= 40 ? 'Keep improving!' : 
           'You can do better!'}
        </StatDescription>
      </StatCard>
    </Container>
  );
}