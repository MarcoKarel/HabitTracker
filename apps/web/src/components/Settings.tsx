import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { SmartNotifications } from './notifications/SmartNotifications';

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

const SettingsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 30px;
`;

const SettingSection = styled.div`
  border-bottom: 1px solid #f1f3f4;
  padding-bottom: 30px;
  
  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  color: #333;
  margin: 0 0 20px 0;
  font-size: 1.2rem;
  font-weight: 600;
`;

const SettingItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f8f9fa;
  
  &:last-child {
    border-bottom: none;
  }
`;

const SettingInfo = styled.div`
  flex: 1;
`;

const SettingLabel = styled.div`
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
`;

const SettingDescription = styled.div`
  font-size: 14px;
  color: #666;
  line-height: 1.4;
`;

const Toggle = styled.button<{ $active: boolean }>`
  width: 50px;
  height: 28px;
  border-radius: 14px;
  border: none;
  background: ${props => props.$active ? '#667eea' : '#e1e5e9'};
  position: relative;
  cursor: pointer;
  transition: background 0.3s ease;
  
  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${props => props.$active ? '24px' : '2px'};
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: white;
    transition: left 0.3s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
`;

const Select = styled.select`
  padding: 8px 12px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  background: white;
  color: #333;
  font-size: 14px;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const Button = styled(motion.button)`
  padding: 12px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.3s ease;
  
  &:hover {
    background: #5a67d8;
  }
  
  &:disabled {
    background: #e1e5e9;
    color: #999;
    cursor: not-allowed;
  }
`;

const DangerButton = styled(Button)`
  background: #dc3545;
  
  &:hover {
    background: #c82333;
  }
`;

const AccountInfo = styled.div`
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
`;

const AccountItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const AccountLabel = styled.span`
  font-weight: 500;
  color: #333;
`;

const AccountValue = styled.span`
  color: #666;
  font-size: 14px;
`;

interface SettingsData {
  notifications: {
    enabled: boolean;
    dailyReminder: boolean;
    reminderTime: string;
    weeklyReport: boolean;
    streakMilestones: boolean;
  };
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    startOfWeek: 'monday' | 'sunday';
    timeFormat: '12h' | '24h';
    animations: boolean;
    soundEffects: boolean;
  };
  privacy: {
    analytics: boolean;
    crashReports: boolean;
  };
}

export function Settings() {
  const { user, signOut } = useAuth();
  const [settings, setSettings] = useState<SettingsData>({
    notifications: {
      enabled: false,
      dailyReminder: true,
      reminderTime: '09:00',
      weeklyReport: true,
      streakMilestones: true,
    },
    preferences: {
      theme: 'light',
      startOfWeek: 'monday',
      timeFormat: '12h',
      animations: true,
      soundEffects: true,
    },
    privacy: {
      analytics: true,
      crashReports: true,
    },
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('habit-tracker-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Error parsing saved settings:', error);
      }
    }
  }, []);

  const updateSetting = (section: keyof SettingsData, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
    setHasChanges(true);
  };

  const saveSettings = () => {
    localStorage.setItem('habit-tracker-settings', JSON.stringify(settings));
    setHasChanges(false);
    
    // Here you would typically sync with your backend
    console.log('Settings saved:', settings);
  };

  const resetSettings = () => {
    localStorage.removeItem('habit-tracker-settings');
    setSettings({
      notifications: {
        enabled: false,
        dailyReminder: true,
        reminderTime: '09:00',
        weeklyReport: true,
        streakMilestones: true,
      },
      preferences: {
        theme: 'light',
        startOfWeek: 'monday',
        timeFormat: '12h',
        animations: true,
        soundEffects: true,
      },
      privacy: {
        analytics: true,
        crashReports: true,
      },
    });
    setHasChanges(false);
  };

  return (
    <Container
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Header>
        <span style={{ fontSize: '1.5rem' }}>⚙️</span>
        <Title>Settings</Title>
      </Header>

      <SettingsGrid>
        {/* Account Section */}
        <SettingSection>
          <SectionTitle>Account</SectionTitle>
          <AccountInfo>
            <AccountItem>
              <AccountLabel>Email</AccountLabel>
              <AccountValue>{user?.email}</AccountValue>
            </AccountItem>
            <AccountItem>
              <AccountLabel>Member Since</AccountLabel>
              <AccountValue>
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
              </AccountValue>
            </AccountItem>
          </AccountInfo>
          <DangerButton
            onClick={signOut}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Sign Out
          </DangerButton>
        </SettingSection>

        {/* Smart Notifications Section */}
        <SmartNotifications />

        {/* Preferences Section */}
        <SettingSection>
          <SectionTitle>Preferences</SectionTitle>

          <SettingItem>
            <SettingInfo>
              <SettingLabel>Theme</SettingLabel>
              <SettingDescription>Choose your preferred color scheme</SettingDescription>
            </SettingInfo>
            <Select
              value={settings.preferences.theme}
              onChange={(e) => updateSetting('preferences', 'theme', e.target.value)}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </Select>
          </SettingItem>

          <SettingItem>
            <SettingInfo>
              <SettingLabel>Start of Week</SettingLabel>
              <SettingDescription>Which day should be considered the first day of the week</SettingDescription>
            </SettingInfo>
            <Select
              value={settings.preferences.startOfWeek}
              onChange={(e) => updateSetting('preferences', 'startOfWeek', e.target.value)}
            >
              <option value="monday">Monday</option>
              <option value="sunday">Sunday</option>
            </Select>
          </SettingItem>

          <SettingItem>
            <SettingInfo>
              <SettingLabel>Time Format</SettingLabel>
              <SettingDescription>Choose between 12-hour and 24-hour time format</SettingDescription>
            </SettingInfo>
            <Select
              value={settings.preferences.timeFormat}
              onChange={(e) => updateSetting('preferences', 'timeFormat', e.target.value)}
            >
              <option value="12h">12 Hour</option>
              <option value="24h">24 Hour</option>
            </Select>
          </SettingItem>

          <SettingItem>
            <SettingInfo>
              <SettingLabel>Animations</SettingLabel>
              <SettingDescription>Enable smooth animations and transitions</SettingDescription>
            </SettingInfo>
            <Toggle
              $active={settings.preferences.animations}
              onClick={() => updateSetting('preferences', 'animations', !settings.preferences.animations)}
            />
          </SettingItem>

          <SettingItem>
            <SettingInfo>
              <SettingLabel>Sound Effects</SettingLabel>
              <SettingDescription>Play sounds for habit completions and interactions</SettingDescription>
            </SettingInfo>
            <Toggle
              $active={settings.preferences.soundEffects}
              onClick={() => updateSetting('preferences', 'soundEffects', !settings.preferences.soundEffects)}
            />
          </SettingItem>
        </SettingSection>

        {/* Privacy Section */}
        <SettingSection>
          <SectionTitle>Privacy & Data</SectionTitle>

          <SettingItem>
            <SettingInfo>
              <SettingLabel>Analytics</SettingLabel>
              <SettingDescription>Help improve the app by sharing anonymous usage data</SettingDescription>
            </SettingInfo>
            <Toggle
              $active={settings.privacy.analytics}
              onClick={() => updateSetting('privacy', 'analytics', !settings.privacy.analytics)}
            />
          </SettingItem>

          <SettingItem>
            <SettingInfo>
              <SettingLabel>Crash Reports</SettingLabel>
              <SettingDescription>Automatically send crash reports to help fix bugs</SettingDescription>
            </SettingInfo>
            <Toggle
              $active={settings.privacy.crashReports}
              onClick={() => updateSetting('privacy', 'crashReports', !settings.privacy.crashReports)}
            />
          </SettingItem>
        </SettingSection>

        {/* Save/Reset Section */}
        <SettingSection>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button
              onClick={resetSettings}
              style={{ background: '#6c757d' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Reset to Defaults
            </Button>
            <Button
              onClick={saveSettings}
              disabled={!hasChanges}
              whileHover={{ scale: hasChanges ? 1.02 : 1 }}
              whileTap={{ scale: hasChanges ? 0.98 : 1 }}
            >
              {hasChanges ? 'Save Changes' : 'Saved'}
            </Button>
          </div>
        </SettingSection>
      </SettingsGrid>
    </Container>
  );
}