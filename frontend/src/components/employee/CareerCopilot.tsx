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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  IconButton,
  Tooltip,
  Badge,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Fab
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  TrendingUp as TrendingUpIcon,
  School as SchoolIcon,
  Work as WorkIcon,
  Star as StarIcon,
  Lightbulb as LightbulbIcon,
  Timeline as TimelineIcon,
  Assignment as AssignmentIcon,
  Chat as ChatIcon,
  Send as SendIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  BookmarkBorder as BookmarkIcon,
  Bookmark as BookmarkedIcon,
  Mic as MicIcon
} from '@mui/icons-material';
import VoiceAssistant from '../VoiceAssistant';

interface CareerGoal {
  id: string;
  title: string;
  description: string;
  targetRole: string;
  timeframe: string;
  progress: number;
  status: 'active' | 'completed' | 'paused';
  skills: Array<{
    name: string;
    currentLevel: number;
    targetLevel: number;
    priority: 'high' | 'medium' | 'low';
  }>;
}

interface Recommendation {
  id: string;
  type: 'skill_development' | 'role_opportunity' | 'learning_path' | 'networking';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionItems: string[];
  estimatedTime: string;
  impact: string;
  isBookmarked: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'copilot';
  message: string;
  timestamp: Date;
  type?: 'text' | 'recommendation' | 'action';
}

const CareerCopilot: React.FC = () => {
  const [activeGoal, setActiveGoal] = useState<CareerGoal | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [voiceAssistantOpen, setVoiceAssistantOpen] = useState(false);

  // Mock data
  const careerGoals: CareerGoal[] = [
    {
      id: '1',
      title: 'Стать Tech Lead',
      description: 'Развитие лидерских навыков и технической экспертизы для роли Tech Lead',
      targetRole: 'Tech Lead',
      timeframe: '12 месяцев',
      progress: 65,
      status: 'active',
      skills: [
        { name: 'Leadership', currentLevel: 3, targetLevel: 5, priority: 'high' },
        { name: 'System Design', currentLevel: 4, targetLevel: 5, priority: 'high' },
        { name: 'Mentoring', currentLevel: 2, targetLevel: 4, priority: 'medium' },
        { name: 'Project Management', currentLevel: 3, targetLevel: 4, priority: 'medium' }
      ]
    }
  ];

  const mockRecommendations: Recommendation[] = [
    {
      id: '1',
      type: 'skill_development',
      title: 'Изучить System Design',
      description: 'Углубить знания в проектировании распределенных систем для роли Tech Lead',
      priority: 'high',
      actionItems: [
        'Пройти курс "Designing Data-Intensive Applications"',
        'Изучить паттерны микросервисов',
        'Практиковаться в проектировании архитектуры'
      ],
      estimatedTime: '2-3 месяца',
      impact: 'Критично для роли Tech Lead',
      isBookmarked: false
    },
    {
      id: '2',
      type: 'role_opportunity',
      title: 'Внутренняя вакансия: Senior Developer',
      description: 'Открылась позиция Senior Developer в команде Platform - отличная ступенька к Tech Lead',
      priority: 'high',
      actionItems: [
        'Обновить внутренний профиль',
        'Связаться с hiring manager',
        'Подготовиться к техническому интервью'
      ],
      estimatedTime: '1-2 недели',
      impact: 'Прямой путь к цели',
      isBookmarked: true
    },
    {
      id: '3',
      type: 'learning_path',
      title: 'Развитие лидерских навыков',
      description: 'Комплексная программа развития soft skills для будущих лидеров',
      priority: 'medium',
      actionItems: [
        'Записаться на курс "Effective Leadership"',
        'Найти ментора среди текущих Tech Lead',
        'Начать вести команду в pet-проекте'
      ],
      estimatedTime: '6 месяцев',
      impact: 'Долгосрочное развитие',
      isBookmarked: false
    },
    {
      id: '4',
      type: 'networking',
      title: 'Участие в Tech Meetup',
      description: 'Выступить с докладом на внутреннем Tech Meetup для повышения видимости',
      priority: 'medium',
      actionItems: [
        'Выбрать тему доклада',
        'Подготовить презентацию',
        'Зарегистрироваться как спикер'
      ],
      estimatedTime: '1 месяц',
      impact: 'Повышение экспертности',
      isBookmarked: false
    }
  ];

  useEffect(() => {
    setActiveGoal(careerGoals[0]);
    setRecommendations(mockRecommendations);
    
    // Initial chat messages
    setChatMessages([
      {
        id: '1',
        sender: 'copilot',
        message: 'Привет! Я твой Career Copilot. Готов помочь с развитием карьеры. Вижу, что ты работаешь над целью стать Tech Lead. Как дела с изучением System Design?',
        timestamp: new Date(),
        type: 'text'
      }
    ]);
  }, []);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      message: newMessage,
      timestamp: new Date(),
      type: 'text'
    };

    setChatMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        'Отличный вопрос! Для развития навыков System Design рекомендую начать с изучения основных паттернов. Хочешь, чтобы я составил персональный план обучения?',
        'Понимаю твои сомнения. Давай разберем твои текущие навыки и найдем оптимальный путь развития. Какие технологии тебе интересны больше всего?',
        'Это отличная идея! Участие в проектах поможет применить теорию на практике. Могу предложить несколько подходящих внутренних проектов.',
        'Хорошо, что ты об этом думаешь. Тайм-менеджмент критично важен для Tech Lead. Рекомендую изучить методологии Agile и попрактиковаться в планировании спринтов.'
      ];

      const copilotMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'copilot',
        message: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
        type: 'text'
      };

      setChatMessages(prev => [...prev, copilotMessage]);
      setIsTyping(false);
    }, 2000);
  };

  const toggleBookmark = (recommendationId: string) => {
    setRecommendations(prev =>
      prev.map(rec =>
        rec.id === recommendationId
          ? { ...rec, isBookmarked: !rec.isBookmarked }
          : rec
      )
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'skill_development': return <SchoolIcon />;
      case 'role_opportunity': return <WorkIcon />;
      case 'learning_path': return <TimelineIcon />;
      case 'networking': return <PeopleIcon />;
      default: return <InfoIcon />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'skill_development': return 'Развитие навыков';
      case 'role_opportunity': return 'Возможность роли';
      case 'learning_path': return 'Путь обучения';
      case 'networking': return 'Нетворкинг';
      default: return type;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center">
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
              <PsychologyIcon />
            </Avatar>
            <Box>
              <Typography variant="h4" component="h1">
                🤖 Personal Career Copilot
              </Typography>
              <Typography variant="subtitle1" color="textSecondary">
                Твой ИИ-помощник в карьерном развитии
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<MicIcon />}
            onClick={() => setVoiceAssistantOpen(true)}
            sx={{ 
              borderRadius: 3,
              px: 3,
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
              boxShadow: 3,
              '&:hover': {
                boxShadow: 6,
                transform: 'translateY(-2px)'
              },
              transition: 'all 0.3s ease'
            }}
          >
            Голосовой помощник
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Current Goal */}
        <Grid item xs={12} md={8}>
          {activeGoal && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
                <Box>
                  <Typography variant="h5" gutterBottom>
                    Текущая цель: {activeGoal.title}
                  </Typography>
                  <Typography variant="body1" color="textSecondary" mb={2}>
                    {activeGoal.description}
                  </Typography>
                  <Box display="flex" gap={2} alignItems="center">
                    <Chip 
                      label={`Цель: ${activeGoal.targetRole}`}
                      color="primary"
                    />
                    <Chip 
                      label={`Срок: ${activeGoal.timeframe}`}
                      variant="outlined"
                    />
                  </Box>
                </Box>
                
                <Box textAlign="center" minWidth={120}>
                  <Typography variant="h3" color="primary">
                    {activeGoal.progress}%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    прогресс
                  </Typography>
                </Box>
              </Box>

              <Box mb={3}>
                <Typography variant="body2" color="textSecondary" mb={1}>
                  Общий прогресс
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={activeGoal.progress} 
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              <Typography variant="h6" gutterBottom>
                Развитие навыков:
              </Typography>
              
              <Grid container spacing={2}>
                {activeGoal.skills.map((skill) => (
                  <Grid item xs={12} md={6} key={skill.name}>
                    <Card variant="outlined">
                      <CardContent sx={{ py: 2 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="subtitle2">
                            {skill.name}
                          </Typography>
                          <Chip 
                            label={skill.priority}
                            size="small"
                            color={getPriorityColor(skill.priority) as any}
                          />
                        </Box>
                        
                        <Box display="flex" alignItems="center" gap={2}>
                          <Typography variant="body2" color="textSecondary">
                            {skill.currentLevel}/{skill.targetLevel}
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={(skill.currentLevel / skill.targetLevel) * 100}
                            sx={{ flexGrow: 1 }}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}

          {/* Recommendations */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Персональные рекомендации
            </Typography>
            
            {recommendations.map((rec) => (
              <Accordion key={rec.id} sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box display="flex" alignItems="center" width="100%">
                    <Avatar sx={{ mr: 2, bgcolor: 'primary.light' }}>
                      {getTypeIcon(rec.type)}
                    </Avatar>
                    
                    <Box flexGrow={1}>
                      <Typography variant="subtitle1">
                        {rec.title}
                      </Typography>
                      <Box display="flex" gap={1} mt={0.5}>
                        <Chip 
                          label={getTypeLabel(rec.type)}
                          size="small"
                          variant="outlined"
                        />
                        <Chip 
                          label={rec.priority}
                          size="small"
                          color={getPriorityColor(rec.priority) as any}
                        />
                      </Box>
                    </Box>
                    
                    <IconButton 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(rec.id);
                      }}
                      color={rec.isBookmarked ? 'primary' : 'default'}
                    >
                      {rec.isBookmarked ? <BookmarkedIcon /> : <BookmarkIcon />}
                    </IconButton>
                  </Box>
                </AccordionSummary>
                
                <AccordionDetails>
                  <Typography variant="body2" color="textSecondary" mb={2}>
                    {rec.description}
                  </Typography>
                  
                  <Grid container spacing={2} mb={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">
                        Время выполнения:
                      </Typography>
                      <Typography variant="body2">
                        {rec.estimatedTime}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">
                        Влияние на цель:
                      </Typography>
                      <Typography variant="body2">
                        {rec.impact}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  <Typography variant="subtitle2" gutterBottom>
                    План действий:
                  </Typography>
                  
                  <Stepper orientation="vertical">
                    {rec.actionItems.map((item, index) => (
                      <Step key={index} active>
                        <StepLabel>
                          <Typography variant="body2">
                            {item}
                          </Typography>
                        </StepLabel>
                      </Step>
                    ))}
                  </Stepper>
                  
                  <Box mt={2} display="flex" gap={2}>
                    <Button variant="contained" size="small">
                      Начать выполнение
                    </Button>
                    <Button variant="outlined" size="small">
                      Подробнее
                    </Button>
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </Paper>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Quick Stats */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Твоя статистика
            </Typography>
            
            <Box mb={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2">Активные цели</Typography>
                <Typography variant="h6" color="primary">1</Typography>
              </Box>
              
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2">Завершенные задачи</Typography>
                <Typography variant="h6" color="success.main">12</Typography>
              </Box>
              
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2">Изученные навыки</Typography>
                <Typography variant="h6" color="info.main">8</Typography>
              </Box>
              
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2">Рекомендации</Typography>
                <Typography variant="h6" color="warning.main">
                  {recommendations.length}
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Recent Achievements */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Недавние достижения
            </Typography>
            
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Завершен курс React Advanced"
                  secondary="2 дня назад"
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <StarIcon color="warning" />
                </ListItemIcon>
                <ListItemText
                  primary="Получен бейдж 'Code Reviewer'"
                  secondary="1 неделя назад"
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  <TrendingUpIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Повышен уровень TypeScript до 4/5"
                  secondary="2 недели назад"
                />
              </ListItem>
            </List>
          </Paper>

          {/* Quick Actions */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Быстрые действия
            </Typography>
            
            <Box display="flex" flexDirection="column" gap={2}>
              <Button 
                variant="outlined" 
                startIcon={<AssignmentIcon />}
                fullWidth
              >
                Обновить цели
              </Button>
              
              <Button 
                variant="outlined" 
                startIcon={<SchoolIcon />}
                fullWidth
              >
                Найти курсы
              </Button>
              
              <Button 
                variant="outlined" 
                startIcon={<WorkIcon />}
                fullWidth
              >
                Посмотреть вакансии
              </Button>
              
              <Button 
                variant="outlined" 
                startIcon={<TimelineIcon />}
                fullWidth
              >
                Карьерная карта
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Floating Chat Button */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setChatOpen(true)}
      >
        <Badge badgeContent={1} color="error">
          <ChatIcon />
        </Badge>
      </Fab>

      {/* Chat Dialog */}
      <Dialog 
        open={chatOpen} 
        onClose={() => setChatOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { height: '70vh', display: 'flex', flexDirection: 'column' }
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center">
              <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                <PsychologyIcon />
              </Avatar>
              <Box>
                <Typography variant="h6">Career Copilot</Typography>
                <Typography variant="caption" color="textSecondary">
                  Онлайн • Готов помочь
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={() => setChatOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ flexGrow: 1, overflow: 'auto', mb: 2 }}>
            {chatMessages.map((message) => (
              <Box
                key={message.id}
                sx={{
                  display: 'flex',
                  justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                  mb: 2
                }}
              >
                <Paper
                  sx={{
                    p: 2,
                    maxWidth: '80%',
                    bgcolor: message.sender === 'user' ? 'primary.main' : 'grey.100',
                    color: message.sender === 'user' ? 'primary.contrastText' : 'text.primary'
                  }}
                >
                  <Typography variant="body2">
                    {message.message}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      opacity: 0.7,
                      display: 'block',
                      mt: 0.5
                    }}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </Typography>
                </Paper>
              </Box>
            ))}
            
            {isTyping && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
                <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
                  <Typography variant="body2" color="textSecondary">
                    Copilot печатает...
                  </Typography>
                </Paper>
              </Box>
            )}
          </Box>
          
          <Box display="flex" gap={1}>
            <TextField
              fullWidth
              placeholder="Спросите что-нибудь о карьере..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              multiline
              maxRows={3}
            />
            <IconButton 
              color="primary" 
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isTyping}
            >
              <SendIcon />
            </IconButton>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Voice Assistant */}
      <VoiceAssistant 
        open={voiceAssistantOpen}
        onClose={() => setVoiceAssistantOpen(false)}
        context="career_copilot"
        systemPrompt="Ты - персональный карьерный коуч и помощник. Помогай пользователю с вопросами карьерного развития, планирования карьеры, развития навыков, поиска работы и профессионального роста. Отвечай на русском языке, будь дружелюбным и мотивирующим."
      />
    </Container>
  );
};

export default CareerCopilot;