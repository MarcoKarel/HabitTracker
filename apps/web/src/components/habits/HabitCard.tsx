import { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import type { HabitWithCompletions } from '@habit-tracker/shared';
import { getFrequencyDays } from '@habit-tracker/shared';

const Card = styled(motion.div)<{ $completed: boolean }>`
  background: ${props => props.$completed ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : 'white'};
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 2px solid ${props => props.$completed ? '#22c55e' : 'transparent'};
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const EditButton = styled(motion.button)<{ $completed: boolean }>`
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: ${props => props.$completed ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'};
  color: ${props => props.$completed ? 'white' : '#666'};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.3s ease;
  opacity: 0;
  
  ${Card}:hover & {
    opacity: 1;
  }
  
  &:hover {
    background: ${props => props.$completed ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)'};
    transform: scale(1.1);
  }
`;

const HabitIcon = styled.div<{ $completed: boolean }>`
  font-size: 32px;
  margin-right: 16px;
  filter: ${props => props.$completed ? 'brightness(1.2)' : 'none'};
`;

const HabitInfo = styled.div`
  flex: 1;
`;

const HabitTitle = styled.h3<{ $completed: boolean }>`
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: ${props => props.$completed ? 'white' : '#333'};
  transition: color 0.3s ease;
`;

const HabitDescription = styled.p<{ $completed: boolean }>`
  margin: 0 0 12px 0;
  font-size: 14px;
  color: ${props => props.$completed ? 'rgba(255, 255, 255, 0.9)' : '#666'};
  line-height: 1.4;
`;

const FrequencyTags = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 16px;
`;

const FrequencyTag = styled.span<{ $completed: boolean }>`
  background: ${props => props.$completed ? 'rgba(255, 255, 255, 0.2)' : '#f1f3f4'};
  color: ${props => props.$completed ? 'white' : '#666'};
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
`;

const StreakContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const StreakInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const StreakItem = styled.div<{ $completed: boolean }>`
  text-align: center;
`;

const StreakNumber = styled.div<{ $completed: boolean; $glow?: boolean }>`
  font-size: 24px;
  font-weight: bold;
  color: ${props => props.$completed ? 'white' : '#333'};
  ${props => props.$glow && `
    text-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
    animation: glow 2s ease-in-out infinite alternate;
  `}
  
  @keyframes glow {
    from {
      text-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
    }
    to {
      text-shadow: 0 0 20px rgba(255, 215, 0, 1), 0 0 30px rgba(255, 215, 0, 0.8);
    }
  }
`;

const StreakLabel = styled.div<{ $completed: boolean }>`
  font-size: 12px;
  color: ${props => props.$completed ? 'rgba(255, 255, 255, 0.8)' : '#666'};
  font-weight: 500;
`;

const CompletionButton = styled(motion.button)<{ $completed: boolean }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 3px solid ${props => props.$completed ? 'white' : '#e1e5e9'};
  background: ${props => props.$completed ? 'white' : 'transparent'};
  color: ${props => props.$completed ? '#22c55e' : '#ccc'};
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: ${props => props.$completed ? 'white' : '#22c55e'};
    color: ${props => props.$completed ? '#16a34a' : '#22c55e'};
    transform: scale(1.1);
  }
`;

const CompletionRipple = styled(motion.div)`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100px;
  height: 100px;
  background: radial-gradient(circle, rgba(34, 197, 94, 0.3) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
`;

const ConfettiContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
`;

const ConfettiPiece = styled(motion.div)<{ $color: string }>`
  position: absolute;
  width: 8px;
  height: 8px;
  background: ${props => props.$color};
  border-radius: 2px;
`;

interface HabitCardProps {
  habit: HabitWithCompletions;
  onToggleCompletion: (habitId: string) => void;
  onEdit?: (habit: HabitWithCompletions) => void;
  onDelete?: (habitId: string) => void;
}

export function HabitCard({ habit, onToggleCompletion, onEdit }: HabitCardProps) {
  const [showRipple, setShowRipple] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const isCompleted = habit.is_completed_today;
  const frequencyDays = getFrequencyDays(habit.frequency);

  const handleToggleCompletion = async () => {
    const wasCompleted = isCompleted;
    
    // Show ripple effect
    setShowRipple(true);
    setTimeout(() => setShowRipple(false), 600);
    
    // If completing and it's a milestone streak, show confetti
    if (!wasCompleted && (habit.current_streak + 1) % 7 === 0) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    
    onToggleCompletion(habit.id);
  };

  const confettiColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd'];

  return (
    <Card
      $completed={isCompleted}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <CardHeader>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <HabitIcon $completed={isCompleted}>
            {habit.icon || '🎯'}
          </HabitIcon>
          <HabitInfo>
            <HabitTitle $completed={isCompleted}>
              {habit.title}
            </HabitTitle>
            {habit.description && (
              <HabitDescription $completed={isCompleted}>
                {habit.description}
              </HabitDescription>
            )}
            <FrequencyTags>
              {frequencyDays.map(day => (
                <FrequencyTag key={day} $completed={isCompleted}>
                  {day}
                </FrequencyTag>
              ))}
            </FrequencyTags>
          </HabitInfo>
        </div>
        {onEdit && (
          <EditButton 
            $completed={isCompleted}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(habit);
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            ✏️
          </EditButton>
        )}
      </CardHeader>

      <StreakContainer>
        <StreakInfo>
          <StreakItem $completed={isCompleted}>
            <StreakNumber 
              $completed={isCompleted} 
              $glow={habit.current_streak > 0 && habit.current_streak % 7 === 0}
            >
              {habit.current_streak}
            </StreakNumber>
            <StreakLabel $completed={isCompleted}>
              Current Streak
            </StreakLabel>
          </StreakItem>
          
          <StreakItem $completed={isCompleted}>
            <StreakNumber $completed={isCompleted}>
              {habit.longest_streak}
            </StreakNumber>
            <StreakLabel $completed={isCompleted}>
              Best Streak
            </StreakLabel>
          </StreakItem>
          
          <StreakItem $completed={isCompleted}>
            <StreakNumber $completed={isCompleted}>
              {habit.completion_rate}%
            </StreakNumber>
            <StreakLabel $completed={isCompleted}>
              Success Rate
            </StreakLabel>
          </StreakItem>
        </StreakInfo>

        <CompletionButton
          $completed={isCompleted}
          onClick={handleToggleCompletion}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          {isCompleted ? '✓' : '○'}
          
          <AnimatePresence>
            {showRipple && (
              <CompletionRipple
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 2, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
              />
            )}
          </AnimatePresence>
        </CompletionButton>
      </StreakContainer>

      <AnimatePresence>
        {showConfetti && (
          <ConfettiContainer>
            {Array.from({ length: 20 }).map((_, i) => (
              <ConfettiPiece
                key={i}
                $color={confettiColors[i % confettiColors.length]}
                initial={{
                  x: '50%',
                  y: '50%',
                  scale: 0,
                  rotate: 0,
                }}
                animate={{
                  x: `${50 + (Math.random() - 0.5) * 200}%`,
                  y: `${50 + (Math.random() - 0.5) * 200}%`,
                  scale: [0, 1, 0],
                  rotate: 360 * (Math.random() - 0.5),
                }}
                transition={{
                  duration: 3,
                  ease: 'easeOut',
                }}
              />
            ))}
          </ConfettiContainer>
        )}
      </AnimatePresence>
    </Card>
  );
}