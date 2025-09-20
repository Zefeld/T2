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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Badge,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Rating,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Star as StarIcon,
  EmojiEvents as TrophyIcon,
  School as SchoolIcon,
  Work as WorkIcon,
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Language as LanguageIcon,
  Psychology as PsychologyIcon,
  Groups as GroupsIcon,
  Visibility as VisibilityIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  PhotoCamera as PhotoCameraIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

interface EmployeeProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  location: string;
  startDate: Date;
  avatar: string;
  bio: string;
  level: number;
  totalXP: number;
  nextLevelXP: number;
  currentLevelXP: number;
}

interface Skill {
  id: string;
  name: string;
  category: string;
  level: number;
  maxLevel: number;
  endorsements: number;
  lastUpdated: Date;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt: Date;
  xpReward: number;
  category: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  role: string;
  technologies: string[];
  startDate: Date;
  endDate?: Date;
  status: 'active' | 'completed' | 'paused';
  teamSize: number;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  progress: number;
  status: 'active' | 'completed' | 'paused';
  category: 'skill' | 'career' | 'project';
}

const EmployeeProfile: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [profileData, setProfileData] = useState<EmployeeProfile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  // Mock data
  const mockProfile: EmployeeProfile = {
    id: '1',
    firstName: 'Алексей',
    lastName: 'Иванов',
    email: 'alexey.ivanov@company.com',
    phone: '+7 (999) 123-45-67',
    position: 'Senior Frontend Developer',
    department: 'Engineering',
    location: 'Москва, Россия',
    startDate: new Date('2022-03-15'),
    avatar: '/api/placeholder/150/150',
    bio: 'Опытный фронтенд-разработчик с 5+ годами опыта в React и TypeScript. Увлекаюсь современными технологиями и люблю делиться знаниями с командой.',
    level: 12,
    totalXP: 15750,
    nextLevelXP: 17000,
    currentLevelXP: 15000
  };

  const mockSkills: Skill[] = [
    {
      id: '1',
      name: 'React',
      category: 'Frontend',
      level: 5,
      maxLevel: 5,
      endorsements: 12,
      lastUpdated: new Date('2024-01-15')
    },
    {
      id: '2',
      name: 'TypeScript',
      category: 'Programming',
      level: 4,
      maxLevel: 5,
      endorsements: 8,
      lastUpdated: new Date('2024-01-10')
    },
    {
      id: '3',
      name: 'System Design',
      category: 'Architecture',
      level: 3,
      maxLevel: 5,
      endorsements: 5,
      lastUpdated: new Date('2024-01-05')
    },
    {
      id: '4',
      name: 'Leadership',
      category: 'Soft Skills',
      level: 3,
      maxLevel: 5,
      endorsements: 7,
      lastUpdated: new Date('2024-01-20')
    },
    {
      id: '5',
      name: 'Node.js',
      category: 'Backend',
      level: 3,
      maxLevel: 5,
      endorsements: 4,
      lastUpdated: new Date('2023-12-20')
    }
  ];

  const mockAchievements: Achievement[] = [
    {
      id: '1',
      title: 'React Master',
      description: 'Достиг максимального уровня в React',
      icon: '⚛️',
      rarity: 'epic',
      unlockedAt: new Date('2024-01-15'),
      xpReward: 500,
      category: 'Technical'
    },
    {
      id: '2',
      title: 'Code Reviewer',
      description: 'Провел 100+ код-ревью',
      icon: '👁️',
      rarity: 'rare',
      unlockedAt: new Date('2024-01-10'),
      xpReward: 300,
      category: 'Collaboration'
    },
    {
      id: '3',
      title: 'Mentor',
      description: 'Помог развитию 5+ джуниоров',
      icon: '🎓',
      rarity: 'rare',
      unlockedAt: new Date('2024-01-05'),
      xpReward: 400,
      category: 'Leadership'
    },
    {
      id: '4',
      title: 'Bug Hunter',
      description: 'Нашел и исправил 50+ багов',
      icon: '🐛',
      rarity: 'common',
      unlockedAt: new Date('2023-12-20'),
      xpReward: 200,
      category: 'Quality'
    }
  ];

  const mockProjects: Project[] = [
    {
      id: '1',
      name: 'E-commerce Platform',
      description: 'Разработка современной платформы электронной коммерции',
      role: 'Lead Frontend Developer',
      technologies: ['React', 'TypeScript', 'Redux', 'Material-UI'],
      startDate: new Date('2023-09-01'),
      endDate: new Date('2024-02-01'),
      status: 'completed',
      teamSize: 8
    },
    {
      id: '2',
      name: 'Mobile App Redesign',
      description: 'Редизайн мобильного приложения компании',
      role: 'Senior Developer',
      technologies: ['React Native', 'TypeScript', 'Expo'],
      startDate: new Date('2024-01-15'),
      status: 'active',
      teamSize: 5
    },
    {
      id: '3',
      name: 'Internal Dashboard',
      description: 'Внутренняя панель аналитики для HR',
      role: 'Frontend Developer',
      technologies: ['React', 'D3.js', 'Chart.js'],
      startDate: new Date('2023-06-01'),
      endDate: new Date('2023-08-30'),
      status: 'completed',
      teamSize: 3
    }
  ];

  const mockGoals: Goal[] = [
    {
      id: '1',
      title: 'Стать Tech Lead',
      description: 'Получить роль технического лидера в команде',
      targetDate: new Date('2024-09-01'),
      progress: 65,
      status: 'active',
      category: 'career'
    },
    {
      id: '2',
      title: 'Изучить System Design',
      description: 'Углубить знания в проектировании систем',
      targetDate: new Date('2024-05-01'),
      progress: 40,
      status: 'active',
      category: 'skill'
    },
    {
      id: '3',
      title: 'Запустить pet-проект',
      description: 'Создать и запустить собственный проект',
      targetDate: new Date('2024-06-01'),
      progress: 20,
      status: 'active',
      category: 'project'
    }
  ];

  useEffect(() => {
    setProfileData(mockProfile);
    setSkills(mockSkills);
    setAchievements(mockAchievements);
    setProjects(mockProjects);
    setGoals(mockGoals);
  }, []);

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return '#9E9E9E';
      case 'rare': return '#2196F3';
      case 'epic': return '#9C27B0';
      case 'legendary': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'primary';
      case 'completed': return 'success';
      case 'paused': return 'warning';
      default: return 'default';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Frontend': return 'primary';
      case 'Backend': return 'secondary';
      case 'Programming': return 'info';
      case 'Architecture': return 'warning';
      case 'Soft Skills': return 'success';
      default: return 'default';
    }
  };

  const renderOverview = () => (
    <Grid container spacing={3}>
      {/* Profile Card */}
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            badgeContent={
              <IconButton size="small" sx={{ bgcolor: 'primary.main', color: 'white' }}>
                <PhotoCameraIcon fontSize="small" />
              </IconButton>
            }
          >
            <Avatar
              src={profileData?.avatar}
              sx={{ width: 120, height: 120, mx: 'auto', mb: 2 }}
            />
          </Badge>
          
          <Typography variant="h5" gutterBottom>
            {profileData?.firstName} {profileData?.lastName}
          </Typography>
          
          <Typography variant="subtitle1" color="primary" gutterBottom>
            {profileData?.position}
          </Typography>
          
          <Typography variant="body2" color="textSecondary" mb={2}>
            {profileData?.department} • {profileData?.location}
          </Typography>
          
          <Box mb={3}>
            <Typography variant="h4" color="primary">
              Уровень {profileData?.level}
            </Typography>
            <Typography variant="body2" color="textSecondary" mb={1}>
              {profileData?.currentLevelXP}/{profileData?.nextLevelXP} XP
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={profileData ? ((profileData.totalXP - profileData.currentLevelXP) / (profileData.nextLevelXP - profileData.currentLevelXP)) * 100 : 0}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
          
          <Box display="flex" gap={1} justifyContent="center" mb={2}>
            <Button variant="outlined" startIcon={<EditIcon />} size="small">
              Редактировать
            </Button>
            <Button variant="outlined" startIcon={<ShareIcon />} size="small">
              Поделиться
            </Button>
          </Box>
        </Paper>
      </Grid>

      {/* Stats Cards */}
      <Grid item xs={12} md={8}>
        <Grid container spacing={2} mb={3}>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="primary">
                  {skills.length}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Навыков
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="success.main">
                  {achievements.length}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Достижений
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="info.main">
                  {projects.length}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Проектов
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="warning.main">
                  {goals.filter(g => g.status === 'active').length}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Активных целей
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Bio and Contact */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            О себе
          </Typography>
          <Typography variant="body1" mb={3}>
            {profileData?.bio}
          </Typography>
          
          <Typography variant="h6" gutterBottom>
            Контактная информация
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <EmailIcon />
              </ListItemIcon>
              <ListItemText primary={profileData?.email} />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <PhoneIcon />
              </ListItemIcon>
              <ListItemText primary={profileData?.phone} />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <LocationIcon />
              </ListItemIcon>
              <ListItemText primary={profileData?.location} />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <ScheduleIcon />
              </ListItemIcon>
              <ListItemText 
                primary={`В компании с ${profileData?.startDate.toLocaleDateString()}`}
              />
            </ListItem>
          </List>
        </Paper>
      </Grid>
    </Grid>
  );

  const renderSkills = () => (
    <Grid container spacing={3}>
      {skills.map((skill) => (
        <Grid item xs={12} sm={6} md={4} key={skill.id}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {skill.name}
                  </Typography>
                  <Chip 
                    label={skill.category}
                    size="small"
                    color={getCategoryColor(skill.category) as any}
                  />
                </Box>
                
                <Box textAlign="center">
                  <Typography variant="h5" color="primary">
                    {skill.level}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    /{skill.maxLevel}
                  </Typography>
                </Box>
              </Box>

              <Box mb={2}>
                <LinearProgress 
                  variant="determinate" 
                  value={(skill.level / skill.maxLevel) * 100}
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" color="textSecondary">
                  {skill.endorsements} рекомендаций
                </Typography>
              </Box>

              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="textSecondary">
                  Обновлено: {skill.lastUpdated.toLocaleDateString()}
                </Typography>
                <Button size="small" startIcon={<StarIcon />}>
                  Рекомендовать
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const renderAchievements = () => (
    <Grid container spacing={2}>
      {achievements.map((achievement) => (
        <Grid item xs={12} sm={6} md={4} key={achievement.id}>
          <Card sx={{ 
            border: 2,
            borderColor: getRarityColor(achievement.rarity),
            background: `linear-gradient(135deg, ${getRarityColor(achievement.rarity)}15, transparent)`
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Typography variant="h3" sx={{ mr: 2 }}>
                  {achievement.icon}
                </Typography>
                <Box>
                  <Typography variant="h6">
                    {achievement.title}
                  </Typography>
                  <Chip 
                    label={achievement.rarity}
                    size="small"
                    sx={{ 
                      bgcolor: getRarityColor(achievement.rarity),
                      color: 'white'
                    }}
                  />
                </Box>
              </Box>
              
              <Typography variant="body2" color="textSecondary" mb={2}>
                {achievement.description}
              </Typography>
              
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Chip 
                  label={achievement.category}
                  size="small"
                  variant="outlined"
                />
                <Typography variant="body2" color="primary">
                  +{achievement.xpReward} XP
                </Typography>
              </Box>
              
              <Typography variant="caption" color="textSecondary" display="block" mt={1}>
                Получено: {achievement.unlockedAt.toLocaleDateString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const renderProjects = () => (
    <Grid container spacing={3}>
      {projects.map((project) => (
        <Grid item xs={12} md={6} key={project.id}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Typography variant="h6" gutterBottom>
                  {project.name}
                </Typography>
                <Chip 
                  label={project.status}
                  color={getStatusColor(project.status) as any}
                  size="small"
                />
              </Box>
              
              <Typography variant="body2" color="textSecondary" mb={2}>
                {project.description}
              </Typography>
              
              <Typography variant="subtitle2" gutterBottom>
                Роль: {project.role}
              </Typography>
              
              <Box mb={2}>
                <Typography variant="caption" color="textSecondary" display="block" mb={1}>
                  Технологии:
                </Typography>
                <Box display="flex" gap={0.5} flexWrap="wrap">
                  {project.technologies.map((tech) => (
                    <Chip 
                      key={tech}
                      label={tech}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
              
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="textSecondary">
                  Команда: {project.teamSize} человек
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {project.startDate.toLocaleDateString()} - {project.endDate?.toLocaleDateString() || 'Текущий'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const renderGoals = () => (
    <Grid container spacing={3}>
      {goals.map((goal) => (
        <Grid item xs={12} md={6} key={goal.id}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Typography variant="h6" gutterBottom>
                  {goal.title}
                </Typography>
                <Chip 
                  label={goal.status}
                  color={getStatusColor(goal.status) as any}
                  size="small"
                />
              </Box>
              
              <Typography variant="body2" color="textSecondary" mb={2}>
                {goal.description}
              </Typography>
              
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2">
                    Прогресс: {goal.progress}%
                  </Typography>
                  <Chip 
                    label={goal.category}
                    size="small"
                    variant="outlined"
                  />
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={goal.progress}
                  sx={{ mb: 1 }}
                />
              </Box>
              
              <Typography variant="caption" color="textSecondary">
                Цель: {goal.targetDate.toLocaleDateString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  if (!profileData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center">
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
              <PersonIcon />
            </Avatar>
            <Box>
              <Typography variant="h4" component="h1">
                Профиль сотрудника
              </Typography>
              <Typography variant="subtitle1" color="textSecondary">
                Личная информация и достижения
              </Typography>
            </Box>
          </Box>
          
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
            >
              Экспорт
            </Button>
            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
            >
              Печать
            </Button>
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
            >
              Настройки
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={selectedTab} 
          onChange={(e, newValue) => setSelectedTab(newValue)}
          variant="fullWidth"
        >
          <Tab 
            label="Обзор" 
            icon={<PersonIcon />}
            iconPosition="start"
          />
          <Tab 
            label="Навыки" 
            icon={<SchoolIcon />}
            iconPosition="start"
          />
          <Tab 
            label="Достижения" 
            icon={<TrophyIcon />}
            iconPosition="start"
          />
          <Tab 
            label="Проекты" 
            icon={<WorkIcon />}
            iconPosition="start"
          />
          <Tab 
            label="Цели" 
            icon={<TimelineIcon />}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Content */}
      {selectedTab === 0 && renderOverview()}
      {selectedTab === 1 && renderSkills()}
      {selectedTab === 2 && renderAchievements()}
      {selectedTab === 3 && renderProjects()}
      {selectedTab === 4 && renderGoals()}
    </Container>
  );
};

export default EmployeeProfile;