// src/pages/auth/Login.tsx
import React, { useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Grid,
  Link,
  Paper,
  Avatar,
  InputAdornment,
  IconButton,
  Alert,
} from '@mui/material';
import {
  LockOutlined as LockOutlinedIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

interface FormData {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  // Add console logging to help with debugging
  console.log('Login component rendering');
  
  // Try-catch on useAuth to diagnose context issues
  let authContext;
  try {
    authContext = useAuth();
    console.log('Auth context loaded successfully');
  } catch (error) {
    console.error('Error loading auth context:', error);
    // Provide fallback values if auth context fails
    authContext = { login: async () => console.log('Login fallback called') };
  }
  
  const { login } = authContext;
  const navigate = useNavigate();
  const location = useLocation();
  
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
  });
  
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // Get the redirect path from location state or default to '/'
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const toggleShowPassword = () => {
    setShowPassword(prev => !prev);
  };
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Form submitted with:', formData);
    setError('');
    setLoading(true);
    
    try {
      await login(formData.email, formData.password);
      console.log('Login successful, navigating to:', from);
      navigate(from, { replace: true });
    } catch (error: unknown) {
      console.error('Login error:', error);
      setError('Failed to log in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ mt: 8, p: 4 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            Sign in
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={formData.email}
              onChange={handleInputChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleInputChange}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={toggleShowPassword}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <Grid container>
              <Grid item xs>
                <Link component={RouterLink} to="/forgot-password" variant="body2">
                  Forgot password?
                </Link>
              </Grid>
              <Grid item>
                <Link component={RouterLink} to="/register" variant="body2">
                  {"Don't have an account? Sign Up"}
                </Link>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default Login;