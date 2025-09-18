import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import type { HabitWithCompletions } from '@habit-tracker/shared';
import { HabitCard } from './HabitCard';
import { useAuth } from '../../context/AuthContext';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px;
`;

const Spinner = styled(motion.div)`
  width: 40px;
  height: 40px;
  border: 4px solid #e1e5e9;
  border-top: 4px solid #667eea;
  border-radius: 50%;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #666;
`;

const EmptyStateIcon = styled.div`
  font-size: 64px;
  margin-bottom: 20px;
`;

const EmptyStateTitle = styled.h3`
  font-size: 24px;
  margin-bottom: 12px;
  color: #333;
`;

const EmptyStateDescription = styled.p`
  font-size: 16px;
  line-height: 1.6;
  max-width: 400px;
  margin: 0 auto 30px;
`;

const CreateHabitButton = styled(motion.button)`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

const ErrorMessage = styled.div`
  background: #fee;
  color: #c53030;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #feb2b2;
  text-align: center;
`;

const HabitGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
`;

const SectionTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px 0;
`;

const TodaySection = styled.div`
  margin-bottom: 40px;
`;

const OtherSection = styled.div``;

interface HabitListProps {
  onCreateHabit?: () => void;
  onEditHabit?: (habit: HabitWithCompletions) => void;
}

export function HabitList({ onCreateHabit, onEditHabit }: HabitListProps) {
  const [habits, setHabits] = useState<HabitWithCompletions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, habitService } = useAuth();

  useEffect(() => {
    if (!user) return;

    const loadHabits = async () => {
      try {
        setLoading(true);
        setError(null);
        const habitsWithCompletions = await habitService.getHabitsWithCompletions(user.id);
        setHabits(habitsWithCompletions);
      } catch (err) {
        console.error('Error loading habits:', err);
        setError('Failed to load habits. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadHabits();
  }, [user, habitService]);

  const handleToggleCompletion = async (habitId: string) => {
    if (!user) return;

    try {
      const isCompleted = await habitService.toggleHabitCompletion(habitId, user.id);
      
      // Optimistically update the UI
      setHabits(prevHabits =>
        prevHabits.map(habit => {
          if (habit.id === habitId) {
            const updatedStreak = isCompleted ? habit.current_streak + 1 : Math.max(0, habit.current_streak - 1);
            return {
              ...habit,
              is_completed_today: isCompleted,
              current_streak: updatedStreak,
              longest_streak: Math.max(habit.longest_streak, updatedStreak),
            };
          }
          return habit;
        })
      );
    } catch (err) {
      console.error('Error toggling habit completion:', err);
      setError('Failed to update habit. Please try again.');
    }
  };

  if (loading) {
    return (
      <LoadingContainer>
        <Spinner
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </LoadingContainer>
    );
  }

  if (error) {
    return <ErrorMessage>{error}</ErrorMessage>;
  }

  if (habits.length === 0) {
    return (
      <EmptyState>
        <EmptyStateIcon>🎯</EmptyStateIcon>
        <EmptyStateTitle>No habits yet!</EmptyStateTitle>
        <EmptyStateDescription>
          Start building better habits today. Create your first habit and begin your journey
          towards a more productive and fulfilling life.
        </EmptyStateDescription>
        <CreateHabitButton
          onClick={onCreateHabit}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span>➕</span>
          Create Your First Habit
        </CreateHabitButton>
      </EmptyState>
    );
  }

  // Separate habits into today's due habits and others
  const todayHabits = habits.filter(habit => habit.is_due_today);
  const otherHabits = habits.filter(habit => !habit.is_due_today);

  return (
    <Container>
      {todayHabits.length > 0 && (
        <TodaySection>
          <SectionTitle>Today's Habits ({todayHabits.length})</SectionTitle>
          <HabitGrid>
            <AnimatePresence>
              {todayHabits.map(habit => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  onToggleCompletion={handleToggleCompletion}
                  onEdit={onEditHabit}
                />
              ))}
            </AnimatePresence>
          </HabitGrid>
        </TodaySection>
      )}

      {otherHabits.length > 0 && (
        <OtherSection>
          <SectionTitle>Other Habits ({otherHabits.length})</SectionTitle>
          <HabitGrid>
            <AnimatePresence>
              {otherHabits.map(habit => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  onToggleCompletion={handleToggleCompletion}
                  onEdit={onEditHabit}
                />
              ))}
            </AnimatePresence>
          </HabitGrid>
        </OtherSection>
      )}
    </Container>
  );
}