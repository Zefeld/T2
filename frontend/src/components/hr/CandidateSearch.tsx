import React, { useState, useEffect } from 'react';
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
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Rating,
  LinearProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  FilterList as FilterListIcon,
  Star as StarIcon,
  Work as WorkIcon,
  School as SchoolIcon,
  LocationOn as LocationIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Visibility as VisibilityIcon,
  PersonAdd as PersonAddIcon,
  Clear as ClearIcon
} from '@mui/icons-material';

interface Candidate {
  id: string;
  name: string;
  currentRole: string;
  department: string;
  location: string;
  avatar?: string;
  skills: Array<{
    name: string;
    level: number;
    endorsed: boolean;
  }>;
  experience: number;
  education: string;
  matchScore?: number;
  availability: 'available' | 'interested' | 'not_available';
  lastActive: string;
  email: string;
  phone?: string;
  summary: string;
}

interface SearchFilters {
  query: string;
  department: string;
  location: string;
  experienceRange: [number, number];
  skills: string[];
  availability: string;
  minMatchScore: number;
}

const CandidateSearch: React.FC = () => {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    department: '',
    location: '',
    experienceRange: [0, 20],
    skills: [],
    availability: '',
    minMatchScore: 0
  });

  const [candidates, setCandidates] = useState<Candidate[]>([
    {
      id: '1',
      name: 'Анна Петрова',
      currentRole: 'Senior Frontend Developer',
      department: 'IT',
      location: 'Москва',
      skills: [
        { name: 'React', level: 5, endorsed: true },
        { name: 'TypeScript', level: 4, endorsed: true },
        { name: 'Node.js', level: 3, endorsed: false }
      ],
      experience: 6,
      education: 'МГУ, Прикладная математика',
      matchScore: 95,
      availability: 'interested',
      lastActive: '2 дня назад',
      email: 'anna.petrova@company.com',
      phone: '+7 (999) 123-45-67',
      summary: 'Опытный фронтенд-разработчик с сильными навыками в React и TypeScript. Интересуется новыми технологиями и готова к карьерному росту.'
    },
    {
      id: '2',
      name: 'Михаил Сидоров',
      currentRole: 'Data Analyst',
      department: 'Analytics',
      location: 'СПб',
      skills: [
        { name: 'Python', level: 4, endorsed: true },
        { name: 'SQL', level: 5, endorsed: true },
        { name: 'Machine Learning', level: 3, endorsed: false }
      ],
      experience: 4,
      education: 'СПбГУ, Математика',
      matchScore: 87,
      availability: 'available',
      lastActive: '1 день назад',
      email: 'mikhail.sidorov@company.com',
      summary: 'Аналитик данных с опытом работы с большими данными. Стремится развиваться в направлении машинного обучения.'
    },
    {
      id: '3',
      name: 'Елена Козлова',
      currentRole: 'UX Designer',
      department: 'Design',
      location: 'Москва',
      skills: [
        { name: 'Figma', level: 5, endorsed: true },
        { name: 'User Research', level: 4, endorsed: true },
        { name: 'Prototyping', level: 4, endorsed: false }
      ],
      experience: 5,
      education: 'МГХПА, Дизайн',
      matchScore: 82,
      availability: 'not_available',
      lastActive: '5 дней назад',
      email: 'elena.kozlova@company.com',
      summary: 'UX дизайнер с фокусом на пользовательском опыте. Имеет опыт проведения исследований и создания прототипов.'
    }
  ]);

  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>(candidates);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [shortlist, setShortlist] = useState<string[]>([]);

  const departments = ['IT', 'Analytics', 'Design', 'Marketing', 'Sales', 'HR'];
  const locations = ['Москва', 'СПб', 'Екатеринбург', 'Новосибирск', 'Удаленно'];
  const availableSkills = [
    'React', 'TypeScript', 'Python', 'SQL', 'Machine Learning',
    'Figma', 'User Research', 'Node.js', 'Java', 'C#', 'Docker'
  ];

  useEffect(() => {
    applyFilters();
  }, [filters]);

  const applyFilters = () => {
    let filtered = candidates.filter(candidate => {
      // Text search
      if (filters.query) {
        const query = filters.query.toLowerCase();
        const searchText = `${candidate.name} ${candidate.currentRole} ${candidate.skills.map(s => s.name).join(' ')}`.toLowerCase();
        if (!searchText.includes(query)) return false;
      }

      // Department filter
      if (filters.department && candidate.department !== filters.department) {
        return false;
      }

      // Location filter
      if (filters.location && candidate.location !== filters.location) {
        return false;
      }

      // Experience range
      if (candidate.experience < filters.experienceRange[0] || 
          candidate.experience > filters.experienceRange[1]) {
        return false;
      }

      // Skills filter
      if (filters.skills.length > 0) {
        const candidateSkills = candidate.skills.map(s => s.name);
        const hasRequiredSkills = filters.skills.some(skill => 
          candidateSkills.includes(skill)
        );
        if (!hasRequiredSkills) return false;
      }

      // Availability filter
      if (filters.availability && candidate.availability !== filters.availability) {
        return false;
      }

      // Match score filter
      if (candidate.matchScore && candidate.matchScore < filters.minMatchScore) {
        return false;
      }

      return true;
    });

    setFilteredCandidates(filtered);
  };

  const handleSearch = () => {
    applyFilters();
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      department: '',
      location: '',
      experienceRange: [0, 20],
      skills: [],
      availability: '',
      minMatchScore: 0
    });
  };

  const addToShortlist = (candidateId: string) => {
    if (!shortlist.includes(candidateId)) {
      setShortlist([...shortlist, candidateId]);
    }
  };

  const removeFromShortlist = (candidateId: string) => {
    setShortlist(shortlist.filter(id => id !== candidateId));
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available': return 'success';
      case 'interested': return 'warning';
      case 'not_available': return 'error';
      default: return 'default';
    }
  };

  const getAvailabilityText = (availability: string) => {
    switch (availability) {
      case 'available': return 'Доступен';
      case 'interested': return 'Заинтересован';
      case 'not_available': return 'Недоступен';
      default: return 'Неизвестно';
    }
  };

  const CandidateCard: React.FC<{ candidate: Candidate }> = ({ candidate }) => (
    <Card sx={{ mb: 2, position: 'relative' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box display="flex" alignItems="center">
            <Avatar 
              src={candidate.avatar} 
              sx={{ width: 60, height: 60, mr: 2 }}
            >
              {candidate.name.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="h6" component="div">
                {candidate.name}
              </Typography>
              <Typography color="textSecondary" gutterBottom>
                {candidate.currentRole}
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Chip 
                  label={candidate.department} 
                  size="small" 
                  variant="outlined" 
                />
                <Chip 
                  label={candidate.location} 
                  size="small" 
                  variant="outlined"
                  icon={<LocationIcon />}
                />
                <Chip 
                  label={getAvailabilityText(candidate.availability)}
                  size="small"
                  color={getAvailabilityColor(candidate.availability) as any}
                />
              </Box>
            </Box>
          </Box>
          
          {candidate.matchScore && (
            <Box textAlign="center">
              <Typography variant="h5" color="primary">
                {candidate.matchScore}%
              </Typography>
              <Typography variant="caption" color="textSecondary">
                соответствие
              </Typography>
            </Box>
          )}
        </Box>

        <Typography variant="body2" color="textSecondary" mb={2}>
          {candidate.summary}
        </Typography>

        <Box mb={2}>
          <Typography variant="subtitle2" gutterBottom>
            Ключевые навыки:
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {candidate.skills.slice(0, 5).map((skill) => (
              <Chip
                key={skill.name}
                label={`${skill.name} (${skill.level}/5)`}
                size="small"
                color={skill.endorsed ? 'primary' : 'default'}
                variant={skill.endorsed ? 'filled' : 'outlined'}
              />
            ))}
            {candidate.skills.length > 5 && (
              <Chip
                label={`+${candidate.skills.length - 5} еще`}
                size="small"
                variant="outlined"
              />
            )}
          </Box>
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="body2" color="textSecondary">
              <WorkIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
              {candidate.experience} лет опыта
            </Typography>
            <Typography variant="body2" color="textSecondary">
              <SchoolIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
              {candidate.education}
            </Typography>
          </Box>
          
          <Box display="flex" gap={1}>
            <Tooltip title="Посмотреть профиль">
              <IconButton 
                size="small"
                onClick={() => {
                  setSelectedCandidate(candidate);
                  setShowProfile(true);
                }}
              >
                <VisibilityIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title={shortlist.includes(candidate.id) ? "Убрать из shortlist" : "Добавить в shortlist"}>
              <IconButton 
                size="small"
                color={shortlist.includes(candidate.id) ? "primary" : "default"}
                onClick={() => {
                  if (shortlist.includes(candidate.id)) {
                    removeFromShortlist(candidate.id);
                  } else {
                    addToShortlist(candidate.id);
                  }
                }}
              >
                <PersonAddIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Поиск кандидатов
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Найдите подходящих кандидатов для ваших вакансий
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Filters Sidebar */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">
                Фильтры
              </Typography>
              <Button 
                size="small" 
                onClick={clearFilters}
                startIcon={<ClearIcon />}
              >
                Очистить
              </Button>
            </Box>

            {/* Search Query */}
            <TextField
              fullWidth
              label="Поиск"
              value={filters.query}
              onChange={(e) => setFilters({...filters, query: e.target.value})}
              sx={{ mb: 3 }}
              InputProps={{
                endAdornment: (
                  <IconButton onClick={handleSearch}>
                    <SearchIcon />
                  </IconButton>
                )
              }}
            />

            {/* Department Filter */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Подразделение</InputLabel>
              <Select
                value={filters.department}
                onChange={(e) => setFilters({...filters, department: e.target.value})}
                label="Подразделение"
              >
                <MenuItem value="">Все</MenuItem>
                {departments.map(dept => (
                  <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Location Filter */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Локация</InputLabel>
              <Select
                value={filters.location}
                onChange={(e) => setFilters({...filters, location: e.target.value})}
                label="Локация"
              >
                <MenuItem value="">Все</MenuItem>
                {locations.map(location => (
                  <MenuItem key={location} value={location}>{location}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Experience Range */}
            <Box sx={{ mb: 3 }}>
              <Typography gutterBottom>
                Опыт работы: {filters.experienceRange[0]}-{filters.experienceRange[1]} лет
              </Typography>
              <Slider
                value={filters.experienceRange}
                onChange={(e, newValue) => setFilters({...filters, experienceRange: newValue as [number, number]})}
                valueLabelDisplay="auto"
                min={0}
                max={20}
              />
            </Box>

            {/* Skills Filter */}
            <Autocomplete
              multiple
              options={availableSkills}
              value={filters.skills}
              onChange={(e, newValue) => setFilters({...filters, skills: newValue})}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Навыки"
                  placeholder="Выберите навыки"
                />
              )}
              sx={{ mb: 3 }}
            />

            {/* Availability Filter */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Доступность</InputLabel>
              <Select
                value={filters.availability}
                onChange={(e) => setFilters({...filters, availability: e.target.value})}
                label="Доступность"
              >
                <MenuItem value="">Все</MenuItem>
                <MenuItem value="available">Доступен</MenuItem>
                <MenuItem value="interested">Заинтересован</MenuItem>
                <MenuItem value="not_available">Недоступен</MenuItem>
              </Select>
            </FormControl>

            {/* Match Score Filter */}
            <Box sx={{ mb: 3 }}>
              <Typography gutterBottom>
                Минимальное соответствие: {filters.minMatchScore}%
              </Typography>
              <Slider
                value={filters.minMatchScore}
                onChange={(e, newValue) => setFilters({...filters, minMatchScore: newValue as number})}
                valueLabelDisplay="auto"
                min={0}
                max={100}
                step={5}
              />
            </Box>

            {/* Shortlist Info */}
            {shortlist.length > 0 && (
              <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                <Typography variant="body2" color="primary.contrastText">
                  В shortlist: {shortlist.length} кандидатов
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Results */}
        <Grid item xs={12} md={9}>
          <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Найдено кандидатов: {filteredCandidates.length}
            </Typography>
            <Button variant="outlined" startIcon={<FilterListIcon />}>
              Сортировка
            </Button>
          </Box>

          {filteredCandidates.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                Кандидаты не найдены
              </Typography>
              <Typography color="textSecondary">
                Попробуйте изменить параметры поиска
              </Typography>
            </Paper>
          ) : (
            filteredCandidates.map(candidate => (
              <CandidateCard key={candidate.id} candidate={candidate} />
            ))
          )}
        </Grid>
      </Grid>

      {/* Candidate Profile Dialog */}
      <Dialog 
        open={showProfile} 
        onClose={() => setShowProfile(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedCandidate && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center">
                <Avatar 
                  src={selectedCandidate.avatar} 
                  sx={{ width: 50, height: 50, mr: 2 }}
                >
                  {selectedCandidate.name.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {selectedCandidate.name}
                  </Typography>
                  <Typography color="textSecondary">
                    {selectedCandidate.currentRole}
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>
            
            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Контактная информация
                  </Typography>
                  <Box display="flex" alignItems="center" mb={1}>
                    <EmailIcon sx={{ mr: 1 }} />
                    <Typography>{selectedCandidate.email}</Typography>
                  </Box>
                  {selectedCandidate.phone && (
                    <Box display="flex" alignItems="center" mb={2}>
                      <PhoneIcon sx={{ mr: 1 }} />
                      <Typography>{selectedCandidate.phone}</Typography>
                    </Box>
                  )}
                  
                  <Typography variant="subtitle1" gutterBottom>
                    Основная информация
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Подразделение:</strong> {selectedCandidate.department}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Локация:</strong> {selectedCandidate.location}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Опыт:</strong> {selectedCandidate.experience} лет
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Образование:</strong> {selectedCandidate.education}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Навыки
                  </Typography>
                  {selectedCandidate.skills.map((skill) => (
                    <Box key={skill.name} display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2">
                        {skill.name}
                        {skill.endorsed && <StarIcon fontSize="small" color="primary" sx={{ ml: 0.5 }} />}
                      </Typography>
                      <Rating value={skill.level} max={5} size="small" readOnly />
                    </Box>
                  ))}
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    О кандидате
                  </Typography>
                  <Typography variant="body2">
                    {selectedCandidate.summary}
                  </Typography>
                </Grid>
              </Grid>
            </DialogContent>
            
            <DialogActions>
              <Button onClick={() => setShowProfile(false)}>
                Закрыть
              </Button>
              <Button 
                variant="contained"
                onClick={() => {
                  addToShortlist(selectedCandidate.id);
                  setShowProfile(false);
                }}
                disabled={shortlist.includes(selectedCandidate.id)}
              >
                {shortlist.includes(selectedCandidate.id) ? 'В shortlist' : 'Добавить в shortlist'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default CandidateSearch;