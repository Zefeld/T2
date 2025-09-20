import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, AppBar, Toolbar, Typography, Button, Container } from '@mui/material';
import HRDashboard from './components/hr/HRDashboard';
import EmployeeDashboard from './components/employee/EmployeeDashboard';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

type UserRole = 'hr' | 'employee' | null;

function App() {
  const [userRole, setUserRole] = useState<UserRole>(null);

  const handleRoleSelect = (role: UserRole) => {
    setUserRole(role);
  };

  const handleLogout = () => {
    setUserRole(null);
  };

  if (!userRole) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          <Container maxWidth="sm">
            <Box
              sx={{
                backgroundColor: 'white',
                borderRadius: 4,
                p: 6,
                textAlign: 'center',
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              }}
            >
              <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold', color: '#333' }}>
                T2 Platform
              </Typography>
              <Typography variant="h6" gutterBottom sx={{ color: '#666', mb: 4 }}>
                Выберите вашу роль для входа в систему
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => handleRoleSelect('hr')}
                  sx={{
                    py: 2,
                    px: 4,
                    borderRadius: 3,
                    fontSize: '1.1rem',
                    textTransform: 'none',
                    background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                    boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
                  }}
                >
                  HR Менеджер
                </Button>
                
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => handleRoleSelect('employee')}
                  sx={{
                    py: 2,
                    px: 4,
                    borderRadius: 3,
                    fontSize: '1.1rem',
                    textTransform: 'none',
                    background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                    boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                  }}
                >
                  Сотрудник
                </Button>
              </Box>
              
              <Typography variant="body2" sx={{ mt: 4, color: '#999' }}>
                Демо-версия платформы управления талантами
              </Typography>
            </Box>
          </Container>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {userRole === 'hr' && <HRDashboard />}
      {userRole === 'employee' && <EmployeeDashboard />}
      
      {/* Logout Button - можно добавить в любой компонент */}
      <Box sx={{ position: 'fixed', top: 10, right: 10, zIndex: 9999 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={handleLogout}
          sx={{ 
            backgroundColor: 'rgba(255,255,255,0.9)',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,1)',
            }
          }}
        >
          Сменить роль
        </Button>
      </Box>
    </ThemeProvider>
  );
}

export default App;