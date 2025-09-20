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
  Stepper,
  Step,
  StepLabel,
  StepContent,
  StepConnector,
  Tabs,
  Tab,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  School as SchoolIcon,
  Work as WorkIcon,
  Star as StarIcon,
  EmojiEvents as TrophyIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncompletedIcon,
  Lock as LockedIcon,
  PlayArrow as StartIcon,
  Pause as PauseIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Flag as FlagIcon,
  Route as RouteIcon,
  Map as MapIcon,
  Navigation as NavigationIcon,
  Explore as ExploreIcon,
  MyLocation as LocationIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

interface SkillNode {
  id: string;
  name: string;
  category: 'technical' | 'soft' | 'domain';
  level: number;
  maxLevel: number;
  status: 'completed' | 'in_progress' | 'locked' | 'available';
  prerequisites: string[];
  unlocks: string[];
  xpRequired: number;
  currentXp: number;
  description: string;
  resources: Array<{
    type: 'course' | 'book' | 'project' | 'mentor';
    title: string;
    url?: string;
    duration?: string;
  }>;
}

interface CareerPath {
  id: string;
  title: string;
  description: string;
  currentRole: string;
  targetRole: string;
  progress: number;
  estimatedTime: string;
  milestones: Array<{
    id: string;
    title: string;
    description: string;
    requiredSkills: string[];
    status: 'completed' | 'current' | 'upcoming';
    completedAt?: Date;
    estimatedCompletion?: Date;
  }>;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt: Date;
  xpReward: number;
}

const CustomStepConnector = styled(StepConnector)(({ theme }) => ({
  '&.Mui-active': {
    '& .MuiStepConnector-line': {
      borderColor: theme.palette.primary.main,
    },
  },
  '&.Mui-completed': {
    '& .MuiStepConnector-line': {
      borderColor: theme.palette.success.main,
    },
  },
}));

const ProgressMap: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedSkill, setSelectedSkill] = useState<SkillNode | null>(null);
  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'tree' | 'timeline' | 'grid'>('tree');
  const [showCompleted, setShowCompleted] = useState(true);

  // Mock data
  const skillNodes: SkillNode[] = [
    {
      id: 'react-basics',
      name: 'React Основы',
      category: 'technical',
      level: 5,
      maxLevel: 5,
      status: 'completed',
      prerequisites: [],
      unlocks: ['react-advanced', 'redux'],
      xpRequired: 1000,
      currentXp: 1000,
      description: 'Основы React: компоненты, состояние, пропсы',
      resources: [
        { type: 'course', title: 'React Fundamentals', duration: '20 часов' },
        { type: 'project', title: 'Todo App', duration: '1 неделя' }
      ]
    },
    {
      id: 'react-advanced',
      name: 'React Продвинутый',
      category: 'technical',
      level: 3,
      maxLevel: 5,
      status: 'in_progress',
      prerequisites: ['react-basics'],
      unlocks: ['react-native', 'next-js'],
      xpRequired: 1500,
      currentXp: 900,
      description: 'Хуки, контекст, оптимизация производительности',
      resources: [
        { type: 'course', title: 'Advanced React Patterns', duration: '30 часов' },
        { type: 'book', title: 'React Design Patterns' }
      ]
    },
    {
      id: 'typescript',
      name: 'TypeScript',
      category: 'technical',
      level: 4,
      maxLevel: 5,
      status: 'completed',
      prerequisites: [],
      unlocks: ['react-advanced', 'node-ts'],
      xpRequired: 1200,
      currentXp: 1200,
      description: 'Статическая типизация для JavaScript',
      resources: [
        { type: 'course', title: 'TypeScript Deep Dive', duration: '25 часов' }
      ]
    },
    {
      id: 'redux',
      name: 'Redux',
      category: 'technical',
      level: 0,
      maxLevel: 5,
      status: 'available',
      prerequisites: ['react-basics'],
      unlocks: ['redux-toolkit'],
      xpRequired: 800,
      currentXp: 0,
      description: 'Управление состоянием приложения',
      resources: [
        { type: 'course', title: 'Redux Essentials', duration: '15 часов' }
      ]
    },
    {
      id: 'leadership',
      name: 'Лидерство',
      category: 'soft',
      level: 2,
      maxLevel: 5,
      status: 'in_progress',
      prerequisites: [],
      unlocks: ['team-management'],
      xpRequired: 2000,
      currentXp: 800,
      description: 'Навыки руководства и мотивации команды',
      resources: [
        { type: 'course', title: 'Leadership Fundamentals', duration: '40 часов' },
        { type: 'mentor', title: 'Ментор: Анна Петрова (Tech Lead)' }
      ]
    },
    {
      id: 'system-design',
      name: 'System Design',
      category: 'technical',
      level: 1,
      maxLevel: 5,
      status: 'in_progress',
      prerequisites: ['react-advanced', 'typescript'],
      unlocks: ['microservices'],
      xpRequired: 2500,
      currentXp: 500,
      description: 'Проектирование масштабируемых систем',
      resources: [
        { type: 'book', title: 'Designing Data-Intensive Applications' },
        { type: 'course', title: 'System Design Interview', duration: '50 часов' }
      ]
    }
  ];

  const careerPath: CareerPath = {
    id: 'frontend-to-techlead',
    title: 'Frontend Developer → Tech Lead',
    description: 'Путь от фронтенд-разработчика до технического лидера',
    currentRole: 'Senior Frontend Developer',
    targetRole: 'Tech Lead',
    progress: 65,
    estimatedTime: '8 месяцев',
    milestones: [
      {
        id: '1',
        title: 'Освоить продвинутый React',
        description: 'Глубокое изучение React паттернов и оптимизации',
        requiredSkills: ['react-advanced'],
        status: 'current',
        estimatedCompletion: new Date('2024-03-15')
      },
      {
        id: '2',
        title: 'Изучить System Design',
        description: 'Основы проектирования распределенных систем',
        requiredSkills: ['system-design'],
        status: 'upcoming',
        estimatedCompletion: new Date('2024-05-01')
      },
      {
        id: '3',
        title: 'Развить лидерские навыки',
        description: 'Навыки управления командой и проектами',
        requiredSkills: ['leadership', 'team-management'],
        status: 'upcoming',
        estimatedCompletion: new Date('2024-07-01')
      },
      {
        id: '4',
        title: 'Получить роль Tech Lead',
        description: 'Применить все навыки на практике',
        requiredSkills: ['system-design', 'leadership', 'react-advanced'],
        status: 'upcoming',
        estimatedCompletion: new Date('2024-09-01')
      }
    ]
  };

  const achievements: Achievement[] = [
    {
      id: '1',
      title: 'React Master',
      description: 'Освоил все уровни React',
      icon: '🏆',
      rarity: 'epic',
      unlockedAt: new Date('2024-01-15'),
      xpReward: 500
    },
    {
      id: '2',
      title: 'Code Reviewer',
      description: 'Провел 50+ код-ревью',
      icon: '👁️',
      rarity: 'rare',
      unlockedAt: new Date('2024-01-20'),
      xpReward: 300
    },
    {
      id: '3',
      title: 'Mentor',
      description: 'Помог 5 джуниорам',
      icon: '🎓',
      rarity: 'rare',
      unlockedAt: new Date('2024-02-01'),
      xpReward: 400
    }
  ];

  const handleSkillClick = (skill: SkillNode) => {
    setSelectedSkill(skill);
    setSkillDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'primary';
      case 'available': return 'warning';
      case 'locked': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon />;
      case 'in_progress': return <StartIcon />;
      case 'available': return <UncompletedIcon />;
      case 'locked': return <LockedIcon />;
      default: return <UncompletedIcon />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'technical': return 'primary';
      case 'soft': return 'secondary';
      case 'domain': return 'info';
      default: return 'default';
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return '#9E9E9E';
      case 'rare': return '#2196F3';
      case 'epic': return '#9C27B0';
      case 'legendary': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  const renderSkillTree = () => (
    <Grid container spacing={3}>
      {skillNodes
        .filter(skill => showCompleted || skill.status !== 'completed')
        .map((skill) => (
        <Grid item xs={12} sm={6} md={4} key={skill.id}>
          <Card 
            sx={{ 
              cursor: 'pointer',
              border: skill.status === 'in_progress' ? 2 : 1,
              borderColor: skill.status === 'in_progress' ? 'primary.main' : 'divider',
              '&:hover': { elevation: 4 }
            }}
            onClick={() => handleSkillClick(skill)}
          >
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
                    sx={{ mb: 1 }}
                  />
                </Box>
                
                <Avatar sx={{ bgcolor: getStatusColor(skill.status) + '.main' }}>
                  {getStatusIcon(skill.status)}
                </Avatar>
              </Box>

              <Typography variant="body2" color="textSecondary" mb={2}>
                {skill.description}
              </Typography>

              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2">
                    Уровень {skill.level}/{skill.maxLevel}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {skill.currentXp}/{skill.xpRequired} XP
                  </Typography>
                </Box>
                
                <LinearProgress 
                  variant="determinate" 
                  value={(skill.currentXp / skill.xpRequired) * 100}
                  sx={{ mb: 1 }}
                />
                
                <LinearProgress 
                  variant="determinate" 
                  value={(skill.level / skill.maxLevel) * 100}
                  color="secondary"
                />
              </Box>

              {skill.prerequisites.length > 0 && (
                <Box mb={1}>
                  <Typography variant="caption" color="textSecondary">
                    Требует: {skill.prerequisites.join(', ')}
                  </Typography>
                </Box>
              )}

              {skill.unlocks.length > 0 && (
                <Box>
                  <Typography variant="caption" color="primary">
                    Открывает: {skill.unlocks.join(', ')}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  const renderCareerTimeline = () => (
    <Paper sx={{ p: 3 }}>
      <Box mb={3}>
        <Typography variant="h5" gutterBottom>
          {careerPath.title}
        </Typography>
        <Typography variant="body1" color="textSecondary" mb={2}>
          {careerPath.description}
        </Typography>
        
        <Box display="flex" gap={2} mb={2}>
          <Chip label={`Текущая роль: ${careerPath.currentRole}`} />
          <Chip label={`Цель: ${careerPath.targetRole}`} color="primary" />
          <Chip label={`Осталось: ${careerPath.estimatedTime}`} variant="outlined" />
        </Box>

        <Box mb={3}>
          <Typography variant="body2" color="textSecondary" mb={1}>
            Общий прогресс: {careerPath.progress}%
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={careerPath.progress}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      </Box>

      <Timeline>
        {careerPath.milestones.map((milestone, index) => (
          <TimelineItem key={milestone.id}>
            <TimelineOppositeContent color="textSecondary">
              {milestone.estimatedCompletion?.toLocaleDateString()}
            </TimelineOppositeContent>
            
            <TimelineSeparator>
              <TimelineDot 
                color={
                  milestone.status === 'completed' ? 'success' :
                  milestone.status === 'current' ? 'primary' : 'grey'
                }
              >
                {milestone.status === 'completed' ? <CheckCircleIcon /> :
                 milestone.status === 'current' ? <StartIcon /> : <UncompletedIcon />}
              </TimelineDot>
              {index < careerPath.milestones.length - 1 && <TimelineConnector />}
            </TimelineSeparator>
            
            <TimelineContent>
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {milestone.title}
                </Typography>
                <Typography variant="body2" color="textSecondary" mb={2}>
                  {milestone.description}
                </Typography>
                
                <Box display="flex" gap={1} flexWrap="wrap">
                  {milestone.requiredSkills.map((skillId) => {
                    const skill = skillNodes.find(s => s.id === skillId);
                    return skill ? (
                      <Chip 
                        key={skillId}
                        label={skill.name}
                        size="small"
                        color={skill.status === 'completed' ? 'success' : 'default'}
                        variant={skill.status === 'completed' ? 'filled' : 'outlined'}
                      />
                    ) : null;
                  })}
                </Box>
              </Paper>
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
    </Paper>
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
                <Typography variant="body2">
                  +{achievement.xpReward} XP
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {achievement.unlockedAt.toLocaleDateString()}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center">
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
              <MapIcon />
            </Avatar>
            <Box>
              <Typography variant="h4" component="h1">
                Progress Map
              </Typography>
              <Typography variant="subtitle1" color="textSecondary">
                Карта твоего карьерного развития
              </Typography>
            </Box>
          </Box>
          
          <Box display="flex" gap={2} alignItems="center">
            <FormControlLabel
              control={
                <Switch
                  checked={showCompleted}
                  onChange={(e) => setShowCompleted(e.target.checked)}
                />
              }
              label="Показать завершенные"
            />
            
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
            >
              Добавить навык
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
            label="Дерево навыков" 
            icon={<ExploreIcon />}
            iconPosition="start"
          />
          <Tab 
            label="Карьерный путь" 
            icon={<RouteIcon />}
            iconPosition="start"
          />
          <Tab 
            label="Достижения" 
            icon={<TrophyIcon />}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Content */}
      {selectedTab === 0 && renderSkillTree()}
      {selectedTab === 1 && renderCareerTimeline()}
      {selectedTab === 2 && renderAchievements()}

      {/* Skill Detail Dialog */}
      <Dialog 
        open={skillDialogOpen} 
        onClose={() => setSkillDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedSkill && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h5">
                    {selectedSkill.name}
                  </Typography>
                  <Box display="flex" gap={1} mt={1}>
                    <Chip 
                      label={selectedSkill.category}
                      color={getCategoryColor(selectedSkill.category) as any}
                    />
                    <Chip 
                      label={selectedSkill.status}
                      color={getStatusColor(selectedSkill.status) as any}
                    />
                  </Box>
                </Box>
                
                <Avatar sx={{ bgcolor: getStatusColor(selectedSkill.status) + '.main' }}>
                  {getStatusIcon(selectedSkill.status)}
                </Avatar>
              </Box>
            </DialogTitle>
            
            <DialogContent>
              <Typography variant="body1" mb={3}>
                {selectedSkill.description}
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Прогресс
                  </Typography>
                  
                  <Box mb={2}>
                    <Typography variant="body2" mb={1}>
                      Уровень: {selectedSkill.level}/{selectedSkill.maxLevel}
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={(selectedSkill.level / selectedSkill.maxLevel) * 100}
                      sx={{ mb: 2 }}
                    />
                    
                    <Typography variant="body2" mb={1}>
                      Опыт: {selectedSkill.currentXp}/{selectedSkill.xpRequired} XP
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={(selectedSkill.currentXp / selectedSkill.xpRequired) * 100}
                      color="secondary"
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Ресурсы для изучения
                  </Typography>
                  
                  <List dense>
                    {selectedSkill.resources.map((resource, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          {resource.type === 'course' && <SchoolIcon />}
                          {resource.type === 'book' && <AssignmentIcon />}
                          {resource.type === 'project' && <WorkIcon />}
                          {resource.type === 'mentor' && <StarIcon />}
                        </ListItemIcon>
                        <ListItemText
                          primary={resource.title}
                          secondary={resource.duration}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
              </Grid>
              
              {selectedSkill.prerequisites.length > 0 && (
                <Box mt={3}>
                  <Typography variant="h6" gutterBottom>
                    Требования
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {selectedSkill.prerequisites.map((prereqId) => {
                      const prereq = skillNodes.find(s => s.id === prereqId);
                      return prereq ? (
                        <Chip 
                          key={prereqId}
                          label={prereq.name}
                          color={prereq.status === 'completed' ? 'success' : 'error'}
                        />
                      ) : null;
                    })}
                  </Box>
                </Box>
              )}
              
              {selectedSkill.unlocks.length > 0 && (
                <Box mt={3}>
                  <Typography variant="h6" gutterBottom>
                    Открывает навыки
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {selectedSkill.unlocks.map((unlockId) => {
                      const unlock = skillNodes.find(s => s.id === unlockId);
                      return unlock ? (
                        <Chip 
                          key={unlockId}
                          label={unlock.name}
                          variant="outlined"
                          color="primary"
                        />
                      ) : null;
                    })}
                  </Box>
                </Box>
              )}
            </DialogContent>
            
            <DialogActions>
              <Button onClick={() => setSkillDialogOpen(false)}>
                Закрыть
              </Button>
              {selectedSkill.status === 'available' && (
                <Button variant="contained" startIcon={<StartIcon />}>
                  Начать изучение
                </Button>
              )}
              {selectedSkill.status === 'in_progress' && (
                <Button variant="contained" startIcon={<ViewIcon />}>
                  Продолжить
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default ProgressMap;