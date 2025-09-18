import { useState } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { useAuth } from '../../context/AuthContext';
import { validateEmail, validatePassword } from '@habit-tracker/shared';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
`;

const Card = styled(motion.div)`
  background: white;
  padding: 40px;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
`;

const Title = styled.h1`
  text-align: center;
  margin-bottom: 30px;
  color: #333;
  font-size: 2rem;
  font-weight: bold;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Input = styled.input`
  padding: 15px;
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

const Button = styled(motion.button)`
  padding: 15px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const OAuthButton = styled(motion.button)`
  padding: 15px;
  background: white;
  color: #333;
  border: 2px solid #e1e5e9;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: #667eea;
    background: #f8f9fa;
  }
`;

const Divider = styled.div`
  text-align: center;
  margin: 20px 0;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: #e1e5e9;
  }
  
  span {
    background: white;
    padding: 0 15px;
    color: #666;
  }
`;

const ErrorMessage = styled.div`
  color: #ef4444;
  font-size: 14px;
  margin-top: 5px;
`;

const SuccessMessage = styled.div`
  color: #22c55e;
  font-size: 14px;
  margin-top: 5px;
`;

const LinkButton = styled.button`
  background: none;
  border: none;
  color: #667eea;
  cursor: pointer;
  text-decoration: underline;
  font-size: 14px;
  margin-top: 20px;
`;

const ValidationErrors = styled.ul`
  color: #ef4444;
  font-size: 14px;
  margin: 5px 0;
  padding-left: 20px;
`;

interface AuthFormProps {
  mode: 'signin' | 'signup';
  onModeChange: (mode: 'signin' | 'signup') => void;
}

export function AuthForm({ mode, onModeChange }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const { signIn, signUp, signInWithGoogle, signInWithGitHub } = useAuth();

  const validateForm = () => {
    const errors: string[] = [];
    
    if (!validateEmail(email)) {
      errors.push('Please enter a valid email address');
    }
    
    if (mode === 'signup') {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        errors.push(...passwordValidation.errors);
      }
      
      if (username && username.trim().length < 2) {
        errors.push('Username must be at least 2 characters long');
      }
    } else {
      if (password.length < 1) {
        errors.push('Password is required');
      }
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      if (mode === 'signin') {
        const result = await signIn(email, password);
        if (!result.success) {
          setError(result.error || 'Sign in failed');
        }
      } else {
        const result = await signUp(email, password, username || undefined);
        if (result.success) {
          setSuccess('Account created! Please check your email to verify your account.');
          setEmail('');
          setPassword('');
          setUsername('');
        } else {
          setError(result.error || 'Sign up failed');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Card
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Title>{mode === 'signin' ? 'Welcome Back' : 'Create Account'}</Title>
        
        <Form onSubmit={handleSubmit}>
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={validationErrors.some(e => e.includes('email')) ? 'error' : ''}
            required
          />
          
          {mode === 'signup' && (
            <Input
              type="text"
              placeholder="Username (optional)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={validationErrors.some(e => e.includes('Username')) ? 'error' : ''}
            />
          )}
          
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={validationErrors.some(e => e.includes('Password')) ? 'error' : ''}
            required
          />
          
          {validationErrors.length > 0 && (
            <ValidationErrors>
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ValidationErrors>
          )}
          
          {error && <ErrorMessage>{error}</ErrorMessage>}
          {success && <SuccessMessage>{success}</SuccessMessage>}
          
          <Button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </Button>
        </Form>
        
        <Divider>
          <span>or</span>
        </Divider>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <OAuthButton
            type="button"
            onClick={signInWithGoogle}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>🔍</span>
            Continue with Google
          </OAuthButton>
          
          <OAuthButton
            type="button"
            onClick={signInWithGitHub}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>🐙</span>
            Continue with GitHub
          </OAuthButton>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <LinkButton
            type="button"
            onClick={() => onModeChange(mode === 'signin' ? 'signup' : 'signin')}
          >
            {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </LinkButton>
        </div>
      </Card>
    </Container>
  );
}