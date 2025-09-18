import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import type { Habit, HabitWithCompletions } from '@habit-tracker/shared';
import { useAuth } from '../../context/AuthContext';

// Advanced styled components with sophisticated animations
const Overlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const Modal = styled(motion.div)`
  background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%);
  border-radius: 24px;
  width: 100%;
  max-width: 800px;
  max-height: 95vh;
  overflow: hidden;
  box-shadow: 
    0 32px 64px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  position: relative;
`;

const ModalHeader = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 30px;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") repeat;
    opacity: 0.3;
  }
`;

const HeaderContent = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.8rem;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
`;

const CloseButton = styled(motion.button)`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 44px;
  height: 44px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
  backdrop-filter: blur(10px);
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const ModalBody = styled.div`
  padding: 40px;
  max-height: calc(95vh - 120px);
  overflow-y: auto;
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f3f4;
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #c1c8e4;
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: #a8b5e8;
  }
`;

const FormSection = styled(motion.div)`
  margin-bottom: 40px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  color: #333;
  font-size: 1.3rem;
  font-weight: 600;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const SectionIcon = styled.span`
  font-size: 1.5rem;
`;

// Template Selection
const TemplateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 30px;
`;

const TemplateCard = styled(motion.div)<{ $selected: boolean }>`
  background: ${props => props.$selected ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f8f9fa'};
  color: ${props => props.$selected ? 'white' : '#333'};
  border: 2px solid ${props => props.$selected ? '#667eea' : 'transparent'};
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  }
`;

const TemplateIcon = styled.div`
  font-size: 2.5rem;
  margin-bottom: 12px;
`;

const TemplateName = styled.h4`
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  font-weight: 600;
`;

const TemplateDescription = styled.p`
  margin: 0;
  font-size: 14px;
  opacity: 0.8;
  line-height: 1.4;
`;

// Input components
const InputGroup = styled.div`
  margin-bottom: 24px;
`;

const Label = styled.label`
  display: block;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  font-size: 14px;
`;

const Input = styled.input`
  width: 100%;
  padding: 16px 20px;
  border: 2px solid #e1e5e9;
  border-radius: 12px;
  font-size: 16px;
  background: white;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
  }
  
  &::placeholder {
    color: #999;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 16px 20px;
  border: 2px solid #e1e5e9;
  border-radius: 12px;
  font-size: 16px;
  background: white;
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
  }
  
  &::placeholder {
    color: #999;
  }
`;

// Icon and Color Selection
const IconGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 12px;
  margin-bottom: 30px;
`;

const IconButton = styled(motion.button)<{ $selected: boolean }>`
  aspect-ratio: 1;
  border: none;
  border-radius: 12px;
  font-size: 24px;
  cursor: pointer;
  background: ${props => props.$selected ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f8f9fa'};
  color: ${props => props.$selected ? 'white' : '#333'};
  transition: all 0.3s ease;
  
  &:hover {
    transform: scale(1.1);
    background: ${props => props.$selected ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e1e5e9'};
  }
`;

const ColorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  margin-bottom: 30px;
`;

const ColorButton = styled(motion.button)<{ $color: string; $selected: boolean }>`
  aspect-ratio: 1;
  border: 3px solid ${props => props.$selected ? '#333' : 'transparent'};
  border-radius: 12px;
  background: ${props => props.$color};
  cursor: pointer;
  position: relative;
  
  &:hover {
    transform: scale(1.1);
  }
  
  ${props => props.$selected && `
    &::after {
      content: '✓';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-weight: bold;
      font-size: 18px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
    }
  `}
`;

// Frequency Selection
const FrequencyTabs = styled.div`
  display: flex;
  background: #f8f9fa;
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 20px;
`;

const FrequencyTab = styled(motion.button)<{ $active: boolean }>`
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  background: ${props => props.$active ? 'white' : 'transparent'};
  color: ${props => props.$active ? '#333' : '#666'};
  font-weight: ${props => props.$active ? '600' : '400'};
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: ${props => props.$active ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'};
`;

const DayGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  margin-bottom: 20px;
`;

const DayButton = styled(motion.button)<{ $selected: boolean }>`
  aspect-ratio: 1;
  border: 2px solid ${props => props.$selected ? '#667eea' : '#e1e5e9'};
  border-radius: 12px;
  background: ${props => props.$selected ? '#667eea' : 'white'};
  color: ${props => props.$selected ? 'white' : '#333'};
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
    border-color: #667eea;
  }
`;

// Advanced Settings
const AdvancedSection = styled(motion.div)<{ $expanded: boolean }>`
  background: #f8f9fa;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 30px;
`;

const AdvancedHeader = styled.button`
  width: 100%;
  padding: 20px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #333;
`;

const AdvancedContent = styled(motion.div)`
  padding: 0 20px 20px;
`;

const ReminderTimeInput = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 20px;
`;

const TimeInput = styled.input`
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 14px;
`;

const ToggleSwitch = styled.label<{ $checked: boolean }>`
  position: relative;
  display: inline-block;
  width: 50px;
  height: 28px;
  
  input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  span {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${props => props.$checked ? '#667eea' : '#ccc'};
    transition: 0.3s;
    border-radius: 14px;
    
    &:before {
      position: absolute;
      content: "";
      height: 20px;
      width: 20px;
      left: ${props => props.$checked ? '26px' : '4px'};
      bottom: 4px;
      background: white;
      transition: 0.3s;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
  }
`;

// Action Buttons
const ActionBar = styled.div`
  display: flex;
  gap: 16px;
  justify-content: flex-end;
  padding: 30px 40px;
  background: #f8f9fa;
  border-top: 1px solid #e1e5e9;
`;

const Button = styled(motion.button)<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 16px 32px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  ${props => props.$variant === 'primary' && `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    
    &:hover {
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
    }
  `}
  
  ${props => props.$variant === 'secondary' && `
    background: #e1e5e9;
    color: #666;
    
    &:hover {
      background: #d4dae4;
    }
  `}
  
  ${props => props.$variant === 'danger' && `
    background: #dc3545;
    color: white;
    
    &:hover {
      background: #c82333;
    }
  `}
`;

// Validation Error
const ErrorMessage = styled(motion.div)`
  background: #fee;
  color: #c53030;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  border: 1px solid #fed7d7;
`;

// Types and Data
interface HabitTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  frequency: number;
  category: string;
  defaultReminder?: string;
}

const HABIT_TEMPLATES: HabitTemplate[] = [
  {
    id: 'exercise',
    name: 'Daily Exercise',
    description: 'Build a consistent fitness routine',
    icon: '💪',
    color: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
    frequency: 127, // Daily
    category: 'Health',
    defaultReminder: '07:00'
  },
  {
    id: 'meditation',
    name: 'Meditation',
    description: 'Practice mindfulness and reduce stress',
    icon: '🧘',
    color: 'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)',
    frequency: 127,
    category: 'Wellness',
    defaultReminder: '06:30'
  },
  {
    id: 'reading',
    name: 'Read Books',
    description: 'Expand knowledge and vocabulary',
    icon: '📚',
    color: 'linear-gradient(135deg, #fdcb6e 0%, #e17055 100%)',
    frequency: 127,
    category: 'Learning',
    defaultReminder: '20:00'
  },
  {
    id: 'water',
    name: 'Drink Water',
    description: 'Stay hydrated throughout the day',
    icon: '💧',
    color: 'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)',
    frequency: 127,
    category: 'Health',
    defaultReminder: '09:00'
  },
  {
    id: 'sleep',
    name: 'Early Sleep',
    description: 'Maintain healthy sleep schedule',
    icon: '😴',
    color: 'linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%)',
    frequency: 127,
    category: 'Health',
    defaultReminder: '21:30'
  },
  {
    id: 'gratitude',
    name: 'Gratitude Journal',
    description: 'Practice daily gratitude',
    icon: '🙏',
    color: 'linear-gradient(135deg, #fd79a8 0%, #e84393 100%)',
    frequency: 127,
    category: 'Wellness'
  },
  {
    id: 'learn',
    name: 'Learn New Skill',
    description: 'Continuous learning and growth',
    icon: '🧠',
    color: 'linear-gradient(135deg, #00b894 0%, #00a085 100%)',
    frequency: 62, // Weekdays
    category: 'Learning'
  },
  {
    id: 'social',
    name: 'Connect with Friends',
    description: 'Maintain social relationships',
    icon: '👥',
    color: 'linear-gradient(135deg, #fd79a8 0%, #fdcb6e 100%)',
    frequency: 3, // Weekends
    category: 'Social'
  }
];

const HABIT_ICONS = [
  '🎯', '💪', '📚', '🧘', '💧', '🏃', '🥗', '😴',
  '🎨', '🎵', '📝', '💻', '🌱', '⭐', '🔥', '💎',
  '🚀', '⚡', '🌟', '💡', '🎪', '🎭', '🏆', '🎲'
];

const HABIT_COLORS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(135deg, #ff8a80 0%, #ea6100 100%)',
  'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
  'linear-gradient(135deg, #a6c1ee 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #fdbb2d 0%, #22c1c3 100%)'
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FREQUENCY_PRESETS = {
  daily: 127,
  weekdays: 62,
  weekends: 65,
  custom: 0
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (habit: Partial<Habit>) => Promise<void>;
  onDelete?: (habitId: string) => Promise<void>;
  habit?: HabitWithCompletions;
}

export function AdvancedHabitForm({ isOpen, onClose, onSubmit, onDelete, habit }: Props) {
  const { user } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    icon: '🎯',
    color: HABIT_COLORS[0],
    frequency: 127,
    reminderTime: '',
    reminderEnabled: false,
    streakGoal: 30,
    notes: ''
  });
  
  const [frequencyType, setFrequencyType] = useState<'daily' | 'weekdays' | 'weekends' | 'custom'>('daily');
  const [customDays, setCustomDays] = useState<boolean[]>(Array(7).fill(true));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (habit) {
      setFormData({
        title: habit.title,
        description: habit.description || '',
        icon: habit.icon || '🎯',
        color: habit.color || HABIT_COLORS[0],
        frequency: habit.frequency,
        reminderTime: '',
        reminderEnabled: false,
        streakGoal: 30,
        notes: ''
      });
      
      // Set frequency type based on habit frequency
      if (habit.frequency === 127) setFrequencyType('daily');
      else if (habit.frequency === 62) setFrequencyType('weekdays');
      else if (habit.frequency === 65) setFrequencyType('weekends');
      else {
        setFrequencyType('custom');
        const days = Array(7).fill(false);
        for (let i = 0; i < 7; i++) {
          days[i] = (habit.frequency & (1 << i)) !== 0;
        }
        setCustomDays(days);
      }
    }
  }, [habit]);

  const handleTemplateSelect = (template: HabitTemplate) => {
    setSelectedTemplate(template.id);
    setFormData(prev => ({
      ...prev,
      title: template.name,
      description: template.description,
      icon: template.icon,
      color: template.color,
      frequency: template.frequency,
      reminderTime: template.defaultReminder || '',
      reminderEnabled: !!template.defaultReminder
    }));
    
    if (template.frequency === 127) setFrequencyType('daily');
    else if (template.frequency === 62) setFrequencyType('weekdays');
    else if (template.frequency === 65) setFrequencyType('weekends');
  };

  const handleFrequencyChange = (type: typeof frequencyType) => {
    setFrequencyType(type);
    if (type !== 'custom') {
      setFormData(prev => ({
        ...prev,
        frequency: FREQUENCY_PRESETS[type]
      }));
    }
  };

  const handleCustomDayToggle = (dayIndex: number) => {
    const newDays = [...customDays];
    newDays[dayIndex] = !newDays[dayIndex];
    setCustomDays(newDays);
    
    // Calculate frequency value
    let frequency = 0;
    newDays.forEach((selected, index) => {
      if (selected) frequency |= (1 << index);
    });
    
    setFormData(prev => ({ ...prev, frequency }));
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];
    
    if (!formData.title.trim()) {
      newErrors.push('Habit title is required');
    }
    
    if (formData.title.length > 50) {
      newErrors.push('Title must be 50 characters or less');
    }
    
    if (formData.description.length > 200) {
      newErrors.push('Description must be 200 characters or less');
    }
    
    if (frequencyType === 'custom' && !customDays.some(day => day)) {
      newErrors.push('Please select at least one day for custom frequency');
    }
    
    if (formData.streakGoal < 1 || formData.streakGoal > 365) {
      newErrors.push('Streak goal must be between 1 and 365 days');
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !user) return;
    
    setIsSubmitting(true);
    try {
      const habitData: Partial<Habit> = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        icon: formData.icon,
        color: formData.color,
        frequency: formData.frequency,
        user_id: user.id
      };
      
      await onSubmit(habitData);
      onClose();
    } catch (error) {
      setErrors(['Failed to save habit. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!habit || !onDelete) return;
    
    if (confirm('Are you sure you want to delete this habit? This action cannot be undone.')) {
      try {
        await onDelete(habit.id);
        onClose();
      } catch (error) {
        setErrors(['Failed to delete habit. Please try again.']);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <Overlay
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <Modal
          initial={{ scale: 0.9, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 50 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <ModalHeader>
            <HeaderContent>
              <ModalTitle>
                {habit ? '✏️ Edit Habit' : '✨ Create New Habit'}
              </ModalTitle>
              <CloseButton
                onClick={onClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                ×
              </CloseButton>
            </HeaderContent>
          </ModalHeader>

          <ModalBody>
            {errors.length > 0 && (
              <ErrorMessage
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {errors.map((error, index) => (
                  <div key={index}>• {error}</div>
                ))}
              </ErrorMessage>
            )}

            {!habit && (
              <FormSection
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <SectionTitle>
                  <SectionIcon>🎨</SectionIcon>
                  Choose a Template (Optional)
                </SectionTitle>
                <TemplateGrid>
                  {HABIT_TEMPLATES.map((template) => (
                    <TemplateCard
                      key={template.id}
                      $selected={selectedTemplate === template.id}
                      onClick={() => handleTemplateSelect(template)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <TemplateIcon>{template.icon}</TemplateIcon>
                      <TemplateName>{template.name}</TemplateName>
                      <TemplateDescription>{template.description}</TemplateDescription>
                    </TemplateCard>
                  ))}
                </TemplateGrid>
              </FormSection>
            )}

            <FormSection
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <SectionTitle>
                <SectionIcon>📝</SectionIcon>
                Basic Information
              </SectionTitle>
              
              <InputGroup>
                <Label>Habit Title *</Label>
                <Input
                  type="text"
                  placeholder="e.g., Morning Exercise, Read for 30 minutes"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  maxLength={50}
                />
              </InputGroup>

              <InputGroup>
                <Label>Description</Label>
                <TextArea
                  placeholder="Describe your habit, why it's important to you, or any specific goals..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  maxLength={200}
                />
              </InputGroup>

              <InputGroup>
                <Label>Personal Notes</Label>
                <TextArea
                  placeholder="Any personal motivation, tips, or notes for this habit..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  maxLength={200}
                />
              </InputGroup>
            </FormSection>

            <FormSection
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <SectionTitle>
                <SectionIcon>🎯</SectionIcon>
                Choose Icon
              </SectionTitle>
              <IconGrid>
                {HABIT_ICONS.map((icon) => (
                  <IconButton
                    key={icon}
                    $selected={formData.icon === icon}
                    onClick={() => setFormData(prev => ({ ...prev, icon }))}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {icon}
                  </IconButton>
                ))}
              </IconGrid>
            </FormSection>

            <FormSection
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <SectionTitle>
                <SectionIcon>🎨</SectionIcon>
                Choose Color Theme
              </SectionTitle>
              <ColorGrid>
                {HABIT_COLORS.map((color, index) => (
                  <ColorButton
                    key={index}
                    $color={color}
                    $selected={formData.color === color}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  />
                ))}
              </ColorGrid>
            </FormSection>

            <FormSection
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <SectionTitle>
                <SectionIcon>📅</SectionIcon>
                Frequency
              </SectionTitle>
              
              <FrequencyTabs>
                <FrequencyTab
                  $active={frequencyType === 'daily'}
                  onClick={() => handleFrequencyChange('daily')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Daily
                </FrequencyTab>
                <FrequencyTab
                  $active={frequencyType === 'weekdays'}
                  onClick={() => handleFrequencyChange('weekdays')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Weekdays
                </FrequencyTab>
                <FrequencyTab
                  $active={frequencyType === 'weekends'}
                  onClick={() => handleFrequencyChange('weekends')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Weekends
                </FrequencyTab>
                <FrequencyTab
                  $active={frequencyType === 'custom'}
                  onClick={() => handleFrequencyChange('custom')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Custom
                </FrequencyTab>
              </FrequencyTabs>

              {frequencyType === 'custom' && (
                <DayGrid>
                  {DAYS.map((day, index) => (
                    <DayButton
                      key={day}
                      $selected={customDays[index]}
                      onClick={() => handleCustomDayToggle(index)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {day}
                    </DayButton>
                  ))}
                </DayGrid>
              )}
            </FormSection>

            <AdvancedSection $expanded={showAdvanced}>
              <AdvancedHeader onClick={() => setShowAdvanced(!showAdvanced)}>
                <span>⚙️ Advanced Settings</span>
                <motion.span
                  animate={{ rotate: showAdvanced ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  ▼
                </motion.span>
              </AdvancedHeader>
              
              <AnimatePresence>
                {showAdvanced && (
                  <AdvancedContent
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <InputGroup>
                      <Label>Streak Goal (days)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="365"
                        value={formData.streakGoal}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          streakGoal: parseInt(e.target.value) || 1 
                        }))}
                      />
                    </InputGroup>

                    <ReminderTimeInput>
                      <ToggleSwitch $checked={formData.reminderEnabled}>
                        <input
                          type="checkbox"
                          checked={formData.reminderEnabled}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            reminderEnabled: e.target.checked 
                          }))}
                        />
                        <span></span>
                      </ToggleSwitch>
                      <Label>Daily Reminder</Label>
                      {formData.reminderEnabled && (
                        <TimeInput
                          type="time"
                          value={formData.reminderTime}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            reminderTime: e.target.value 
                          }))}
                        />
                      )}
                    </ReminderTimeInput>

                    <InputGroup>
                      <Label>Personal Notes</Label>
                      <TextArea
                        placeholder="Any personal motivation, tips, or notes for this habit..."
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                      />
                    </InputGroup>
                  </AdvancedContent>
                )}
              </AnimatePresence>
            </AdvancedSection>
          </ModalBody>

          <ActionBar>
            {habit && onDelete && (
              <Button
                $variant="danger"
                onClick={handleDelete}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                🗑️ Delete
              </Button>
            )}
            
            <div style={{ flex: 1 }} />
            
            <Button
              $variant="secondary"
              onClick={onClose}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Cancel
            </Button>
            
            <Button
              $variant="primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
              whileHover={{ scale: isSubmitting ? 1 : 1.05 }}
              whileTap={{ scale: isSubmitting ? 1 : 0.95 }}
            >
              {isSubmitting ? '⏳ Saving...' : (habit ? '💾 Update' : '✨ Create')}
            </Button>
          </ActionBar>
        </Modal>
      </Overlay>
    </AnimatePresence>
  );
}