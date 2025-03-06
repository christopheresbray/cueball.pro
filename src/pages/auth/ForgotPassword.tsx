import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
  Alert,
} from '@mui/material';
import { LockReset as LockResetIcon } from '@mui/icons-material';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase/config';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);
    
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (error: unknown) {
      console.error('Password reset error:', error);
      setError('Failed to send password reset email. Please check your email address.');
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
            <LockResetIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            Reset Password
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ width: '100%', mt: 2 }}>
              Password reset email sent! Check your inbox for further instructions.
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
              value={email}
              onChange={handleInputChange}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading || success}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
            <Grid container>
              <Grid item xs>
                <Link component={RouterLink} to="/login" variant="body2">
                  Back to login
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

export default ForgotPassword;