import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import type { HabitWithCompletions, Habit } from '@habit-tracker/shared';
import { HabitList } from './habits/HabitList';
import { DashboardStats } from './habits/DashboardStats';
import { AdvancedHabitForm } from './habits/AdvancedHabitForm';
import { HabitAnalytics } from './habits/HabitAnalytics';
import { ExportImportSystem } from './export/ExportImportSystem';
import { Settings } from './Settings';
import { NotificationService } from '../services/notificationService';

const Container = styled.div`
  min-height: 100vh;
  background: #f8f9fa;
  padding: 20px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  background: white;
  padding: 20px 30px;
  border-radius: 15px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h1`
  color: #333;
  margin: 0;
  font-size: 2rem;
  font-weight: bold;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
`;

const UserEmail = styled.span`
  color: #666;
  font-size: 14px;
`;

const SignOutButton = styled(motion.button)`
  padding: 10px 20px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.3s ease;
  
  &:hover {
    background: #c82333;
  }
`;

const Content = styled.div`
  background: white;
  padding: 30px;
  border-radius: 15px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const Navigation = styled.div`
  display: flex;
  gap: 8px;
  background: #f8f9fa;
  padding: 8px;
  border-radius: 12px;
  margin-bottom: 30px;
`;

const NavButton = styled(motion.button)<{ $active: boolean }>`
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  background: ${props => props.$active ? 'white' : 'transparent'};
  color: ${props => props.$active ? '#333' : '#666'};
  font-weight: ${props => props.$active ? '600' : '400'};
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: ${props => props.$active ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'};
  
  &:hover {
    color: #333;
    background: ${props => props.$active ? 'white' : 'rgba(255,255,255,0.5)'};
  }
`;

type DashboardView = 'habits' | 'analytics' | 'export' | 'settings';

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
  margin-bottom: 30px;
`;

const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px;
  color: #666;
`;

const ErrorState = styled.div`
  background: #fee;
  color: #c53030;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #feb2b2;
  text-align: center;
  margin-bottom: 20px;
`;

export function Dashboard() {
  const { user, signOut, habitService } = useAuth();
  const [habits, setHabits] = useState<HabitWithCompletions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitWithCompletions | null>(null);
  const [currentView, setCurrentView] = useState<DashboardView>('habits');

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
    
    // Initialize notifications
    const notificationService = NotificationService.getInstance();
    notificationService.initialize();
    notificationService.checkMissedReminders();
  }, [user, habitService]);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleCreateHabit = () => {
    setEditingHabit(null);
    setShowHabitModal(true);
  };

  const handleEditHabit = (habit: HabitWithCompletions) => {
    setEditingHabit(habit);
    setShowHabitModal(true);
  };

  const handleCloseModal = () => {
    setShowHabitModal(false);
    setEditingHabit(null);
  };

  const handleHabitSubmit = async (habitData: Partial<Habit>) => {
    if (!user) return;
    
    try {
      if (editingHabit) {
        // Update existing habit
        await habitService.updateHabit(editingHabit.id, user.id, habitData);
      } else {
        // Create new habit
        await habitService.createHabit({
          ...habitData,
          user_id: user.id,
        } as Habit);
      }
      
      // Refresh habits list
      const habitsWithCompletions = await habitService.getHabitsWithCompletions(user.id);
      setHabits(habitsWithCompletions);
      
      // Close modal
      setShowHabitModal(false);
      setEditingHabit(null);
    } catch (err) {
      console.error('Error saving habit:', err);
      setError('Failed to save habit. Please try again.');
    }
  };

  const handleHabitDelete = async (habitId: string) => {
    if (!user) return;
    
    try {
      await habitService.deleteHabit(habitId, user.id);
      
      // Refresh habits list
      const habitsWithCompletions = await habitService.getHabitsWithCompletions(user.id);
      setHabits(habitsWithCompletions);
      
      // Close modal
      setShowHabitModal(false);
      setEditingHabit(null);
    } catch (err) {
      console.error('Error deleting habit:', err);
      setError('Failed to delete habit. Please try again.');
    }
  };

  if (loading) {
    return (
      <Container>
        <Header>
          <Title>🎯 Habit Tracker</Title>
          <UserInfo>
            <UserEmail>{user?.email}</UserEmail>
            <SignOutButton
              onClick={handleSignOut}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Sign Out
            </SignOutButton>
          </UserInfo>
        </Header>
        <Content>
          <LoadingState>Loading your habits...</LoadingState>
        </Content>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>🎯 Habit Tracker</Title>
        <UserInfo>
          <UserEmail>{user?.email}</UserEmail>
          <SignOutButton
            onClick={handleSignOut}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Sign Out
          </SignOutButton>
        </UserInfo>
      </Header>

      <Content>
        {error && <ErrorState>{error}</ErrorState>}
        
        <Navigation>
          <NavButton
            $active={currentView === 'habits'}
            onClick={() => setCurrentView('habits')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            🎯 Habits
          </NavButton>
          <NavButton
            $active={currentView === 'analytics'}
            onClick={() => setCurrentView('analytics')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            📊 Analytics
          </NavButton>
          <NavButton
            $active={currentView === 'export'}
            onClick={() => setCurrentView('export')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            📤 Export
          </NavButton>
          <NavButton
            $active={currentView === 'settings'}
            onClick={() => setCurrentView('settings')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            ⚙️ Settings
          </NavButton>
        </Navigation>

        {currentView === 'habits' && (
          <>
            <CreateHabitButton
              onClick={handleCreateHabit}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>➕</span>
              Create New Habit
            </CreateHabitButton>

            <DashboardStats habits={habits} />
            
            <HabitList 
              onCreateHabit={handleCreateHabit} 
              onEditHabit={handleEditHabit}
            />
          </>
        )}

        {currentView === 'analytics' && <HabitAnalytics habits={habits} />}
        {currentView === 'export' && <ExportImportSystem habits={habits} />}
        {currentView === 'settings' && <Settings />}
      </Content>

      {showHabitModal && (
        <AdvancedHabitForm
          isOpen={showHabitModal}
          onClose={handleCloseModal}
          onSubmit={handleHabitSubmit}
          onDelete={handleHabitDelete}
          habit={editingHabit || undefined}
        />
      )}
    </Container>
  );
}