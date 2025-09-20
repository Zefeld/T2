import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Tab,
  Tabs,
  IconButton,
  Badge,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  People as PeopleIcon,
  Work as WorkIcon,
  Analytics as AnalyticsIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  Assignment as AssignmentIcon,
  Notifications as NotificationsIcon,
  FilterList as FilterListIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface HRStats {
  totalEmployees: number;
  activeVacancies: number;
  pendingMatches: number;
  avgMatchTime: number;
  profileCompleteness: number;
  internalMobility: number;
}

interface RecentActivity {
  id: string;
  type: 'match' | 'profile_update' | 'quest_completion' | 'new_vacancy';
  title: string;
  description: string;
  timestamp: string;
  employee?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface QuickMatch {
  vacancyId: string;
  title: string;
  department: string;
  candidatesCount: number;
  topCandidates: Array<{
    id: string;
    name: string;
    score: number;
    avatar?: string;
  }>;
}

const HRDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState<HRStats>({
    totalEmployees: 1247,
    activeVacancies: 23,
    pendingMatches: 156,
    avgMatchTime: 3.2,
    profileCompleteness: 78,
    internalMobility: 15
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([
    {
      id: '1',
      type: 'match',
      title: 'Новый матч найден',
      description: 'Senior Developer - 95% соответствие',
      timestamp: '5 минут назад',
      employee: {
        id: 'emp1',
        name: 'Анна Петрова',
        avatar: '/avatars/anna.jpg'
      }
    },
    {
      id: '2',
      type: 'profile_update',
      title: 'Профиль обновлен',
      description: 'Добавлены новые навыки: React, TypeScript',
      timestamp: '15 минут назад',
      employee: {
        id: 'emp2',
        name: 'Михаил Сидоров'
      }
    },
    {
      id: '3',
      type: 'quest_completion',
      title: 'Квест завершен',
      description: 'Career Quest: "Заполни профиль"',
      timestamp: '1 час назад',
      employee: {
        id: 'emp3',
        name: 'Елена Козлова'
      }
    },
    {
      id: '4',
      type: 'new_vacancy',
      title: 'Новая вакансия',
      description: 'Product Manager - IT отдел',
      timestamp: '2 часа назад'
    }
  ]);

  const [quickMatches, setQuickMatches] = useState<QuickMatch[]>([
    {
      vacancyId: 'vac1',
      title: 'Senior Frontend Developer',
      department: 'IT',
      candidatesCount: 12,
      topCandidates: [
        { id: 'emp1', name: 'Анна Петрова', score: 95 },
        { id: 'emp2', name: 'Игорь Волков', score: 89 },
        { id: 'emp3', name: 'Мария Белова', score: 87 }
      ]
    },
    {
      vacancyId: 'vac2',
      title: 'Data Scientist',
      department: 'Analytics',
      candidatesCount: 8,
      topCandidates: [
        { id: 'emp4', name: 'Дмитрий Орлов', score: 92 },
        { id: 'emp5', name: 'Светлана Попова', score: 88 }
      ]
    }
  ]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'match':
        return <StarIcon color="primary" />;
      case 'profile_update':
        return <PeopleIcon color="info" />;
      case 'quest_completion':
        return <AssignmentIcon color="success" />;
      case 'new_vacancy':
        return <WorkIcon color="warning" />;
      default:
        return <NotificationsIcon />;
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color: 'primary' | 'secondary' | 'success' | 'warning' | 'info';
    trend?: number;
  }> = ({ title, value, subtitle, icon, color, trend }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
            {subtitle && (
              <Typography color="textSecondary" variant="body2">
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Box display="flex" alignItems="center" mt={1}>
                <TrendingUpIcon 
                  fontSize="small" 
                  color={trend > 0 ? 'success' : 'error'} 
                />
                <Typography 
                  variant="body2" 
                  color={trend > 0 ? 'success.main' : 'error.main'}
                  ml={0.5}
                >
                  {trend > 0 ? '+' : ''}{trend}%
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar sx={{ bgcolor: `${color}.main`, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          HR Dashboard
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Управление талантами и внутренней мобильностью
        </Typography>
      </Box>

      {/* Quick Actions */}
      <Box mb={4}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={() => navigate('/hr/search')}
              sx={{ py: 1.5 }}
            >
              Поиск кандидатов
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<WorkIcon />}
              onClick={() => navigate('/hr/vacancy-check')}
              sx={{ py: 1.5 }}
            >
              One-click Check
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<AnalyticsIcon />}
              onClick={() => navigate('/hr/analytics')}
              sx={{ py: 1.5 }}
            >
              Аналитика
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterListIcon />}
              onClick={() => navigate('/hr/shortlist')}
              sx={{ py: 1.5 }}
            >
              Shortlist
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Сотрудники"
            value={stats.totalEmployees}
            icon={<PeopleIcon />}
            color="primary"
            trend={5}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Активные вакансии"
            value={stats.activeVacancies}
            icon={<WorkIcon />}
            color="warning"
            trend={-12}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Ожидающие матчи"
            value={stats.pendingMatches}
            icon={<StarIcon />}
            color="info"
            trend={8}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Среднее время матчинга"
            value={`${stats.avgMatchTime} дня`}
            icon={<SpeedIcon />}
            color="success"
            trend={-15}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Заполненность профилей"
            value={`${stats.profileCompleteness}%`}
            icon={<AssignmentIcon />}
            color="secondary"
            trend={12}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            title="Внутренняя мобильность"
            value={`${stats.internalMobility}%`}
            icon={<TrendingUpIcon />}
            color="primary"
            trend={3}
          />
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '500px' }}>
            <Typography variant="h6" gutterBottom>
              Последняя активность
            </Typography>
            <List sx={{ maxHeight: '400px', overflow: 'auto' }}>
              {recentActivity.map((activity, index) => (
                <React.Fragment key={activity.id}>
                  <ListItem alignItems="flex-start">
                    <ListItemAvatar>
                      {activity.employee ? (
                        <Avatar src={activity.employee.avatar}>
                          {activity.employee.name.charAt(0)}
                        </Avatar>
                      ) : (
                        <Avatar>
                          {getActivityIcon(activity.type)}
                        </Avatar>
                      )}
                    </ListItemAvatar>
                    <ListItemText
                      primary={activity.title}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="textPrimary">
                            {activity.description}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {activity.timestamp}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < recentActivity.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Quick Matches */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '500px' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Быстрые матчи
              </Typography>
              <Button 
                size="small" 
                onClick={() => navigate('/hr/search')}
              >
                Показать все
              </Button>
            </Box>
            
            <Box sx={{ maxHeight: '400px', overflow: 'auto' }}>
              {quickMatches.map((match) => (
                <Card key={match.vacancyId} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {match.title}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {match.department}
                        </Typography>
                      </Box>
                      <Chip 
                        label={`${match.candidatesCount} кандидатов`}
                        size="small"
                        color="primary"
                      />
                    </Box>
                    
                    <Typography variant="body2" gutterBottom>
                      Топ кандидаты:
                    </Typography>
                    
                    {match.topCandidates.map((candidate, index) => (
                      <Box 
                        key={candidate.id}
                        display="flex" 
                        alignItems="center" 
                        justifyContent="space-between"
                        py={0.5}
                      >
                        <Box display="flex" alignItems="center">
                          <Avatar 
                            sx={{ width: 24, height: 24, mr: 1, fontSize: '0.75rem' }}
                            src={candidate.avatar}
                          >
                            {candidate.name.charAt(0)}
                          </Avatar>
                          <Typography variant="body2">
                            {candidate.name}
                          </Typography>
                        </Box>
                        <Chip 
                          label={`${candidate.score}%`}
                          size="small"
                          color={candidate.score >= 90 ? 'success' : candidate.score >= 80 ? 'warning' : 'default'}
                        />
                      </Box>
                    ))}
                    
                    <Box mt={2}>
                      <Button 
                        size="small" 
                        variant="outlined"
                        onClick={() => navigate(`/hr/vacancy/${match.vacancyId}/matches`)}
                      >
                        Посмотреть всех
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Profile Completeness Alert */}
      {stats.profileCompleteness < 80 && (
        <Box mt={3}>
          <Alert 
            severity="warning" 
            action={
              <Button color="inherit" size="small" onClick={() => navigate('/hr/analytics')}>
                Подробнее
              </Button>
            }
          >
            Заполненность профилей ниже целевого показателя (80%). 
            Рекомендуется запустить кампанию по мотивации сотрудников.
          </Alert>
        </Box>
      )}
    </Container>
  );
};

export default HRDashboard;