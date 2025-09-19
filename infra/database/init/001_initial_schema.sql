-- ============================================================================
-- Career Platform Database Schema
-- Создано в соответствии с принципами GDPR и требованиями безопасности OWASP
-- ============================================================================

-- Создание расширений
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- ПОЛЬЗОВАТЕЛИ И АУТЕНТИФИКАЦИЯ
-- ============================================================================

-- Роли пользователей
CREATE TYPE user_role AS ENUM (
    'employee',
    'hr_specialist', 
    'hr_manager',
    'team_lead',
    'admin',
    'system'
);

-- Статусы пользователей
CREATE TYPE user_status AS ENUM (
    'active',
    'inactive',
    'suspended',
    'deleted'
);

-- Таблица пользователей
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    external_id VARCHAR(255) UNIQUE, -- ID из OIDC провайдера
    role user_role NOT NULL DEFAULT 'employee',
    status user_status NOT NULL DEFAULT 'active',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- GDPR поля
    data_processing_consent BOOLEAN NOT NULL DEFAULT false,
    consent_date TIMESTAMPTZ,
    data_retention_until TIMESTAMPTZ,
    -- Аудит
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Сессии пользователей
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    -- OIDC данные
    id_token TEXT,
    access_token TEXT,
    token_expires_at TIMESTAMPTZ
);

-- Аудит событий аутентификации
CREATE TYPE auth_event_type AS ENUM (
    'login_success',
    'login_failed',
    'logout',
    'token_refresh',
    'session_expired',
    'password_reset',
    'account_locked',
    'suspicious_activity'
);

CREATE TABLE auth_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    event_type auth_event_type NOT NULL,
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- GDPR - ограниченное время хранения для логов
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days')
);

-- ============================================================================
-- ПРОФИЛИ ПОЛЬЗОВАТЕЛЕЙ
-- ============================================================================

-- Основная информация профиля
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    display_name VARCHAR(200),
    avatar_url VARCHAR(500),
    position VARCHAR(200),
    department VARCHAR(200),
    location VARCHAR(200),
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    bio TEXT,
    -- Контактная информация (с согласием на обработку)
    phone VARCHAR(20),
    telegram_username VARCHAR(50),
    linkedin_url VARCHAR(500),
    -- Карьерные предпочтения
    career_interests TEXT[],
    preferred_work_type VARCHAR(50), -- remote, office, hybrid
    ready_for_relocation BOOLEAN DEFAULT false,
    ready_for_rotation BOOLEAN DEFAULT false,
    -- Метаданные
    profile_completion_percentage INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- GDPR поля
    data_anonymized BOOLEAN DEFAULT false,
    anonymized_at TIMESTAMPTZ
);

-- Навыки пользователей
CREATE TYPE skill_level AS ENUM (
    'beginner',
    'intermediate', 
    'advanced',
    'expert'
);

CREATE TYPE skill_category AS ENUM (
    'technical',
    'soft_skills',
    'language',
    'certification',
    'domain_knowledge',
    'tool',
    'framework'
);

CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) UNIQUE NOT NULL,
    category skill_category NOT NULL,
    description TEXT,
    parent_skill_id UUID REFERENCES skills(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id),
    level skill_level NOT NULL,
    experience_years INTEGER,
    last_used_at TIMESTAMPTZ,
    verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, skill_id)
);

-- Опыт работы
CREATE TABLE work_experience (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(200) NOT NULL,
    position VARCHAR(200) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    is_current BOOLEAN DEFAULT false,
    achievements TEXT[],
    technologies TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Образование
CREATE TABLE education (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution VARCHAR(200) NOT NULL,
    degree VARCHAR(200),
    field_of_study VARCHAR(200),
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT false,
    gpa DECIMAL(3,2),
    achievements TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ОБУЧЕНИЕ И РАЗВИТИЕ
-- ============================================================================

-- Курсы и программы обучения
CREATE TYPE course_type AS ENUM (
    'online',
    'offline',
    'hybrid',
    'certification',
    'mentorship',
    'self_study'
);

CREATE TYPE course_difficulty AS ENUM (
    'beginner',
    'intermediate',
    'advanced'
);

CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(300) NOT NULL,
    description TEXT,
    type course_type NOT NULL,
    difficulty course_difficulty,
    duration_hours INTEGER,
    provider VARCHAR(200),
    url VARCHAR(500),
    skills TEXT[], -- связанные навыки
    prerequisites TEXT[],
    cost DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Прохождение курсов пользователями
CREATE TYPE enrollment_status AS ENUM (
    'enrolled',
    'in_progress',
    'completed',
    'failed',
    'cancelled'
);

CREATE TABLE course_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id),
    status enrollment_status NOT NULL DEFAULT 'enrolled',
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    progress_percentage INTEGER DEFAULT 0,
    final_score DECIMAL(5,2),
    certificate_url VARCHAR(500),
    feedback TEXT,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    UNIQUE(user_id, course_id)
);

-- Планы развития
CREATE TYPE plan_status AS ENUM (
    'draft',
    'active',
    'completed',
    'cancelled',
    'overdue'
);

CREATE TABLE development_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    target_role VARCHAR(200),
    target_skills UUID[], -- массив skill_id
    status plan_status NOT NULL DEFAULT 'draft',
    start_date DATE,
    target_date DATE,
    completion_percentage INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id), -- кто создал план
    approved_by UUID REFERENCES users(id), -- кто утвердил
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Задачи в планах развития
CREATE TYPE task_status AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'skipped',
    'overdue'
);

CREATE TABLE development_plan_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES development_plans(id) ON DELETE CASCADE,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    course_id UUID REFERENCES courses(id),
    skill_id UUID REFERENCES skills(id),
    status task_status NOT NULL DEFAULT 'pending',
    due_date DATE,
    completed_at TIMESTAMPTZ,
    estimated_hours INTEGER,
    actual_hours INTEGER,
    priority INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ГЕЙМИФИКАЦИЯ
-- ============================================================================

-- События для начисления XP
CREATE TYPE xp_event_type AS ENUM (
    'profile_completion',
    'skill_added',
    'skill_updated',
    'course_enrolled',
    'course_completed',
    'assessment_completed',
    'plan_created',
    'plan_completed',
    'feedback_given',
    'referral_made',
    'achievement_unlocked'
);

CREATE TABLE xp_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type xp_event_type NOT NULL,
    points INTEGER NOT NULL,
    description TEXT,
    metadata JSONB, -- дополнительные данные о событии
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Защита от фрода - ограничения по времени
    daily_limit_check DATE,
    is_valid BOOLEAN DEFAULT true,
    validated_by UUID REFERENCES users(id)
);

-- Баланс XP пользователей
CREATE TABLE user_xp_balances (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_points INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    points_to_next_level INTEGER DEFAULT 100,
    daily_points INTEGER DEFAULT 0,
    weekly_points INTEGER DEFAULT 0,
    monthly_points INTEGER DEFAULT 0,
    last_activity_date DATE DEFAULT CURRENT_DATE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Достижения и бейджи
CREATE TYPE achievement_type AS ENUM (
    'milestone',
    'streak',
    'completion',
    'excellence',
    'community',
    'special'
);

CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    type achievement_type NOT NULL,
    icon_url VARCHAR(500),
    points_reward INTEGER DEFAULT 0,
    requirements JSONB, -- условия получения
    is_active BOOLEAN DEFAULT true,
    rarity VARCHAR(20) DEFAULT 'common', -- common, uncommon, rare, epic, legendary
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id),
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    progress_data JSONB, -- прогресс к достижению
    UNIQUE(user_id, achievement_id)
);

-- ============================================================================
-- ВАКАНСИИ И КАРЬЕРНЫЕ ВОЗМОЖНОСТИ
-- ============================================================================

CREATE TYPE vacancy_status AS ENUM (
    'draft',
    'published',
    'paused',
    'closed',
    'filled'
);

CREATE TYPE employment_type AS ENUM (
    'full_time',
    'part_time',
    'contract',
    'internship',
    'temporary'
);

CREATE TABLE vacancies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(300) NOT NULL,
    description TEXT,
    department VARCHAR(200),
    location VARCHAR(200),
    employment_type employment_type NOT NULL,
    seniority_level VARCHAR(50), -- junior, middle, senior, lead, principal
    required_skills UUID[], -- массив skill_id
    preferred_skills UUID[],
    min_experience_years INTEGER DEFAULT 0,
    salary_min DECIMAL(12,2),
    salary_max DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'USD',
    benefits TEXT[],
    status vacancy_status NOT NULL DEFAULT 'draft',
    published_at TIMESTAMPTZ,
    closes_at TIMESTAMPTZ,
    -- Контактная информация
    hiring_manager_id UUID REFERENCES users(id),
    hr_contact_id UUID REFERENCES users(id),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Рекомендации вакансий пользователям
CREATE TABLE job_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vacancy_id UUID NOT NULL REFERENCES vacancies(id),
    similarity_score DECIMAL(5,4), -- 0.0 - 1.0
    match_factors JSONB, -- факторы совпадения
    explanation TEXT, -- объяснение рекомендации
    status VARCHAR(50) DEFAULT 'pending', -- pending, viewed, interested, applied, rejected
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    viewed_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    UNIQUE(user_id, vacancy_id)
);

-- ============================================================================
-- АНАЛИТИКА И ОТЧЕТНОСТЬ
-- ============================================================================

-- Факты для аналитики (подход Data Warehouse)
CREATE TABLE analytics_facts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fact_date DATE NOT NULL,
    user_id UUID REFERENCES users(id),
    department VARCHAR(200),
    skill_id UUID REFERENCES skills(id),
    course_id UUID REFERENCES courses(id),
    vacancy_id UUID REFERENCES vacancies(id),
    -- Метрики
    profile_completeness INTEGER,
    skill_count INTEGER,
    xp_earned INTEGER,
    courses_enrolled INTEGER,
    courses_completed INTEGER,
    recommendations_count INTEGER,
    applications_count INTEGER,
    -- Временные метрики
    time_to_complete_course INTEGER, -- в днях
    time_to_respond_recommendation INTEGER, -- в часах
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Агрегированная аналитика по подразделениям
CREATE TABLE department_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department VARCHAR(200) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    -- Метрики персонала
    total_employees INTEGER,
    active_learners INTEGER,
    avg_skill_count DECIMAL(5,2),
    avg_profile_completeness DECIMAL(5,2),
    -- Метрики обучения
    total_course_enrollments INTEGER,
    completion_rate DECIMAL(5,4),
    avg_course_rating DECIMAL(3,2),
    -- Метрики мобильности
    internal_applications INTEGER,
    successful_transitions INTEGER,
    retention_rate DECIMAL(5,4),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(department, period_start, period_end)
);

-- ============================================================================
-- ГОЛОСОВОЙ ПОМОЩНИК И ДИАЛОГИ
-- ============================================================================

-- Транскрипты голосовых сессий
CREATE TABLE voice_transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(100),
    audio_file_path VARCHAR(500),
    transcript_text TEXT,
    language VARCHAR(10),
    confidence DECIMAL(5,4),
    -- Временные метки
    duration_seconds DECIMAL(8,3),
    timestamps JSONB, -- массив {word, start, end}
    -- STT метаданные
    stt_model VARCHAR(100),
    stt_version VARCHAR(50),
    processing_time_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- GDPR - ограниченное время хранения
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '365 days')
);

-- Диалоги с ассистентом
CREATE TYPE message_role AS ENUM (
    'user',
    'assistant',
    'system'
);

CREATE TABLE conversation_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role message_role NOT NULL,
    content TEXT NOT NULL,
    transcript_id UUID REFERENCES voice_transcripts(id),
    -- LLM метаданные
    llm_model VARCHAR(100),
    llm_tokens_used INTEGER,
    llm_processing_time_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- GDPR - ограниченное время хранения
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '365 days')
);

-- ============================================================================
-- УВЕДОМЛЕНИЯ И КОММУНИКАЦИИ
-- ============================================================================

CREATE TYPE notification_type AS ENUM (
    'course_reminder',
    'plan_deadline',
    'new_recommendation', 
    'achievement_earned',
    'skill_verification',
    'system_update',
    'privacy_notice'
);

CREATE TYPE notification_channel AS ENUM (
    'in_app',
    'email',
    'push',
    'sms'
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    channel notification_channel NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    read BOOLEAN DEFAULT false,
    sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- GDPR
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days')
);

-- Настройки уведомлений пользователей
CREATE TABLE user_notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    frequency VARCHAR(20) DEFAULT 'immediate', -- immediate, daily, weekly
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '08:00',
    timezone VARCHAR(50) DEFAULT 'UTC',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- ============================================================================

-- Пользователи и аутентификация
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_users_external_id ON users(external_id);
CREATE INDEX CONCURRENTLY idx_users_role_status ON users(role, status);
CREATE INDEX CONCURRENTLY idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX CONCURRENTLY idx_user_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX CONCURRENTLY idx_user_sessions_user_expires ON user_sessions(user_id, expires_at);

-- Профили и навыки
CREATE INDEX CONCURRENTLY idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX CONCURRENTLY idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX CONCURRENTLY idx_user_skills_skill_level ON user_skills(skill_id, level);
CREATE INDEX CONCURRENTLY idx_skills_category ON skills(category);
CREATE INDEX CONCURRENTLY idx_skills_name_trgm ON skills USING gin(name gin_trgm_ops);

-- Обучение
CREATE INDEX CONCURRENTLY idx_courses_type_active ON courses(type, is_active);
CREATE INDEX CONCURRENTLY idx_course_enrollments_user_status ON course_enrollments(user_id, status);
CREATE INDEX CONCURRENTLY idx_development_plans_user_status ON development_plans(user_id, status);

-- Геймификация
CREATE INDEX CONCURRENTLY idx_xp_events_user_date ON xp_events(user_id, created_at);
CREATE INDEX CONCURRENTLY idx_xp_events_type_date ON xp_events(event_type, created_at);
CREATE INDEX CONCURRENTLY idx_user_achievements_user_id ON user_achievements(user_id);

-- Вакансии и рекомендации
CREATE INDEX CONCURRENTLY idx_vacancies_status_published ON vacancies(status, published_at);
CREATE INDEX CONCURRENTLY idx_job_recommendations_user_score ON job_recommendations(user_id, similarity_score DESC);
CREATE INDEX CONCURRENTLY idx_job_recommendations_vacancy ON job_recommendations(vacancy_id);

-- Аналитика
CREATE INDEX CONCURRENTLY idx_analytics_facts_date_user ON analytics_facts(fact_date, user_id);
CREATE INDEX CONCURRENTLY idx_analytics_facts_department_date ON analytics_facts(department, fact_date);

-- Голосовые данные
CREATE INDEX CONCURRENTLY idx_voice_transcripts_user_date ON voice_transcripts(user_id, created_at);
CREATE INDEX CONCURRENTLY idx_voice_transcripts_session ON voice_transcripts(session_id);
CREATE INDEX CONCURRENTLY idx_conversation_messages_conversation ON conversation_messages(conversation_id, created_at);

-- Уведомления
CREATE INDEX CONCURRENTLY idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX CONCURRENTLY idx_notifications_type_created ON notifications(type, created_at);

-- ============================================================================
-- ФУНКЦИИ И ТРИГГЕРЫ
-- ============================================================================

-- Функция обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для обновления updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_skills_updated_at BEFORE UPDATE ON user_skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_development_plans_updated_at BEFORE UPDATE ON development_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Функция вычисления уровня на основе XP
CREATE OR REPLACE FUNCTION calculate_level(total_xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
    -- Формула: level = floor(sqrt(total_xp / 100)) + 1
    RETURN GREATEST(1, FLOOR(SQRT(total_xp::NUMERIC / 100.0)) + 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Функция обновления XP баланса
CREATE OR REPLACE FUNCTION update_xp_balance()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_xp_balances (user_id, total_points) 
    VALUES (NEW.user_id, NEW.points)
    ON CONFLICT (user_id) DO UPDATE SET
        total_points = user_xp_balances.total_points + NEW.points,
        current_level = calculate_level(user_xp_balances.total_points + NEW.points),
        points_to_next_level = (calculate_level(user_xp_balances.total_points + NEW.points) + 1) * 
                               (calculate_level(user_xp_balances.total_points + NEW.points) + 1) * 100 -
                               (user_xp_balances.total_points + NEW.points),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления XP баланса
CREATE TRIGGER update_user_xp_balance_trigger
    AFTER INSERT ON xp_events
    FOR EACH ROW EXECUTE FUNCTION update_xp_balance();

-- Функция очистки истекших данных (GDPR compliance)
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
BEGIN
    -- Очистка истекших логов аутентификации
    DELETE FROM auth_audit_log WHERE expires_at < NOW();
    
    -- Очистка истекших транскриптов
    DELETE FROM voice_transcripts WHERE expires_at < NOW();
    
    -- Очистка истекших сообщений диалогов
    DELETE FROM conversation_messages WHERE expires_at < NOW();
    
    -- Очистка истекших уведомлений
    DELETE FROM notifications WHERE expires_at < NOW();
    
    RAISE NOTICE 'Expired data cleanup completed';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS (Row Level Security) ДЛЯ GDPR
-- ============================================================================

-- Включаем RLS для критически важных таблиц
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- Политики доступа к профилям
CREATE POLICY user_profile_policy ON user_profiles
    FOR ALL USING (
        user_id = current_setting('app.current_user_id')::UUID OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = current_setting('app.current_user_id')::UUID 
            AND role IN ('hr_manager', 'admin')
        )
    );

-- Политики доступа к голосовым данным
CREATE POLICY voice_transcript_policy ON voice_transcripts
    FOR ALL USING (
        user_id = current_setting('app.current_user_id')::UUID OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = current_setting('app.current_user_id')::UUID 
            AND role IN ('admin')
        )
    );

-- ============================================================================
-- КОММЕНТАРИИ К ТАБЛИЦАМ
-- ============================================================================

COMMENT ON TABLE users IS 'Основная таблица пользователей с OIDC интеграцией и GDPR полями';
COMMENT ON TABLE user_sessions IS 'Сессии пользователей с поддержкой OIDC токенов';
COMMENT ON TABLE auth_audit_log IS 'Аудит событий аутентификации с автоматической очисткой';
COMMENT ON TABLE user_profiles IS 'Профили пользователей с возможностью анонимизации';
COMMENT ON TABLE skills IS 'Справочник навыков с категоризацией и иерархией';
COMMENT ON TABLE user_skills IS 'Навыки пользователей с уровнями и верификацией';
COMMENT ON TABLE xp_events IS 'События геймификации с защитой от фрода';
COMMENT ON TABLE user_xp_balances IS 'Балансы XP пользователей с уровнями';
COMMENT ON TABLE voice_transcripts IS 'Транскрипты голосовых сессий с ограниченным временем хранения';
COMMENT ON TABLE conversation_messages IS 'Сообщения диалогов с ИИ-ассистентом';
COMMENT ON TABLE analytics_facts IS 'Факты для аналитики в формате Data Warehouse';

-- Завершение инициализации
SELECT 'Database schema initialized successfully' AS status;
