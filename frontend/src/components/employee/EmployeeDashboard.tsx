import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Grid,
  LinearProgress,
  IconButton,
  Tooltip,
  Badge,
  Drawer,
  AppBar,
  Toolbar,
  CssBaseline,
  ListItemButton,
  Collapse,
  Alert,
  Fab,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  Psychology as PsychologyIcon,
  Map as MapIcon,
  TrendingUp as TrendingUpIcon,
  School as SchoolIcon,
  Work as WorkIcon,
  Star as StarIcon,
  EmojiEvents as TrophyIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  ExpandLess,
  ExpandMore,
  Lightbulb as LightbulbIcon,
  Timeline as TimelineIcon,
  Groups as GroupsIcon,
  Chat as ChatIcon,
  Help as HelpIcon,
  Logout as LogoutIcon,
  AccountCircle as AccountCircleIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon
} from '@mui/icons-material';
import CareerCopilot from './CareerCopilot';
import ProgressMap from './ProgressMap';
import EmployeeProfile from './EmployeeProfile';

const drawerWidth = 280;

interface QuickStat {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: number;
}

interface RecentActivity {
  id: string;
  type: 'achievement' | 'skill' | 'goal' | 'project';
  title: string;
  description: string;
  timestamp: Date;
  icon: React.ReactNode;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
}

const EmployeeDashboard: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);
  const [notificationMenuAnchor, setNotificationMenuAnchor] = useState<null | HTMLElement>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  // Mock data
  const quickStats: QuickStat[] = [
    {
      label: 'Текущий уровень',
      value: 12,
      icon: <TrendingUpIcon />,
      color: 'primary',
      trend: 8
    },
    {
      label: 'Активные цели',
      value: 3,
      icon: <AssignmentIcon />,
      color: 'info',
      trend: 0
    },
    {
      label: 'Завершенные навыки',
      value: 8,
      icon: <CheckCircleIcon />,
      color: 'success',
      trend: 2
    },
    {
      label: 'Достижения',
      value: 15,
      icon: <TrophyIcon />,
      color: 'warning',
      trend: 1
    }
  ];

  const recentActivities: RecentActivity[] = [
    {
      id: '1',
      type: 'achievement',
      title: 'Новое достижение!',
      description: 'Получен бейдж "React Master"',
      timestamp: new Date('2024-01-15T10:30:00'),
      icon: <TrophyIcon color="warning" />
    },
    {
      id: '2',
      type: 'skill',
      title: 'Навык обновлен',
      description: 'TypeScript повышен до уровня 4',
      timestamp: new Date('2024-01-14T15:20:00'),
      icon: <SchoolIcon color="primary" />
    },
    {
      id: '3',
      type: 'goal',
      title: 'Прогресс по цели',
      description: 'Цель "Стать Tech Lead" - 65% выполнено',
      timestamp: new Date('2024-01-13T09:15:00'),
      icon: <TimelineIcon color="info" />
    },
    {
      id: '4',
      type: 'project',
      title: 'Проект завершен',
      description: 'E-commerce Platform успешно запущен',
      timestamp: new Date('2024-01-12T16:45:00'),
      icon: <WorkIcon color="success" />
    }
  ];

  const notifications: Notification[] = [
    {
      id: '1',
      title: 'Новая рекомендация',
      message: 'Career Copilot предлагает изучить System Design',
      type: 'info',
      timestamp: new Date('2024-01-15T11:00:00'),
      read: false
    },
    {
      id: '2',
      title: 'Цель близка к завершению',
      message: 'До завершения цели "Изучить React Advanced" осталось 10%',
      type: 'success',
      timestamp: new Date('2024-01-15T09:30:00'),
      read: false
    },
    {
      id: '3',
      title: 'Напоминание',
      message: 'Не забудьте обновить свой профиль',
      type: 'warning',
      timestamp: new Date('2024-01-14T14:20:00'),
      read: true
    }
  ];

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Главная',
      icon: <DashboardIcon />,
      component: null
    },
    {
      id: 'career',
      label: 'Карьерное развитие',
      icon: <PsychologyIcon />,
      children: [
        {
          id: 'copilot',
          label: 'Career Copilot',
          icon: <PsychologyIcon />,
          component: CareerCopilot
        },
        {
          id: 'progress-map',
          label: 'Progress Map',
          icon: <MapIcon />,
          component: ProgressMap
        }
      ]
    },
    {
      id: 'profile',
      label: 'Профиль',
      icon: <PersonIcon />,
      component: EmployeeProfile
    },
    {
      id: 'team',
      label: 'Команда',
      icon: <GroupsIcon />,
      component: null
    },
    {
      id: 'help',
      label: 'Помощь',
      icon: <HelpIcon />,
      component: null
    }
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (menuId: string) => {
    if (menuId === expandedMenu) {
      setExpandedMenu(null);
    } else {
      const menuItem = menuItems.find(item => item.id === menuId);
      if (menuItem?.children) {
        setExpandedMenu(menuId);
      } else {
        setCurrentView(menuId);
        setExpandedMenu(null);
        setMobileOpen(false);
      }
    }
  };

  const handleSubMenuClick = (menuId: string) => {
    setCurrentView(menuId);
    setMobileOpen(false);
  };

  const unreadNotifications = notifications.filter(n => !n.read).length;

  const drawer = (
    <Box>
      <Toolbar>
        <Box display="flex" alignItems="center" width="100%">
          <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
            <PersonIcon />
          </Avatar>
          <Box>
            <Typography variant="subtitle1" noWrap>
              Алексей Иванов
            </Typography>
            <Typography variant="caption" color="textSecondary" noWrap>
              Senior Frontend Developer
            </Typography>
          </Box>
        </Box>
      </Toolbar>
      
      <Divider />
      
      <List>
        {menuItems.map((item) => (
          <Box key={item.id}>
            <ListItemButton
              onClick={() => handleMenuClick(item.id)}
              selected={currentView === item.id || (item.children && item.children.some(child => child.id === currentView))}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
              {item.children && (
                expandedMenu === item.id ? <ExpandLess /> : <ExpandMore />
              )}
            </ListItemButton>
            
            {item.children && (
              <Collapse in={expandedMenu === item.id} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {item.children.map((child) => (
                    <ListItemButton
                      key={child.id}
                      sx={{ pl: 4 }}
                      onClick={() => handleSubMenuClick(child.id)}
                      selected={currentView === child.id}
                    >
                      <ListItemIcon>
                        {child.icon}
                      </ListItemIcon>
                      <ListItemText primary={child.label} />
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            )}
          </Box>
        ))}
      </List>
      
      <Divider />
      
      <List>
        <ListItemButton>
          <ListItemIcon>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText primary="Настройки" />
        </ListItemButton>
        
        <ListItemButton>
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Выйти" />
        </ListItemButton>
      </List>
    </Box>
  );

  const renderDashboard = () => (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Welcome Section */}
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Добро пожаловать, Алексей! 👋
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Вот что происходит с вашим карьерным развитием
        </Typography>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={3} mb={4}>
        {quickStats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h4" color={`${stat.color}.main`}>
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {stat.label}
                    </Typography>
                    {stat.trend !== undefined && stat.trend > 0 && (
                      <Typography variant="caption" color="success.main">
                        +{stat.trend} за неделю
                      </Typography>
                    )}
                  </Box>
                  <Avatar sx={{ bgcolor: `${stat.color}.light` }}>
                    {stat.icon}
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Activity */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Недавняя активность
            </Typography>
            
            <List>
              {recentActivities.map((activity, index) => (
                <Box key={activity.id}>
                  <ListItem>
                    <ListItemIcon>
                      {activity.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={activity.title}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            {activity.description}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {activity.timestamp.toLocaleString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < recentActivities.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
            
            <Box mt={2} textAlign="center">
              <Button variant="outlined">
                Показать все
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Quick Actions & Progress */}
        <Grid item xs={12} md={4}>
          {/* Quick Actions */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Быстрые действия
            </Typography>
            
            <Box display="flex" flexDirection="column" gap={2}>
              <Button 
                variant="contained" 
                startIcon={<PsychologyIcon />}
                onClick={() => setCurrentView('copilot')}
                fullWidth
              >
                Открыть Career Copilot
              </Button>
              
              <Button 
                variant="outlined" 
                startIcon={<MapIcon />}
                onClick={() => setCurrentView('progress-map')}
                fullWidth
              >
                Посмотреть Progress Map
              </Button>
              
              <Button 
                variant="outlined" 
                startIcon={<PersonIcon />}
                onClick={() => setCurrentView('profile')}
                fullWidth
              >
                Редактировать профиль
              </Button>
              
              <Button 
                variant="outlined" 
                startIcon={<AssignmentIcon />}
                fullWidth
              >
                Добавить цель
              </Button>
            </Box>
          </Paper>

          {/* Current Goal Progress */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Текущая цель
            </Typography>
            
            <Box mb={2}>
              <Typography variant="subtitle1" gutterBottom>
                Стать Tech Lead
              </Typography>
              <Typography variant="body2" color="textSecondary" mb={2}>
                Развитие лидерских навыков и технической экспертизы
              </Typography>
              
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2">
                  Прогресс
                </Typography>
                <Typography variant="body2" color="primary">
                  65%
                </Typography>
              </Box>
              
              <LinearProgress 
                variant="determinate" 
                value={65}
                sx={{ mb: 2 }}
              />
              
              <Typography variant="caption" color="textSecondary">
                Цель: Сентябрь 2024
              </Typography>
            </Box>
            
            <Button 
              variant="outlined" 
              size="small"
              onClick={() => setCurrentView('copilot')}
              fullWidth
            >
              Получить рекомендации
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );

  const renderCurrentView = () => {
    const currentMenuItem = menuItems
      .flatMap(item => item.children ? item.children : [item])
      .find(item => item.id === currentView);

    if (currentView === 'dashboard') {
      return renderDashboard();
    }

    if (currentMenuItem?.component) {
      const Component = currentMenuItem.component;
      return <Component />;
    }

    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4">
          {currentMenuItem?.label || 'Страница не найдена'}
        </Typography>
        <Typography variant="body1" color="textSecondary" mt={2}>
          Эта функция находится в разработке.
        </Typography>
      </Container>
    );
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Employee Dashboard
          </Typography>
          
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton
              color="inherit"
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
            
            <IconButton
              color="inherit"
              onClick={(e) => setNotificationMenuAnchor(e.currentTarget)}
            >
              <Badge badgeContent={unreadNotifications} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
            
            <IconButton
              color="inherit"
              onClick={(e) => setProfileMenuAnchor(e.currentTarget)}
            >
              <AccountCircleIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        {renderCurrentView()}
      </Box>

      {/* Notification Menu */}
      <Menu
        anchorEl={notificationMenuAnchor}
        open={Boolean(notificationMenuAnchor)}
        onClose={() => setNotificationMenuAnchor(null)}
        PaperProps={{
          sx: { width: 320, maxHeight: 400 }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Уведомления
          </Typography>
        </Box>
        <Divider />
        
        {notifications.map((notification) => (
          <MenuItem key={notification.id} sx={{ whiteSpace: 'normal', py: 2 }}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {notification.title}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {notification.message}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {notification.timestamp.toLocaleString()}
              </Typography>
            </Box>
          </MenuItem>
        ))}
        
        <Divider />
        <MenuItem onClick={() => setNotificationMenuAnchor(null)}>
          <Typography variant="body2" color="primary">
            Показать все уведомления
          </Typography>
        </MenuItem>
      </Menu>

      {/* Profile Menu */}
      <Menu
        anchorEl={profileMenuAnchor}
        open={Boolean(profileMenuAnchor)}
        onClose={() => setProfileMenuAnchor(null)}
      >
        <MenuItem onClick={() => {
          setCurrentView('profile');
          setProfileMenuAnchor(null);
        }}>
          <ListItemIcon>
            <PersonIcon />
          </ListItemIcon>
          Профиль
        </MenuItem>
        
        <MenuItem onClick={() => setProfileMenuAnchor(null)}>
          <ListItemIcon>
            <SettingsIcon />
          </ListItemIcon>
          Настройки
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={() => setProfileMenuAnchor(null)}>
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          Выйти
        </MenuItem>
      </Menu>

      {/* Floating Chat Button */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setCurrentView('copilot')}
      >
        <Badge badgeContent={1} color="error">
          <ChatIcon />
        </Badge>
      </Fab>
    </Box>
  );
};

export default EmployeeDashboard;