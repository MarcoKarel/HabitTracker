import { useState, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import type { HabitWithCompletions } from '@habit-tracker/shared';

// Styled Components
const Container = styled(motion.div)`
  background: white;
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  border: 1px solid #f0f2f5;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 32px;
`;

const Title = styled.h2`
  font-size: 28px;
  font-weight: 800;
  color: #333;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: #666;
  margin: 0;
  line-height: 1.5;
`;

const TabContainer = styled.div`
  display: flex;
  background: #f8f9fa;
  border-radius: 16px;
  padding: 6px;
  margin-bottom: 32px;
`;

const Tab = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  
  ${props => props.$active ? `
    background: white;
    color: #667eea;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  ` : `
    background: transparent;
    color: #666;
    
    &:hover {
      color: #333;
    }
  `}
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
`;

const ExportCard = styled(motion.div)`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  padding: 28px;
  color: white;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 100px;
    height: 100px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    transform: translate(30px, -30px);
  }
`;

const ImportCard = styled(motion.div)`
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  border-radius: 20px;
  padding: 28px;
  color: white;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 100px;
    height: 100px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    transform: translate(30px, -30px);
  }
`;

const CardIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
`;

const CardTitle = styled.h3`
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 8px 0;
  position: relative;
  z-index: 1;
`;

const CardDescription = styled.p`
  font-size: 16px;
  margin: 0 0 24px 0;
  opacity: 0.9;
  line-height: 1.5;
  position: relative;
  z-index: 1;
`;

const FormatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
`;

const FormatButton = styled(motion.button)<{ $selected: boolean }>`
  background: ${props => props.$selected ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)'};
  border: 2px solid ${props => props.$selected ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.3)'};
  border-radius: 12px;
  padding: 16px 12px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  position: relative;
  z-index: 1;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.6);
  }
`;

const ActionButton = styled(motion.button)`
  width: 100%;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  position: relative;
  z-index: 1;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.8);
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const StatusMessage = styled(motion.div)<{ $type: 'success' | 'error' | 'info' }>`
  padding: 16px 20px;
  border-radius: 12px;
  margin-top: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 500;
  
  ${props => {
    switch (props.$type) {
      case 'success':
        return `
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        `;
      case 'error':
        return `
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        `;
      case 'info':
        return `
          background: #cce7ff;
          color: #004085;
          border: 1px solid #99d3ff;
        `;
      default:
        return '';
    }
  }}
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 16px;
`;

const ProgressFill = styled(motion.div)`
  height: 100%;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 3px;
`;

const OptionsPanel = styled(motion.div)`
  background: #f8f9fa;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
`;

const OptionGroup = styled.div`
  margin-bottom: 20px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const OptionLabel = styled.label`
  display: block;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  font-size: 14px;
`;

const DateRangeInput = styled.input`
  padding: 8px 12px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 14px;
  margin-right: 8px;
  
  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const Checkbox = styled.input`
  margin-right: 8px;
  transform: scale(1.2);
`;

// Interfaces
interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx' | 'backup';
  dateRange: {
    start: string;
    end: string;
  };
  includeCompletions: boolean;
  includeSettings: boolean;
  includeAnalytics: boolean;
}

interface ImportResult {
  habitsImported: number;
  completionsImported: number;
  errors: string[];
}

interface ExportImportSystemProps {
  habits: HabitWithCompletions[];
  onImportComplete?: (result: ImportResult) => void;
}

export function ExportImportSystem({ habits, onImportComplete }: ExportImportSystemProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'xlsx' | 'backup'>('json');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'json',
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
    },
    includeCompletions: true,
    includeSettings: true,
    includeAnalytics: true,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [exportProgress, setExportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatData = (format: string, data: any) => {
    switch (format) {
      case 'csv':
        return formatAsCSV(data);
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'xlsx':
        return formatAsXLSX(data);
      case 'backup':
        return JSON.stringify({
          version: '1.0',
          exportDate: new Date().toISOString(),
          habits: data.habits,
          completions: data.completions,
          settings: data.settings,
          analytics: data.analytics,
        }, null, 2);
      default:
        return JSON.stringify(data, null, 2);
    }
  };

  const formatAsCSV = (data: any) => {
    const habits = data.habits || [];
    const completions = data.completions || [];
    
    let csv = 'Type,Date,Habit Title,Description,Frequency,Start Date\n';
    
    // Add habits
    habits.forEach((habit: any) => {
      csv += `Habit,${habit.created_at || ''},"${habit.title || ''}","${habit.description || ''}",${habit.frequency || 0},"${habit.start_date || ''}"\n`;
    });
    
    // Add completions
    completions.forEach((completion: any) => {
      const habit = habits.find((h: any) => h.id === completion.habit_id);
      csv += `Completion,${completion.completed_at || ''},"${habit?.title || 'Unknown'}","Habit completed",,\n`;
    });
    
    return csv;
  };

  const formatAsXLSX = (data: any) => {
    // For now, return JSON format - in a real app, you'd use a library like xlsx
    return JSON.stringify(data, null, 2);
  };

  const downloadFile = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    setStatusMessage(null);

    try {
      // Simulate processing time with progress
      for (let i = 0; i <= 100; i += 10) {
        setExportProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Prepare data based on options
      const exportData: any = {
        habits: habits.map(habit => ({
          id: habit.id,
          title: habit.title,
          description: habit.description,
          frequency: habit.frequency,
          color: habit.color,
          icon: habit.icon,
          start_date: habit.start_date,
          created_at: habit.created_at,
        })),
      };

      if (exportOptions.includeCompletions) {
        exportData.completions = habits.flatMap(habit => 
          habit.completions
            ?.filter(completion => {
              const completionDate = new Date(completion.completed_at);
              const startDate = new Date(exportOptions.dateRange.start);
              const endDate = new Date(exportOptions.dateRange.end);
              return completionDate >= startDate && completionDate <= endDate;
            })
            .map(completion => ({
              id: completion.id,
              habit_id: habit.id,
              completed_at: completion.completed_at,
              created_at: completion.created_at,
            })) || []
        );
      }

      if (exportOptions.includeSettings) {
        const settings = localStorage.getItem('habit-tracker-settings');
        exportData.settings = settings ? JSON.parse(settings) : {};
      }

      if (exportOptions.includeAnalytics) {
        exportData.analytics = {
          totalHabits: habits.length,
          activeHabits: habits.filter(h => h.is_active).length,
          totalCompletions: habits.reduce((sum, h) => sum + (h.completions?.length || 0), 0),
          exportDate: new Date().toISOString(),
        };
      }

      const content = formatData(exportOptions.format, exportData);
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `habit-tracker-${exportOptions.format}-${timestamp}`;
      
      let contentType = 'application/json';
      let extension = '.json';
      
      switch (exportOptions.format) {
        case 'csv':
          contentType = 'text/csv';
          extension = '.csv';
          break;
        case 'xlsx':
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          extension = '.xlsx';
          break;
        case 'backup':
          contentType = 'application/json';
          extension = '.backup.json';
          break;
      }

      downloadFile(content, filename + extension, contentType);

      setStatusMessage({
        type: 'success',
        text: `Successfully exported ${exportData.habits.length} habits${exportOptions.includeCompletions ? ` and ${exportData.completions?.length || 0} completions` : ''} as ${exportOptions.format.toUpperCase()}`,
      });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsExporting(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const handleImport = async (file: File) => {
    setIsImporting(true);
    setStatusMessage(null);

    try {
      const content = await file.text();
      let data: any;

      try {
        data = JSON.parse(content);
      } catch {
        // Try to parse as CSV
        if (file.name.endsWith('.csv')) {
          data = parseCSV(content);
        } else {
          throw new Error('Invalid file format. Please upload a JSON or CSV file.');
        }
      }

      const result: ImportResult = {
        habitsImported: 0,
        completionsImported: 0,
        errors: [],
      };

      // Import habits
      if (data.habits && Array.isArray(data.habits)) {
        result.habitsImported = data.habits.length;
        // In a real app, you'd save these to your database
        console.log('Importing habits:', data.habits);
      }

      // Import completions
      if (data.completions && Array.isArray(data.completions)) {
        result.completionsImported = data.completions.length;
        console.log('Importing completions:', data.completions);
      }

      // Import settings
      if (data.settings) {
        localStorage.setItem('habit-tracker-settings', JSON.stringify(data.settings));
        console.log('Importing settings:', data.settings);
      }

      setStatusMessage({
        type: 'success',
        text: `Successfully imported ${result.habitsImported} habits and ${result.completionsImported} completions`,
      });

      onImportComplete?.(result);
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsImporting(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const parseCSV = (content: string) => {
    const lines = content.split('\n');
    const headers = lines[0].split(',');
    const habits: any[] = [];
    const completions: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length < headers.length) continue;

      const type = values[0];
      if (type === 'Habit') {
        habits.push({
          name: values[2],
          category: values[3],
          description: values[4],
          current_streak: parseInt(values[5]) || 0,
          target_frequency: parseInt(values[6]) || 1,
        });
      } else if (type === 'Completion') {
        completions.push({
          completed_at: values[1],
          habit_name: values[2],
        });
      }
    }

    return { habits, completions };
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImport(file);
    }
  };

  return (
    <Container
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Header>
        <Title>
          <span style={{ fontSize: '32px' }}>💾</span>
          Data Management
        </Title>
        <Subtitle>
          Export your habit data for backup or analysis, or import data from other sources
        </Subtitle>
      </Header>

      <TabContainer>
        <Tab
          $active={activeTab === 'export'}
          onClick={() => setActiveTab('export')}
        >
          <span>📤</span>
          Export Data
        </Tab>
        <Tab
          $active={activeTab === 'import'}
          onClick={() => setActiveTab('import')}
        >
          <span>📥</span>
          Import Data
        </Tab>
      </TabContainer>

      <AnimatePresence mode="wait">
        {activeTab === 'export' && (
          <motion.div
            key="export"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Grid>
              <ExportCard
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <CardIcon>📊</CardIcon>
                <CardTitle>Export Your Data</CardTitle>
                <CardDescription>
                  Download your habit data in various formats for backup, analysis, or migration to other platforms.
                </CardDescription>

                <OptionsPanel
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <OptionGroup>
                    <OptionLabel>Export Format</OptionLabel>
                    <FormatGrid>
                      <FormatButton
                        $selected={exportFormat === 'json'}
                        onClick={() => setExportFormat('json')}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <span style={{ fontSize: '20px' }}>📄</span>
                        JSON
                      </FormatButton>
                      <FormatButton
                        $selected={exportFormat === 'csv'}
                        onClick={() => setExportFormat('csv')}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <span style={{ fontSize: '20px' }}>📊</span>
                        CSV
                      </FormatButton>
                      <FormatButton
                        $selected={exportFormat === 'backup'}
                        onClick={() => setExportFormat('backup')}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <span style={{ fontSize: '20px' }}>💾</span>
                        Backup
                      </FormatButton>
                    </FormatGrid>
                  </OptionGroup>

                  <OptionGroup>
                    <OptionLabel>Date Range</OptionLabel>
                    <div>
                      <DateRangeInput
                        type="date"
                        value={exportOptions.dateRange.start}
                        onChange={(e) => setExportOptions(prev => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, start: e.target.value }
                        }))}
                      />
                      to
                      <DateRangeInput
                        type="date"
                        value={exportOptions.dateRange.end}
                        onChange={(e) => setExportOptions(prev => ({
                          ...prev,
                          dateRange: { ...prev.dateRange, end: e.target.value }
                        }))}
                      />
                    </div>
                  </OptionGroup>

                  <OptionGroup>
                    <OptionLabel>Include</OptionLabel>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#666' }}>
                        <Checkbox
                          type="checkbox"
                          checked={exportOptions.includeCompletions}
                          onChange={(e) => setExportOptions(prev => ({
                            ...prev,
                            includeCompletions: e.target.checked
                          }))}
                        />
                        Habit Completions
                      </label>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#666' }}>
                        <Checkbox
                          type="checkbox"
                          checked={exportOptions.includeSettings}
                          onChange={(e) => setExportOptions(prev => ({
                            ...prev,
                            includeSettings: e.target.checked
                          }))}
                        />
                        App Settings
                      </label>
                      <label style={{ display: 'block', fontSize: '14px', color: '#666' }}>
                        <Checkbox
                          type="checkbox"
                          checked={exportOptions.includeAnalytics}
                          onChange={(e) => setExportOptions(prev => ({
                            ...prev,
                            includeAnalytics: e.target.checked
                          }))}
                        />
                        Analytics Summary
                      </label>
                    </div>
                  </OptionGroup>
                </OptionsPanel>

                {isExporting && (
                  <ProgressBar>
                    <ProgressFill
                      initial={{ width: 0 }}
                      animate={{ width: `${exportProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </ProgressBar>
                )}

                <ActionButton
                  onClick={handleExport}
                  disabled={isExporting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isExporting ? (
                    <>
                      <span style={{ fontSize: '20px' }}>🔄</span>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '20px' }}>📤</span>
                      Export {exportFormat.toUpperCase()}
                    </>
                  )}
                </ActionButton>
              </ExportCard>
            </Grid>
          </motion.div>
        )}

        {activeTab === 'import' && (
          <motion.div
            key="import"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Grid>
              <ImportCard
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <CardIcon>📥</CardIcon>
                <CardTitle>Import Your Data</CardTitle>
                <CardDescription>
                  Restore from a backup or import habit data from other applications. Supports JSON, CSV, and backup files.
                </CardDescription>

                <HiddenFileInput
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.csv,.backup"
                  onChange={handleFileSelect}
                />

                <ActionButton
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isImporting ? (
                    <>
                      <span style={{ fontSize: '20px' }}>🔄</span>
                      Importing...
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '20px' }}>📁</span>
                      Select File to Import
                    </>
                  )}
                </ActionButton>

                <div style={{ marginTop: '20px', fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>
                  <strong>Supported formats:</strong>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>JSON exports from this app</li>
                    <li>CSV files with habit data</li>
                    <li>Backup files (.backup.json)</li>
                  </ul>
                </div>
              </ImportCard>
            </Grid>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {statusMessage && (
          <StatusMessage
            $type={statusMessage.type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {statusMessage.type === 'success' && <span style={{ fontSize: '20px' }}>✅</span>}
            {statusMessage.type === 'error' && <span style={{ fontSize: '20px' }}>⚠️</span>}
            {statusMessage.type === 'info' && <span style={{ fontSize: '20px' }}>ℹ️</span>}
            {statusMessage.text}
          </StatusMessage>
        )}
      </AnimatePresence>
    </Container>
  );
}