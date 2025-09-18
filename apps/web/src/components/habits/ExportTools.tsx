import { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import type { HabitWithCompletions } from '@habit-tracker/shared';

const Container = styled(motion.div)`
  background: white;
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 30px;
`;

const Title = styled.h2`
  color: #333;
  margin: 0;
  font-size: 1.5rem;
  font-weight: bold;
`;

const ExportGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
`;

const ExportCard = styled(motion.div)`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 24px;
  color: white;
  cursor: pointer;
  transition: transform 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const ExportIcon = styled.div`
  font-size: 2.5rem;
  margin-bottom: 16px;
`;

const ExportTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 1.2rem;
  font-weight: 600;
`;

const ExportDescription = styled.p`
  margin: 0;
  font-size: 14px;
  opacity: 0.9;
  line-height: 1.4;
`;

const ProgressModal = styled(motion.div)`
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
`;

const ProgressContent = styled(motion.div)`
  background: white;
  border-radius: 20px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
`;

const ProgressIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 20px;
`;

const ProgressText = styled.div`
  font-size: 1.1rem;
  color: #333;
  margin-bottom: 10px;
`;

const ProgressSubtext = styled.div`
  font-size: 14px;
  color: #666;
`;

interface ExportToolsProps {
  habits: HabitWithCompletions[];
}

export function ExportTools({ habits }: ExportToolsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ type: '', message: '' });

  const generateCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateJSON = (data: any, filename: string) => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportHabitsCSV = async () => {
    setIsExporting(true);
    setExportProgress({ type: 'Exporting Habits', message: 'Preparing habit data...' });

    await new Promise(resolve => setTimeout(resolve, 1000));

    const habitsData = habits.map(habit => ({
      id: habit.id,
      title: habit.title,
      description: habit.description || '',
      icon: habit.icon || '',
      color: habit.color || '',
      frequency: habit.frequency,
      created_at: habit.created_at,
      current_streak: habit.current_streak || 0,
      longest_streak: habit.longest_streak || 0,
      total_completions: habit.completions?.length || 0
    }));

    generateCSV(habitsData, `habits-export-${new Date().toISOString().split('T')[0]}.csv`);
    setIsExporting(false);
  };

  const exportCompletionsCSV = async () => {
    setIsExporting(true);
    setExportProgress({ type: 'Exporting Completions', message: 'Gathering completion data...' });

    await new Promise(resolve => setTimeout(resolve, 1000));

    const completionsData = habits.flatMap(habit => 
      (habit.completions || []).map(completion => ({
        habit_id: habit.id,
        habit_title: habit.title,
        habit_icon: habit.icon || '',
        completed_at: completion.completed_at,
        completion_date: completion.completed_at.split('T')[0],
        notes: '' // Notes field not available in current schema
      }))
    );

    generateCSV(completionsData, `completions-export-${new Date().toISOString().split('T')[0]}.csv`);
    setIsExporting(false);
  };

  const exportFullBackup = async () => {
    setIsExporting(true);
    setExportProgress({ type: 'Creating Backup', message: 'Preparing complete data backup...' });

    await new Promise(resolve => setTimeout(resolve, 1500));

    const backupData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      habits: habits.map(habit => ({
        ...habit,
        completions: habit.completions || []
      })),
      summary: {
        totalHabits: habits.length,
        totalCompletions: habits.reduce((sum, h) => sum + (h.completions?.length || 0), 0),
        exportedAt: new Date().toISOString()
      }
    };

    generateJSON(backupData, `habit-tracker-backup-${new Date().toISOString().split('T')[0]}.json`);
    setIsExporting(false);
  };

  const exportAnalyticsReport = async () => {
    setIsExporting(true);
    setExportProgress({ type: 'Generating Report', message: 'Analyzing habit patterns...' });

    await new Promise(resolve => setTimeout(resolve, 2000));

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const analyticsData = {
      reportDate: new Date().toISOString(),
      period: {
        from: thirtyDaysAgo.toISOString(),
        to: now.toISOString(),
        days: 30
      },
      summary: {
        totalHabits: habits.length,
        activeHabits: habits.filter(h => 
          h.completions?.some(c => new Date(c.completed_at) >= thirtyDaysAgo)
        ).length,
        totalCompletions: habits.reduce((sum, h) => sum + (h.completions?.length || 0), 0),
        averageStreak: habits.length > 0 
          ? habits.reduce((sum, h) => sum + (h.current_streak || 0), 0) / habits.length 
          : 0,
        bestStreak: Math.max(...habits.map(h => h.longest_streak || 0), 0)
      },
      habitPerformance: habits.map(habit => {
        const recentCompletions = habit.completions?.filter(c => 
          new Date(c.completed_at) >= thirtyDaysAgo
        ) || [];
        
        return {
          habitId: habit.id,
          title: habit.title,
          icon: habit.icon,
          currentStreak: habit.current_streak || 0,
          longestStreak: habit.longest_streak || 0,
          recentCompletions: recentCompletions.length,
          consistencyRate: (recentCompletions.length / 30) * 100,
          lastCompletion: recentCompletions.length > 0 
            ? recentCompletions[recentCompletions.length - 1].completed_at 
            : null
        };
      }),
      dailyActivity: Array.from({ length: 30 }, (_, i) => {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        
        return {
          date: dateStr,
          completions: habits.reduce((total, habit) => {
            const dayCompletions = habit.completions?.filter(c => 
              c.completed_at.startsWith(dateStr)
            ).length || 0;
            return total + dayCompletions;
          }, 0)
        };
      }).reverse()
    };

    generateJSON(analyticsData, `habit-analytics-${new Date().toISOString().split('T')[0]}.json`);
    setIsExporting(false);
  };

  return (
    <>
      <Container
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Header>
          <span style={{ fontSize: '1.5rem' }}>📤</span>
          <Title>Export & Backup</Title>
        </Header>

        <ExportGrid>
          <ExportCard
            onClick={exportHabitsCSV}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <ExportIcon>📋</ExportIcon>
            <ExportTitle>Export Habits</ExportTitle>
            <ExportDescription>
              Download your habits list as a CSV file for spreadsheet analysis
            </ExportDescription>
          </ExportCard>

          <ExportCard
            onClick={exportCompletionsCSV}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <ExportIcon>✅</ExportIcon>
            <ExportTitle>Export Completions</ExportTitle>
            <ExportDescription>
              Download all your habit completions with timestamps and notes
            </ExportDescription>
          </ExportCard>

          <ExportCard
            onClick={exportAnalyticsReport}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <ExportIcon>📊</ExportIcon>
            <ExportTitle>Analytics Report</ExportTitle>
            <ExportDescription>
              Generate a comprehensive analysis of your habit patterns and progress
            </ExportDescription>
          </ExportCard>

          <ExportCard
            onClick={exportFullBackup}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <ExportIcon>💾</ExportIcon>
            <ExportTitle>Full Backup</ExportTitle>
            <ExportDescription>
              Create a complete backup of all your data in JSON format
            </ExportDescription>
          </ExportCard>
        </ExportGrid>
      </Container>

      {isExporting && (
        <ProgressModal
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <ProgressContent
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
          >
            <ProgressIcon>⏳</ProgressIcon>
            <ProgressText>{exportProgress.type}</ProgressText>
            <ProgressSubtext>{exportProgress.message}</ProgressSubtext>
          </ProgressContent>
        </ProgressModal>
      )}
    </>
  );
}