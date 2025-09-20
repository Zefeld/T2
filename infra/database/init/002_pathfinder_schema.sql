-- ============================================================================
-- PathFinder AI HR-Consultant Database Schema
-- Упрощенная модель данных для MVP
-- ============================================================================

-- Создание расширений для векторного поиска и полнотекстового поиска
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- SKILL GRAPH - ТАКСОНОМИЯ НАВЫКОВ
-- ============================================================================

-- Категории навыков
CREATE TYPE skill_category_new AS ENUM (
    'technical',
    'soft_skills', 
    'language',
    'certification',
    'domain_knowledge',
    'tool',
    'framework',
    'methodology'
);

-- Уровни владения навыками
CREATE TYPE skill_level_new AS ENUM (
    'novice',      -- 0-1 год
    'beginner',    -- 1-2 года
    'intermediate', -- 2-5 лет
    'advanced',    -- 5+ лет
    'expert'       -- 7+ лет, может обучать других
);

-- Расширенная таблица навыков с векторными эмбеддингами
CREATE TABLE skill_graph (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) UNIQUE NOT NULL,
    category skill_category_new NOT NULL,
    description TEXT,
    -- Иерархия навыков
    parent_skill_id UUID REFERENCES skill_graph(id),
    skill_path TEXT, -- путь в иерархии для быстрого поиска
    level INTEGER DEFAULT 1, -- уровень в иерархии
    -- Векторные эмбеддинги для семантического поиска
    embedding vector(1536), -- OpenAI ada-002 размерность
    -- Связи с ролями и курсами
    related_roles TEXT[], -- массив role_id
    related_courses TEXT[], -- массив course_id
    -- Метаданные
    popularity_score DECIMAL(5,2) DEFAULT 0, -- популярность навыка
    market_demand DECIMAL(5,2) DEFAULT 0, -- востребованность на рынке
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Связи между навыками (граф)
CREATE TABLE skill_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_skill_id UUID NOT NULL REFERENCES skill_graph(id),
    to_skill_id UUID NOT NULL REFERENCES skill_graph(id),
    relationship_type VARCHAR(50) NOT NULL, -- prerequisite, complement, alternative, upgrade
    strength DECIMAL(3,2) DEFAULT 1.0, -- сила связи 0.0-1.0
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(from_skill_id, to_skill_id, relationship_type)
);

-- ============================================================================
-- РОЛИ И ПОЗИЦИИ
-- ============================================================================

-- Типы ролей
CREATE TYPE role_type AS ENUM (
    'individual_contributor',
    'team_lead',
    'manager',
    'senior_manager',
    'director',
    'vp',
    'c_level'
);

-- Уровни сениорности
CREATE TYPE seniority_level AS ENUM (
    'intern',
    'junior',
    'middle',
    'senior',
    'principal',
    'staff',
    'distinguished'
);

-- Справочник ролей
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(300) NOT NULL,
    description TEXT,
    department VARCHAR(200),
    role_type role_type NOT NULL,
    seniority_level seniority_level NOT NULL,
    -- Требования к навыкам (JSON для гибкости)
    skills_required JSONB, -- [{skill_id, min_level, weight, is_critical}]
    soft_requirements TEXT[], -- массив требований
    -- Векторное представление роли
    embedding vector(1536),
    -- Карьерные пути
    career_paths JSONB, -- возможные переходы
    salary_range JSONB, -- {min, max, currency}
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- СОТРУДНИКИ (УПРОЩЕННАЯ МОДЕЛЬ)
-- ============================================================================

-- Статус готовности к мобильности
CREATE TYPE mobility_status AS ENUM (
    'not_ready',
    'considering',
    'ready',
    'actively_seeking'
);

-- Основная таблица сотрудников
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) UNIQUE, -- внешний ID сотрудника
    -- Базовая информация
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    department VARCHAR(200),
    current_role_id UUID REFERENCES roles(id),
    position VARCHAR(200),
    hire_date DATE,
    -- Навыки сотрудника
    skills JSONB, -- [{skill_id, level, experience_years, last_used, verified, source}]
    -- Карьерные предпочтения
    mobility_status mobility_status DEFAULT 'not_ready',
    preferred_roles UUID[], -- массив role_id
    ready_for_relocation BOOLEAN DEFAULT false,
    ready_for_remote BOOLEAN DEFAULT true,
    -- Профиль завершенности
    profile_completion INTEGER DEFAULT 0, -- процент заполненности
    last_profile_update TIMESTAMPTZ,
    -- Векторное представление профиля
    profile_embedding vector(1536),
    -- Метаданные
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ВАКАНСИИ (УПРОЩЕННАЯ МОДЕЛЬ)
-- ============================================================================

-- Статусы вакансий
CREATE TYPE vacancy_status_new AS ENUM (
    'draft',
    'published', 
    'paused',
    'filled',
    'cancelled'
);

-- Приоритеты вакансий
CREATE TYPE vacancy_priority AS ENUM (
    'low',
    'medium', 
    'high',
    'critical'
);

-- Таблица вакансий
CREATE TABLE vacancies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(300) NOT NULL,
    description TEXT,
    role_id UUID REFERENCES roles(id), -- связь со справочником ролей
    department VARCHAR(200),
    location VARCHAR(200),
    employment_type employment_type,
    -- Требования (могут переопределять роль)
    skills_required_override JSONB, -- переопределение требований роли
    min_experience_years INTEGER DEFAULT 0,
    -- Условия
    salary_range JSONB, -- {min, max, currency}
    benefits TEXT[],
    -- Статус и приоритет
    status vacancy_status_new NOT NULL DEFAULT 'draft',
    priority vacancy_priority DEFAULT 'medium',
    published_at TIMESTAMPTZ,
    closes_at TIMESTAMPTZ,
    -- Ответственные
    hiring_manager_id UUID REFERENCES users(id),
    hr_contact_id UUID REFERENCES users(id),
    created_by UUID NOT NULL REFERENCES users(id),
    -- Векторное представление вакансии
    jd_embedding vector(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- МАТЧИНГ И РЕКОМЕНДАЦИИ
-- ============================================================================

-- Результаты матчинга
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vacancy_id UUID NOT NULL REFERENCES vacancies(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    -- Скоры матчинга
    score_total DECIMAL(5,4) NOT NULL, -- общий скор 0.0-1.0
    score_hard DECIMAL(5,4) NOT NULL, -- хард скиллы
    score_soft DECIMAL(5,4) NOT NULL, -- софт скиллы
    score_experience DECIMAL(5,4) NOT NULL, -- опыт
    score_cultural DECIMAL(5,4) DEFAULT 0, -- культурное соответствие
    -- Анализ пробелов
    skill_gaps JSONB, -- [{skill_id, required_level, current_level, gap_severity}]
    strengths JSONB, -- сильные стороны кандидата
    -- Объяснимость
    explanation TEXT, -- текстовое объяснение матчинга
    explanation_factors JSONB, -- факторы влияющие на скор
    -- Статус рекомендации
    status VARCHAR(50) DEFAULT 'pending', -- pending, viewed, interested, applied, rejected
    viewed_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    hr_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(vacancy_id, employee_id)
);

-- ============================================================================
-- КУРСЫ И ОБУЧЕНИЕ
-- ============================================================================

-- Форматы курсов
CREATE TYPE course_format AS ENUM (
    'online',
    'offline',
    'hybrid',
    'self_paced',
    'mentorship',
    'workshop',
    'certification'
);

-- Таблица курсов
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(300) NOT NULL,
    description TEXT,
    provider VARCHAR(200),
    format course_format NOT NULL,
    difficulty course_difficulty,
    duration_hours INTEGER,
    url VARCHAR(500),
    -- Связанные навыки
    skills JSONB, -- [{skill_id, level_gained, weight}]
    prerequisites JSONB, -- [{skill_id, min_level}]
    -- Стоимость и доступность
    cost DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    is_internal BOOLEAN DEFAULT false, -- внутренний курс компании
    -- Рейтинг и популярность
    rating DECIMAL(3,2),
    completion_rate DECIMAL(5,2),
    popularity_score DECIMAL(5,2) DEFAULT 0,
    -- Векторное представление
    embedding vector(1536),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ГЕЙМИФИКАЦИЯ (РАСШИРЕННАЯ)
-- ============================================================================

-- Типы квестов
CREATE TYPE quest_type AS ENUM (
    'profile_completion',
    'skill_development',
    'peer_interaction',
    'learning',
    'career_exploration',
    'weekly_challenge',
    'mystery_match'
);

-- Статусы квестов
CREATE TYPE quest_status AS ENUM (
    'available',
    'active',
    'completed',
    'expired',
    'locked'
);

-- Квесты и челленджи
CREATE TABLE quests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(300) NOT NULL,
    description TEXT,
    type quest_type NOT NULL,
    -- Условия выполнения
    requirements JSONB, -- условия для активации
    completion_criteria JSONB, -- критерии завершения
    -- Награды
    xp_reward INTEGER DEFAULT 0,
    badge_reward UUID REFERENCES achievements(id),
    unlock_rewards JSONB, -- что разблокируется
    -- Временные ограничения
    duration_days INTEGER, -- длительность квеста
    cooldown_days INTEGER DEFAULT 0, -- перерыв между повторениями
    max_completions INTEGER DEFAULT 1, -- максимум завершений
    -- Метаданные
    difficulty_level INTEGER DEFAULT 1,
    popularity_score DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Прогресс квестов пользователей
CREATE TABLE user_quests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quest_id UUID NOT NULL REFERENCES quests(id),
    status quest_status NOT NULL DEFAULT 'available',
    -- Прогресс
    progress_data JSONB, -- текущий прогресс
    completion_percentage INTEGER DEFAULT 0,
    -- Временные метки
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    -- Результаты
    final_score INTEGER,
    rewards_claimed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, quest_id, started_at)
);

-- Расширенная таблица достижений
CREATE TABLE pathfinder_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    icon_url VARCHAR(500),
    type achievement_type NOT NULL,
    category VARCHAR(50), -- career, learning, social, special
    -- Условия получения
    requirements JSONB,
    unlock_conditions JSONB,
    -- Награды
    xp_reward INTEGER DEFAULT 0,
    unlock_features TEXT[], -- разблокируемые функции
    -- Редкость и престиж
    rarity VARCHAR(20) DEFAULT 'common',
    prestige_points INTEGER DEFAULT 0,
    -- Статистика
    earned_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- АНАЛИТИКА И МЕТРИКИ
-- ============================================================================

-- Факты для HR-аналитики
CREATE TABLE hr_analytics_facts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fact_date DATE NOT NULL,
    -- Измерения
    department VARCHAR(200),
    role_id UUID REFERENCES roles(id),
    employee_id UUID REFERENCES employees(id),
    skill_id UUID REFERENCES skill_graph(id),
    -- Метрики профилей
    profile_completeness INTEGER,
    skills_count INTEGER,
    verified_skills_count INTEGER,
    -- Метрики мобильности
    mobility_readiness_score DECIMAL(5,2),
    internal_applications INTEGER DEFAULT 0,
    matches_generated INTEGER DEFAULT 0,
    matches_viewed INTEGER DEFAULT 0,
    -- Метрики обучения
    courses_enrolled INTEGER DEFAULT 0,
    courses_completed INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    quests_completed INTEGER DEFAULT 0,
    -- Временные метрики
    time_to_match_hours INTEGER,
    time_to_response_hours INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Агрегированная аналитика по подразделениям
CREATE TABLE department_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department VARCHAR(200) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    -- Метрики персонала
    total_employees INTEGER,
    active_profiles INTEGER,
    avg_profile_completeness DECIMAL(5,2),
    avg_skills_per_employee DECIMAL(5,2),
    -- Метрики мобильности
    mobility_ready_count INTEGER,
    internal_moves INTEGER,
    retention_rate DECIMAL(5,4),
    -- Метрики матчинга
    vacancies_posted INTEGER,
    avg_match_score DECIMAL(5,4),
    avg_time_to_fill_days INTEGER,
    -- Метрики вовлеченности
    active_learners INTEGER,
    avg_xp_per_employee INTEGER,
    quest_completion_rate DECIMAL(5,4),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(department, period_start, period_end)
);

-- ============================================================================
-- ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- ============================================================================

-- Skill Graph индексы
CREATE INDEX CONCURRENTLY idx_skill_graph_name_trgm ON skill_graph USING gin(name gin_trgm_ops);
CREATE INDEX CONCURRENTLY idx_skill_graph_category ON skill_graph(category);
CREATE INDEX CONCURRENTLY idx_skill_graph_embedding ON skill_graph USING ivfflat(embedding vector_cosine_ops);
CREATE INDEX CONCURRENTLY idx_skill_relationships_from ON skill_relationships(from_skill_id);
CREATE INDEX CONCURRENTLY idx_skill_relationships_to ON skill_relationships(to_skill_id);

-- Employees индексы
CREATE INDEX CONCURRENTLY idx_employees_user_id ON employees(user_id);
CREATE INDEX CONCURRENTLY idx_employees_department ON employees(department);
CREATE INDEX CONCURRENTLY idx_employees_current_role ON employees(current_role_id);
CREATE INDEX CONCURRENTLY idx_employees_mobility_status ON employees(mobility_status);
CREATE INDEX CONCURRENTLY idx_employees_profile_embedding ON employees USING ivfflat(profile_embedding vector_cosine_ops);
CREATE INDEX CONCURRENTLY idx_employees_skills ON employees USING gin(skills);

-- Roles индексы
CREATE INDEX CONCURRENTLY idx_roles_department ON roles(department);
CREATE INDEX CONCURRENTLY idx_roles_type_seniority ON roles(role_type, seniority_level);
CREATE INDEX CONCURRENTLY idx_roles_embedding ON roles USING ivfflat(embedding vector_cosine_ops);
CREATE INDEX CONCURRENTLY idx_roles_skills ON roles USING gin(skills_required);

-- Vacancies индексы
CREATE INDEX CONCURRENTLY idx_vacancies_status_priority ON vacancies(status, priority);
CREATE INDEX CONCURRENTLY idx_vacancies_department ON vacancies(department);
CREATE INDEX CONCURRENTLY idx_vacancies_role_id ON vacancies(role_id);
CREATE INDEX CONCURRENTLY idx_vacancies_embedding ON vacancies USING ivfflat(jd_embedding vector_cosine_ops);

-- Matches индексы
CREATE INDEX CONCURRENTLY idx_matches_vacancy_score ON matches(vacancy_id, score_total DESC);
CREATE INDEX CONCURRENTLY idx_matches_employee_score ON matches(employee_id, score_total DESC);
CREATE INDEX CONCURRENTLY idx_matches_status ON matches(status);

-- Courses индексы
CREATE INDEX CONCURRENTLY idx_courses_format_difficulty ON courses(format, difficulty);
CREATE INDEX CONCURRENTLY idx_courses_skills ON courses USING gin(skills);
CREATE INDEX CONCURRENTLY idx_courses_embedding ON courses USING ivfflat(embedding vector_cosine_ops);

-- Quests и геймификация индексы
CREATE INDEX CONCURRENTLY idx_quests_type_active ON quests(type, is_active);
CREATE INDEX CONCURRENTLY idx_user_quests_user_status ON user_quests(user_id, status);
CREATE INDEX CONCURRENTLY idx_user_quests_quest_status ON user_quests(quest_id, status);

-- Аналитика индексы
CREATE INDEX CONCURRENTLY idx_hr_analytics_facts_date_dept ON hr_analytics_facts(fact_date, department);
CREATE INDEX CONCURRENTLY idx_hr_analytics_facts_employee_date ON hr_analytics_facts(employee_id, fact_date);
CREATE INDEX CONCURRENTLY idx_department_metrics_dept_period ON department_metrics(department, period_start, period_end);

-- ============================================================================
-- ФУНКЦИИ ДЛЯ ВЕКТОРНОГО ПОИСКА И МАТЧИНГА
-- ============================================================================

-- Функция семантического поиска навыков
CREATE OR REPLACE FUNCTION search_skills_semantic(
    query_embedding vector(1536),
    limit_count INTEGER DEFAULT 10,
    similarity_threshold DECIMAL DEFAULT 0.7
)
RETURNS TABLE (
    skill_id UUID,
    skill_name VARCHAR,
    similarity DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sg.id,
        sg.name,
        (1 - (sg.embedding <=> query_embedding))::DECIMAL as similarity
    FROM skill_graph sg
    WHERE sg.is_active = true
        AND (1 - (sg.embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY sg.embedding <=> query_embedding
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Функция расчета скора матчинга
CREATE OR REPLACE FUNCTION calculate_match_score(
    employee_skills JSONB,
    required_skills JSONB
)
RETURNS JSONB AS $$
DECLARE
    total_score DECIMAL := 0;
    hard_score DECIMAL := 0;
    skill_count INTEGER := 0;
    result JSONB;
BEGIN
    -- Упрощенный алгоритм расчета скора
    -- В реальности здесь будет более сложная логика
    
    SELECT 
        COALESCE(AVG(
            CASE 
                WHEN emp_skill->>'level' >= req_skill->>'min_level' 
                THEN (req_skill->>'weight')::DECIMAL
                ELSE 0
            END
        ), 0),
        COUNT(*)
    INTO hard_score, skill_count
    FROM jsonb_array_elements(required_skills) req_skill
    LEFT JOIN jsonb_array_elements(employee_skills) emp_skill 
        ON emp_skill->>'skill_id' = req_skill->>'skill_id';
    
    total_score := hard_score;
    
    result := jsonb_build_object(
        'total_score', total_score,
        'hard_score', hard_score,
        'soft_score', 0.0,
        'experience_score', 0.0,
        'skill_count', skill_count
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ТРИГГЕРЫ ДЛЯ АВТОМАТИЧЕСКОГО ОБНОВЛЕНИЯ
-- ============================================================================

-- Триггер для обновления updated_at
CREATE TRIGGER update_skill_graph_updated_at BEFORE UPDATE ON skill_graph
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vacancies_updated_at BEFORE UPDATE ON vacancies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- КОММЕНТАРИИ К ТАБЛИЦАМ
-- ============================================================================

COMMENT ON TABLE skill_graph IS 'Таксономия навыков с векторными эмбеддингами для семантического поиска';
COMMENT ON TABLE skill_relationships IS 'Граф связей между навыками (пререквизиты, дополнения, альтернативы)';
COMMENT ON TABLE roles IS 'Справочник ролей с требованиями к навыкам и векторными представлениями';
COMMENT ON TABLE employees IS 'Упрощенная модель сотрудников с навыками и карьерными предпочтениями';
COMMENT ON TABLE vacancies IS 'Вакансии с возможностью переопределения требований роли';
COMMENT ON TABLE matches IS 'Результаты матчинга с объяснимостью и анализом пробелов';
COMMENT ON TABLE courses IS 'Курсы обучения с привязкой к навыкам и векторным поиском';
COMMENT ON TABLE quests IS 'Система квестов для геймификации и вовлечения';
COMMENT ON TABLE user_quests IS 'Прогресс пользователей по квестам';
COMMENT ON TABLE pathfinder_achievements IS 'Расширенная система достижений PathFinder';
COMMENT ON TABLE hr_analytics_facts IS 'Факты для HR-аналитики в формате Data Warehouse';
COMMENT ON TABLE department_metrics IS 'Агрегированные метрики по подразделениям';

-- Завершение инициализации PathFinder схемы
SELECT 'PathFinder database schema initialized successfully' AS status;