import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import type { Habit, HabitWithCompletions } from '@habit-tracker/shared';
import { FREQUENCY_DAYS, FREQUENCY_PRESETS, validateHabitTitle, validateFrequency } from '@habit-tracker/shared';
import { useAuth } from '../../context/AuthContext';

const Overlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const Modal = styled(motion.div)`
  background: white;
  border-radius: 20px;
  padding: 30px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 24px;
  font-weight: bold;
  color: #333;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 4px;
  
  &:hover {
    color: #333;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-weight: 600;
  color: #333;
  font-size: 14px;
`;

const Input = styled.input`
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 10px;
  font-size: 16px;
  transition: border-color 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #667eea;
  }
  
  &.error {
    border-color: #ef4444;
  }
`;

const TextArea = styled.textarea`
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 10px;
  font-size: 16px;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  transition: border-color 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const FrequencySection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FrequencyPresets = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const PresetButton = styled.button<{ $active: boolean }>`
  padding: 8px 16px;
  border: 2px solid ${props => props.$active ? '#667eea' : '#e1e5e9'};
  background: ${props => props.$active ? '#667eea' : 'white'};
  color: ${props => props.$active ? 'white' : '#666'};
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: #667eea;
    background: ${props => props.$active ? '#5a67d8' : '#f7fafc'};
  }
`;

const DaySelector = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  margin-top: 8px;
`;

const DayButton = styled.button<{ $selected: boolean }>`
  aspect-ratio: 1;
  border: 2px solid ${props => props.$selected ? '#667eea' : '#e1e5e9'};
  background: ${props => props.$selected ? '#667eea' : 'white'};
  color: ${props => props.$selected ? 'white' : '#666'};
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    border-color: #667eea;
    background: ${props => props.$selected ? '#5a67d8' : '#f7fafc'};
  }
`;

const EmojiPicker = styled.div`
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 8px;
  max-height: 120px;
  overflow-y: auto;
  padding: 8px;
  border: 2px solid #e1e5e9;
  border-radius: 10px;
`;

const EmojiButton = styled.button<{ $selected: boolean }>`
  aspect-ratio: 1;
  border: 2px solid ${props => props.$selected ? '#667eea' : 'transparent'};
  background: ${props => props.$selected ? '#f0f4ff' : 'transparent'};
  border-radius: 8px;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  
  &:hover {
    background: #f0f4ff;
  }
`;

const ColorPicker = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const ColorButton = styled.button<{ $color: string; $selected: boolean }>`
  width: 40px;
  height: 40px;
  border: 3px solid ${props => props.$selected ? '#333' : 'transparent'};
  background: ${props => props.$color};
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: scale(1.1);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 20px;
`;

const Button = styled(motion.button)<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  flex: 1;
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  ${props => {
    switch (props.$variant) {
      case 'danger':
        return `
          background: #ef4444;
          color: white;
          &:hover { background: #dc2626; }
        `;
      case 'secondary':
        return `
          background: #f1f3f4;
          color: #666;
          &:hover { background: #e1e5e9; }
        `;
      default:
        return `
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          &:hover { background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%); }
        `;
    }
  }}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: #ef4444;
  font-size: 14px;
  margin-top: 4px;
`;

interface HabitFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  habit?: HabitWithCompletions;
  onSubmit: (habitData: Partial<Habit>) => Promise<void>;
  onDelete?: (habitId: string) => Promise<void>;
}

const DEFAULT_EMOJIS = ['🎯', '📚', '💪', '🏃', '🧘', '💧', '🥗', '😴', '🎨', '🎵', '🧠', '❤️', '🌱', '⭐', '🔥', '💎'];
const DEFAULT_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export function HabitFormModal({ isOpen, onClose, habit, onSubmit, onDelete }: HabitFormModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<number>(FREQUENCY_PRESETS.DAILY);
  const [icon, setIcon] = useState('🎯');
  const [color, setColor] = useState('#3B82F6');
  const [startDate, setStartDate] = useState('');

  // Initialize form when habit changes
  useEffect(() => {
    if (habit) {
      setTitle(habit.title);
      setDescription(habit.description || '');
      setFrequency(habit.frequency);
      setIcon(habit.icon || '🎯');
      setColor(habit.color || '#3B82F6');
      setStartDate(habit.start_date);
    } else {
      setTitle('');
      setDescription('');
      setFrequency(FREQUENCY_PRESETS.DAILY);
      setIcon('🎯');
      setColor('#3B82F6');
      setStartDate(new Date().toISOString().split('T')[0]);
    }
    setError('');
  }, [habit]);

  const handleFrequencyPreset = (preset: number) => {
    setFrequency(preset);
  };

  const handleDayToggle = (dayValue: number) => {
    const newFrequency = frequency ^ dayValue; // XOR to toggle
    setFrequency(newFrequency);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!validateHabitTitle(title)) {
      setError('Title must be between 2 and 100 characters');
      return;
    }

    if (!validateFrequency(frequency)) {
      setError('Please select at least one day');
      return;
    }

    if (!user) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);

    try {
      const habitData: Partial<Habit> = {
        title: title.trim(),
        description: description.trim() || undefined,
        frequency,
        icon,
        color,
        start_date: startDate,
        user_id: user.id,
      };

      await onSubmit(habitData);
      onClose();
    } catch (err) {
      console.error('Error saving habit:', err);
      setError('Failed to save habit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!habit || !onDelete) return;
    
    if (window.confirm('Are you sure you want to delete this habit? This action cannot be undone.')) {
      setLoading(true);
      try {
        await onDelete(habit.id);
        onClose();
      } catch (err) {
        console.error('Error deleting habit:', err);
        setError('Failed to delete habit. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const isEditing = !!habit;

  return (
    <AnimatePresence>
      {isOpen && (
        <Overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <Modal
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Header>
              <Title>{isEditing ? 'Edit Habit' : 'Create New Habit'}</Title>
              <CloseButton onClick={onClose}>×</CloseButton>
            </Header>

            <Form onSubmit={handleSubmit}>
              <FormGroup>
                <Label>Title *</Label>
                <Input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Read 30 minutes, Exercise, Drink water"
                  required
                />
              </FormGroup>

              <FormGroup>
                <Label>Description</Label>
                <TextArea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional: Add details about your habit..."
                />
              </FormGroup>

              <FormGroup>
                <Label>Icon</Label>
                <EmojiPicker>
                  {DEFAULT_EMOJIS.map((emoji) => (
                    <EmojiButton
                      key={emoji}
                      type="button"
                      $selected={icon === emoji}
                      onClick={() => setIcon(emoji)}
                    >
                      {emoji}
                    </EmojiButton>
                  ))}
                </EmojiPicker>
              </FormGroup>

              <FormGroup>
                <Label>Color</Label>
                <ColorPicker>
                  {DEFAULT_COLORS.map((colorOption) => (
                    <ColorButton
                      key={colorOption}
                      type="button"
                      $color={colorOption}
                      $selected={color === colorOption}
                      onClick={() => setColor(colorOption)}
                    />
                  ))}
                </ColorPicker>
              </FormGroup>

              <FormGroup>
                <Label>Frequency *</Label>
                <FrequencySection>
                  <FrequencyPresets>
                    <PresetButton
                      type="button"
                      $active={frequency === FREQUENCY_PRESETS.DAILY}
                      onClick={() => handleFrequencyPreset(FREQUENCY_PRESETS.DAILY)}
                    >
                      Daily
                    </PresetButton>
                    <PresetButton
                      type="button"
                      $active={frequency === FREQUENCY_PRESETS.WEEKDAYS}
                      onClick={() => handleFrequencyPreset(FREQUENCY_PRESETS.WEEKDAYS)}
                    >
                      Weekdays
                    </PresetButton>
                    <PresetButton
                      type="button"
                      $active={frequency === FREQUENCY_PRESETS.WEEKENDS}
                      onClick={() => handleFrequencyPreset(FREQUENCY_PRESETS.WEEKENDS)}
                    >
                      Weekends
                    </PresetButton>
                  </FrequencyPresets>
                  
                  <DaySelector>
                    {Object.entries(FREQUENCY_DAYS).map(([day, value]) => (
                      <DayButton
                        key={day}
                        type="button"
                        $selected={(frequency & value) !== 0}
                        onClick={() => handleDayToggle(value)}
                      >
                        {day.slice(0, 1)}
                      </DayButton>
                    ))}
                  </DaySelector>
                </FrequencySection>
              </FormGroup>

              <FormGroup>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </FormGroup>

              {error && <ErrorMessage>{error}</ErrorMessage>}

              <ButtonGroup>
                {isEditing && onDelete && (
                  <Button
                    type="button"
                    $variant="danger"
                    onClick={handleDelete}
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Delete
                  </Button>
                )}
                
                <Button
                  type="button"
                  $variant="secondary"
                  onClick={onClose}
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </Button>
                
                <Button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
                </Button>
              </ButtonGroup>
            </Form>
          </Modal>
        </Overlay>
      )}
    </AnimatePresence>
  );
}