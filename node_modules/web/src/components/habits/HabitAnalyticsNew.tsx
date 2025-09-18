import { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { AdvancedCharts } from '../analytics/AdvancedCharts';
import { SmartInsights } from '../analytics/SmartInsights';
import type { HabitWithCompletions } from '@habit-tracker/shared';

interface HabitAnalyticsProps {
  habits: HabitWithCompletions[];
}

const Container = styled(motion.div)`
  padding: 24px;
  min-height: 100vh;
  background: #f8f9fa;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 40px;
`;

const Title = styled.h1`
  font-size: 36px;
  font-weight: 800;
  color: #333;
  margin: 0 0 12px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Subtitle = styled.p`
  font-size: 18px;
  color: #666;
  margin: 0;
  font-weight: 500;
`;

export function HabitAnalytics({ habits }: HabitAnalyticsProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  return (
    <Container
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <Header>
        <Title>📊 Analytics Dashboard</Title>
        <Subtitle>
          Deep insights into your habit-building journey
        </Subtitle>
      </Header>

      <SmartInsights habits={habits} />
      
      <AdvancedCharts 
        habits={habits}
        selectedTimeRange={selectedTimeRange}
        onTimeRangeChange={setSelectedTimeRange}
      />
    </Container>
  );
}