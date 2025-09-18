import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const Card = styled(motion.div)`
  background: white;
  padding: 40px;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  text-align: center;
`;

const Spinner = styled(motion.div)`
  width: 40px;
  height: 40px;
  border: 4px solid #e1e5e9;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  margin: 0 auto 20px;
`;

const Message = styled.p`
  color: #666;
  font-size: 16px;
`;

export function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check for error parameters
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (error) {
          console.error('Auth error:', error, errorDescription);
          navigate('/auth?error=' + encodeURIComponent(errorDescription || error));
          return;
        }

        // Check for access token or success indicators
        const accessToken = searchParams.get('access_token');
        const type = searchParams.get('type');
        
        if (accessToken || type === 'recovery') {
          // Auth was successful, redirect to dashboard
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        } else {
          // No clear success or error, redirect to auth
          setTimeout(() => {
            navigate('/auth');
          }, 2000);
        }
      } catch (error) {
        console.error('Error handling auth callback:', error);
        navigate('/auth?error=' + encodeURIComponent('Authentication failed'));
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);

  return (
    <Container>
      <Card
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Spinner
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <Message>Completing authentication...</Message>
      </Card>
    </Container>
  );
}