import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Avatar,
  AvatarGroup,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  Psychology as PsychologyIcon,
  Groups as GroupsIcon,
  Timeline as TimelineIcon,
  Lightbulb as LightbulbIcon,
  Send as SendIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

interface VacancyAnalysis {
  id: string;
  title: string;
  department: string;
  description: string;
  requirements: string[];
  status: 'analyzing' | 'completed' | 'error';
  
  // Analysis results
  marketAnalysis?: {
    competitiveness: number;
    salaryRange: { min: number; max: number };
    demandLevel: 'high' | 'medium' | 'low';
    timeToFill: number;
  };
  
  skillsAnalysis?: {
    requiredSkills: Array<{
      name: string;
      importance: number;
      availability: number;
      difficulty: 'easy' | 'medium' | 'hard';
    }>;
    missingSkills: string[];
    overqualifiedSkills: string[];
  };
  
  candidatePool?: {
    totalCandidates: number;
    qualifiedCandidates: number;
    topMatches: Array<{
      id: string;
      name: string;
      matchScore: number;
      avatar?: string;
      currentRole: string;
    }>;
  };
  
  recommendations?: Array<{
    type: 'critical' | 'warning' | 'suggestion';
    category: string;
    message: string;
    impact: string;
  }>;
  
  aiInsights?: {
    summary: string;
    keyFindings: string[];
    actionItems: string[];
  };
}

const VacancyCheck: React.FC = () => {
  const [vacancyText, setVacancyText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<VacancyAnalysis | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleAnalyze = async () => {
    if (!vacancyText.trim()) return;

    setIsAnalyzing(true);
    
    // Simulate API call
    setTimeout(() => {
      const mockAnalysis: VacancyAnalysis = {
        id: '1',
        title: 'Senior Frontend Developer',
        department: 'IT',
        description: vacancyText,
        requirements: [
          'React.js (5+ лет)',
          'TypeScript',
          'Node.js',
          'GraphQL',
          'Английский язык (Upper-Intermediate)'
        ],
        status: 'completed',
        
        marketAnalysis: {
          competitiveness: 85,
          salaryRange: { min: 200000, max: 350000 },
          demandLevel: 'high',
          timeToFill: 45
        },
        
        skillsAnalysis: {
          requiredSkills: [
            { name: 'React.js', importance: 95, availability: 70, difficulty: 'medium' },
            { name: 'TypeScript', importance: 85, availability: 60, difficulty: 'medium' },
            { name: 'Node.js', importance: 70, availability: 80, difficulty: 'easy' },
            { name: 'GraphQL', importance: 60, availability: 40, difficulty: 'hard' },
            { name: 'English', importance: 75, availability: 50, difficulty: 'medium' }
          ],
          missingSkills: ['Next.js', 'Testing (Jest/Cypress)'],
          overqualifiedSkills: ['jQuery', 'PHP']
        },
        
        candidatePool: {
          totalCandidates: 156,
          qualifiedCandidates: 23,
          topMatches: [
            { id: '1', name: 'Анна Петрова', matchScore: 95, currentRole: 'Senior Frontend Developer' },
            { id: '2', name: 'Дмитрий Иванов', matchScore: 89, currentRole: 'Lead React Developer' },
            { id: '3', name: 'Мария Сидорова', matchScore: 87, currentRole: 'Frontend Team Lead' }
          ]
        },
        
        recommendations: [
          {
            type: 'critical',
            category: 'Требования',
            message: 'GraphQL - редкий навык на рынке',
            impact: 'Может увеличить время поиска на 30%'
          },
          {
            type: 'warning',
            category: 'Зарплата',
            message: 'Зарплатная вилка ниже рыночной на 15%',
            impact: 'Снижает привлекательность вакансии'
          },
          {
            type: 'suggestion',
            category: 'Навыки',
            message: 'Добавить Next.js в желательные навыки',
            impact: 'Расширит пул кандидатов на 25%'
          }
        ],
        
        aiInsights: {
          summary: 'Вакансия имеет высокий потенциал, но требует корректировки требований и зарплатной вилки для оптимального результата.',
          keyFindings: [
            'Высокий спрос на позицию в текущем рынке',
            'GraphQL может стать барьером для многих кандидатов',
            'Внутренние кандидаты показывают высокое соответствие'
          ],
          actionItems: [
            'Пересмотреть обязательность GraphQL',
            'Увеличить зарплатную вилку на 10-15%',
            'Добавить возможность обучения GraphQL'
          ]
        }
      };
      
      setAnalysis(mockAnalysis);
      setIsAnalyzing(false);
    }, 3000);
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'critical': return <ErrorIcon color="error" />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'suggestion': return <LightbulbIcon color="info" />;
      default: return <InfoIcon />;
    }
  };

  const getRecommendationColor = (type: string) => {
    switch (type) {
      case 'critical': return 'error';
      case 'warning': return 'warning';
      case 'suggestion': return 'info';
      default: return 'default';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'success';
      case 'medium': return 'warning';
      case 'hard': return 'error';
      default: return 'default';
    }
  };

  const steps = [
    'Анализ текста вакансии',
    'Исследование рынка',
    'Поиск кандидатов',
    'Генерация рекомендаций'
  ];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          One-click Vacancy Check
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Мгновенный анализ вакансии с помощью ИИ
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Input Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Описание вакансии
            </Typography>
            
            <TextField
              fullWidth
              multiline
              rows={12}
              value={vacancyText}
              onChange={(e) => setVacancyText(e.target.value)}
              placeholder="Вставьте текст вакансии или описание требований..."
              sx={{ mb: 3 }}
            />
            
            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                onClick={handleAnalyze}
                disabled={!vacancyText.trim() || isAnalyzing}
                startIcon={isAnalyzing ? <CircularProgress size={20} /> : <SpeedIcon />}
                fullWidth
              >
                {isAnalyzing ? 'Анализируем...' : 'Проанализировать'}
              </Button>
              
              <Button
                variant="outlined"
                onClick={() => {
                  setVacancyText('');
                  setAnalysis(null);
                }}
                startIcon={<RefreshIcon />}
              >
                Очистить
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Analysis Progress */}
        <Grid item xs={12} md={6}>
          {isAnalyzing && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Процесс анализа
              </Typography>
              
              <Stepper activeStep={2} orientation="vertical">
                {steps.map((label, index) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                    <StepContent>
                      <LinearProgress sx={{ mt: 1, mb: 2 }} />
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </Paper>
          )}

          {/* Quick Results */}
          {analysis && (
            <Paper sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">
                  Быстрые результаты
                </Typography>
                <Button 
                  variant="outlined" 
                  onClick={() => setShowDetails(true)}
                >
                  Подробнее
                </Button>
              </Box>

              {/* Key Metrics */}
              <Grid container spacing={2} mb={3}>
                <Grid item xs={6}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="h4" color="primary">
                        {analysis.candidatePool?.qualifiedCandidates}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Подходящих кандидатов
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={6}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="h4" color="warning.main">
                        {analysis.marketAnalysis?.timeToFill}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Дней до закрытия
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Top Recommendations */}
              <Typography variant="subtitle1" gutterBottom>
                Ключевые рекомендации:
              </Typography>
              
              {analysis.recommendations?.slice(0, 3).map((rec, index) => (
                <Alert 
                  key={index}
                  severity={getRecommendationColor(rec.type) as any}
                  sx={{ mb: 1 }}
                  icon={getRecommendationIcon(rec.type)}
                >
                  <Typography variant="body2">
                    <strong>{rec.category}:</strong> {rec.message}
                  </Typography>
                </Alert>
              ))}

              {/* Top Candidates */}
              <Box mt={3}>
                <Typography variant="subtitle1" gutterBottom>
                  Лучшие кандидаты:
                </Typography>
                
                <AvatarGroup max={4}>
                  {analysis.candidatePool?.topMatches.map((candidate) => (
                    <Tooltip key={candidate.id} title={`${candidate.name} (${candidate.matchScore}%)`}>
                      <Avatar src={candidate.avatar}>
                        {candidate.name.charAt(0)}
                      </Avatar>
                    </Tooltip>
                  ))}
                </AvatarGroup>
              </Box>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Detailed Analysis Dialog */}
      <Dialog 
        open={showDetails} 
        onClose={() => setShowDetails(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Детальный анализ вакансии
        </DialogTitle>
        
        <DialogContent>
          {analysis && (
            <Box>
              {/* AI Summary */}
              <Paper sx={{ p: 3, mb: 3, bgcolor: 'primary.light' }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <PsychologyIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    AI Insights
                  </Typography>
                </Box>
                
                <Typography variant="body1" mb={2}>
                  {analysis.aiInsights?.summary}
                </Typography>
                
                <Typography variant="subtitle2" gutterBottom>
                  Ключевые находки:
                </Typography>
                <List dense>
                  {analysis.aiInsights?.keyFindings.map((finding, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" />
                      </ListItemIcon>
                      <ListItemText primary={finding} />
                    </ListItem>
                  ))}
                </List>
              </Paper>

              {/* Market Analysis */}
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">
                    <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Анализ рынка
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>
                        Конкурентоспособность
                      </Typography>
                      <Box display="flex" alignItems="center" mb={2}>
                        <LinearProgress 
                          variant="determinate" 
                          value={analysis.marketAnalysis?.competitiveness} 
                          sx={{ flexGrow: 1, mr: 2 }}
                        />
                        <Typography variant="body2">
                          {analysis.marketAnalysis?.competitiveness}%
                        </Typography>
                      </Box>
                      
                      <Typography variant="subtitle2" gutterBottom>
                        Зарплатная вилка
                      </Typography>
                      <Typography variant="body1" mb={2}>
                        {analysis.marketAnalysis?.salaryRange.min.toLocaleString()} - {analysis.marketAnalysis?.salaryRange.max.toLocaleString()} ₽
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>
                        Уровень спроса
                      </Typography>
                      <Chip 
                        label={analysis.marketAnalysis?.demandLevel === 'high' ? 'Высокий' : 
                               analysis.marketAnalysis?.demandLevel === 'medium' ? 'Средний' : 'Низкий'}
                        color={analysis.marketAnalysis?.demandLevel === 'high' ? 'success' : 
                               analysis.marketAnalysis?.demandLevel === 'medium' ? 'warning' : 'error'}
                        sx={{ mb: 2 }}
                      />
                      
                      <Typography variant="subtitle2" gutterBottom>
                        Время закрытия
                      </Typography>
                      <Typography variant="body1">
                        ~{analysis.marketAnalysis?.timeToFill} дней
                      </Typography>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>

              {/* Skills Analysis */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">
                    <WorkIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Анализ навыков
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="subtitle2" gutterBottom>
                    Требуемые навыки:
                  </Typography>
                  
                  {analysis.skillsAnalysis?.requiredSkills.map((skill) => (
                    <Box key={skill.name} mb={2}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="body2">
                          {skill.name}
                        </Typography>
                        <Chip 
                          label={skill.difficulty === 'easy' ? 'Легко найти' : 
                                 skill.difficulty === 'medium' ? 'Средне' : 'Сложно найти'}
                          size="small"
                          color={getDifficultyColor(skill.difficulty) as any}
                        />
                      </Box>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="textSecondary">
                            Важность: {skill.importance}%
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={skill.importance} 
                            color="primary"
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="textSecondary">
                            Доступность: {skill.availability}%
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={skill.availability} 
                            color="secondary"
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  ))}
                  
                  {analysis.skillsAnalysis?.missingSkills.length > 0 && (
                    <Box mt={3}>
                      <Typography variant="subtitle2" gutterBottom>
                        Рекомендуемые дополнительные навыки:
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={1}>
                        {analysis.skillsAnalysis.missingSkills.map((skill) => (
                          <Chip key={skill} label={skill} variant="outlined" color="info" />
                        ))}
                      </Box>
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>

              {/* Candidate Pool */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">
                    <GroupsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Пул кандидатов
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                        <Typography variant="h4" color="primary">
                          {analysis.candidatePool?.totalCandidates}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Всего кандидатов
                        </Typography>
                      </Card>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                        <Typography variant="h4" color="success.main">
                          {analysis.candidatePool?.qualifiedCandidates}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Подходящих
                        </Typography>
                      </Card>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                        <Typography variant="h4" color="warning.main">
                          {Math.round((analysis.candidatePool?.qualifiedCandidates / analysis.candidatePool?.totalCandidates) * 100)}%
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Конверсия
                        </Typography>
                      </Card>
                    </Grid>
                  </Grid>
                  
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
                    Топ кандидаты:
                  </Typography>
                  
                  {analysis.candidatePool?.topMatches.map((candidate) => (
                    <Card key={candidate.id} variant="outlined" sx={{ mb: 1 }}>
                      <CardContent sx={{ py: 2 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Box display="flex" alignItems="center">
                            <Avatar src={candidate.avatar} sx={{ mr: 2 }}>
                              {candidate.name.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography variant="body1">
                                {candidate.name}
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                {candidate.currentRole}
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Chip 
                            label={`${candidate.matchScore}%`}
                            color="primary"
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </AccordionDetails>
              </Accordion>

              {/* All Recommendations */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">
                    <LightbulbIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Все рекомендации
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {analysis.recommendations?.map((rec, index) => (
                    <Alert 
                      key={index}
                      severity={getRecommendationColor(rec.type) as any}
                      sx={{ mb: 2 }}
                      icon={getRecommendationIcon(rec.type)}
                    >
                      <Typography variant="body1" gutterBottom>
                        <strong>{rec.category}:</strong> {rec.message}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Влияние: {rec.impact}
                      </Typography>
                    </Alert>
                  ))}
                </AccordionDetails>
              </Accordion>

              {/* Action Items */}
              <Paper sx={{ p: 3, mt: 3, bgcolor: 'success.light' }}>
                <Typography variant="h6" gutterBottom>
                  <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  План действий
                </Typography>
                
                <List>
                  {analysis.aiInsights?.actionItems.map((item, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <CheckCircleIcon />
                      </ListItemIcon>
                      <ListItemText primary={item} />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setShowDetails(false)}>
            Закрыть
          </Button>
          <Button variant="contained" startIcon={<SendIcon />}>
            Отправить в работу
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default VacancyCheck;