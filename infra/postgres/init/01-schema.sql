-- Career Development Platform Database Schema
-- GDPR Compliant with data retention and audit capabilities

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS profiles;
CREATE SCHEMA IF NOT EXISTS learning;
CREATE SCHEMA IF NOT EXISTS gamification;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS jobs;
CREATE SCHEMA IF NOT EXISTS audit;

-- ============================================================================
-- AUTH SCHEMA - Authentication and Authorization
-- ============================================================================

-- Users table
CREATE TABLE auth.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(255) UNIQUE NOT NULL, -- OIDC subject
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    preferred_username VARCHAR(100),
    locale VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    gdpr_consent_at TIMESTAMP WITH TIME ZONE,
    data_retention_until TIMESTAMP WITH TIME ZONE
);

-- Roles table
CREATE TABLE auth.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User roles junction table
CREATE TABLE auth.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES auth.roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, role_id)
);

-- Sessions table
CREATE TABLE auth.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    access_token_hash VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- ============================================================================
-- PROFILES SCHEMA - User profiles and skills
-- ============================================================================

-- User profiles
CREATE TABLE profiles.user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bio TEXT,
    department VARCHAR(100),
    position VARCHAR(100),
    manager_id UUID REFERENCES auth.users(id),
    hire_date DATE,
    location VARCHAR(100),
    phone VARCHAR(20),
    linkedin_url VARCHAR(255),
    github_url VARCHAR(255),
    avatar_url VARCHAR(255),
    preferences JSONB DEFAULT '{}',
    visibility_settings JSONB DEFAULT '{"profile": "internal", "skills": "internal", "progress": "manager"}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Skills catalog
CREATE TABLE profiles.skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    level_definitions JSONB DEFAULT '{"beginner": "Basic understanding", "intermediate": "Practical experience", "advanced": "Expert level", "expert": "Industry leader"}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User skills
CREATE TABLE profiles.user_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES profiles.skills(id) ON DELETE CASCADE,
    level VARCHAR(20) DEFAULT 'beginner' CHECK (level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    years_experience INTEGER DEFAULT 0,
    last_used_date DATE,
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    evidence_urls TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, skill_id)
);

-- ============================================================================
-- LEARNING SCHEMA - Courses, assessments, and development plans
-- ============================================================================

-- Courses catalog
CREATE TABLE learning.courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    difficulty_level VARCHAR(20) DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    duration_hours INTEGER,
    provider VARCHAR(100),
    external_url VARCHAR(500),
    skills_covered UUID[] DEFAULT '{}',
    prerequisites UUID[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User course enrollments
CREATE TABLE learning.course_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES learning.courses(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'in_progress', 'completed', 'dropped')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    certificate_url VARCHAR(500),
    UNIQUE(user_id, course_id)
);

-- Development plans
CREATE TABLE learning.development_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    target_role VARCHAR(100),
    target_skills UUID[] DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
    start_date DATE,
    target_date DATE,
    created_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Development plan tasks
CREATE TABLE learning.plan_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES learning.development_plans(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    task_type VARCHAR(20) DEFAULT 'course' CHECK (task_type IN ('course', 'project', 'mentoring', 'assessment', 'other')),
    related_course_id UUID REFERENCES learning.courses(id),
    priority INTEGER DEFAULT 1,
    estimated_hours INTEGER,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assessments
CREATE TABLE learning.assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES profiles.skills(id) ON DELETE CASCADE,
    assessment_type VARCHAR(20) DEFAULT 'self' CHECK (assessment_type IN ('self', 'peer', 'manager', 'external')),
    assessor_id UUID REFERENCES auth.users(id),
    score INTEGER CHECK (score >= 0 AND score <= 100),
    level_achieved VARCHAR(20) CHECK (level_achieved IN ('beginner', 'intermediate', 'advanced', 'expert')),
    feedback TEXT,
    evidence_urls TEXT[],
    valid_until DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recommendations
CREATE TABLE learning.recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(20) DEFAULT 'course' CHECK (recommendation_type IN ('course', 'skill', 'role', 'mentor')),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    related_course_id UUID REFERENCES learning.courses(id),
    related_skill_id UUID REFERENCES profiles.skills(id),
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    reasoning TEXT,
    llm_model_version VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- GAMIFICATION SCHEMA - XP, badges, achievements
-- ============================================================================

-- XP events
CREATE TABLE gamification.xp_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_description TEXT,
    xp_amount INTEGER NOT NULL,
    related_entity_type VARCHAR(50),
    related_entity_id UUID,
    multiplier DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User XP totals
CREATE TABLE gamification.user_xp (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_xp INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    xp_to_next_level INTEGER DEFAULT 100,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Badges catalog
CREATE TABLE gamification.badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon_url VARCHAR(255),
    category VARCHAR(50),
    rarity VARCHAR(20) DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
    criteria JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User badges
CREATE TABLE gamification.user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES gamification.badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    progress_data JSONB DEFAULT '{}',
    UNIQUE(user_id, badge_id)
);

-- Achievements
CREATE TABLE gamification.achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(50),
    points INTEGER DEFAULT 0,
    requirements JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User achievements
CREATE TABLE gamification.user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES gamification.achievements(id) ON DELETE CASCADE,
    achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    progress_data JSONB DEFAULT '{}',
    UNIQUE(user_id, achievement_id)
);

-- ============================================================================
-- JOBS SCHEMA - Vacancies and matching
-- ============================================================================

-- Vacancies
CREATE TABLE jobs.vacancies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    department VARCHAR(100),
    location VARCHAR(100),
    employment_type VARCHAR(20) DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'internship')),
    seniority_level VARCHAR(20) DEFAULT 'mid' CHECK (seniority_level IN ('junior', 'mid', 'senior', 'lead', 'principal')),
    required_skills UUID[] DEFAULT '{}',
    preferred_skills UUID[] DEFAULT '{}',
    min_experience_years INTEGER DEFAULT 0,
    salary_range_min INTEGER,
    salary_range_max INTEGER,
    currency VARCHAR(3) DEFAULT 'USD',
    posted_by UUID REFERENCES auth.users(id),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('draft', 'open', 'closed', 'filled')),
    applications_count INTEGER DEFAULT 0,
    posted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closes_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Job applications
CREATE TABLE jobs.applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vacancy_id UUID NOT NULL REFERENCES jobs.vacancies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'applied' CHECK (status IN ('applied', 'screening', 'interview', 'offer', 'accepted', 'rejected', 'withdrawn')),
    cover_letter TEXT,
    resume_url VARCHAR(500),
    match_score DECIMAL(3,2) CHECK (match_score >= 0 AND match_score <= 1),
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(vacancy_id, user_id)
);

-- Job matches (AI-generated recommendations)
CREATE TABLE jobs.matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vacancy_id UUID NOT NULL REFERENCES jobs.vacancies(id) ON DELETE CASCADE,
    match_score DECIMAL(3,2) NOT NULL CHECK (match_score >= 0 AND match_score <= 1),
    skill_match_score DECIMAL(3,2) CHECK (skill_match_score >= 0 AND skill_match_score <= 1),
    experience_match_score DECIMAL(3,2) CHECK (experience_match_score >= 0 AND experience_match_score <= 1),
    reasoning TEXT,
    missing_skills UUID[] DEFAULT '{}',
    matching_skills UUID[] DEFAULT '{}',
    llm_model_version VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, vacancy_id)
);

-- ============================================================================
-- ANALYTICS SCHEMA - Reporting and metrics
-- ============================================================================

-- Analytics facts table
CREATE TABLE analytics.facts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fact_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    dimensions JSONB DEFAULT '{}',
    metrics JSONB DEFAULT '{}',
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User activity logs
CREATE TABLE analytics.user_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    activity_description TEXT,
    entity_type VARCHAR(50),
    entity_id UUID,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STT/TTS SCHEMA - Speech processing
-- ============================================================================

-- STT jobs
CREATE TABLE stt_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    audio_file_url VARCHAR(500) NOT NULL,
    audio_duration_seconds INTEGER,
    model_version VARCHAR(50),
    language VARCHAR(10),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    transcript TEXT,
    confidence_score DECIMAL(3,2),
    word_timestamps JSONB,
    processing_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- TTS jobs
CREATE TABLE tts_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    text_content TEXT NOT NULL,
    voice_id VARCHAR(50),
    sample_rate INTEGER DEFAULT 22050,
    model_version VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    audio_file_url VARCHAR(500),
    audio_duration_seconds INTEGER,
    processing_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Transcripts (for voice assistant conversations)
CREATE TABLE transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    message_type VARCHAR(10) CHECK (message_type IN ('user', 'assistant')),
    content TEXT NOT NULL,
    audio_file_url VARCHAR(500),
    stt_job_id UUID REFERENCES stt_jobs(id),
    tts_job_id UUID REFERENCES tts_jobs(id),
    confidence_score DECIMAL(3,2),
    word_timestamps JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LLM traces
CREATE TABLE llm_traces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    session_id UUID,
    request_id VARCHAR(100) UNIQUE NOT NULL,
    model_name VARCHAR(100),
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    request_data JSONB,
    response_data JSONB,
    latency_ms INTEGER,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'timeout')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- AUDIT SCHEMA - GDPR and security audit logs
-- ============================================================================

-- Audit logs
CREATE TABLE audit.logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data access logs (GDPR compliance)
CREATE TABLE audit.data_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    accessed_user_id UUID REFERENCES auth.users(id),
    data_type VARCHAR(50) NOT NULL,
    access_reason VARCHAR(100),
    legal_basis VARCHAR(50),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GDPR requests
CREATE TABLE audit.gdpr_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('access', 'rectification', 'erasure', 'portability', 'restriction')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
    description TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES auth.users(id),
    response_data JSONB,
    notes TEXT
);

-- ============================================================================
-- INDEXES for performance
-- ============================================================================

-- Auth indexes
CREATE INDEX idx_users_external_id ON auth.users(external_id);
CREATE INDEX idx_users_email ON auth.users(email);
CREATE INDEX idx_users_status ON auth.users(status);
CREATE INDEX idx_sessions_user_id ON auth.sessions(user_id);
CREATE INDEX idx_sessions_token ON auth.sessions(session_token);
CREATE INDEX idx_sessions_expires_at ON auth.sessions(expires_at);

-- Profiles indexes
CREATE INDEX idx_user_profiles_user_id ON profiles.user_profiles(user_id);
CREATE INDEX idx_user_skills_user_id ON profiles.user_skills(user_id);
CREATE INDEX idx_user_skills_skill_id ON profiles.user_skills(skill_id);
CREATE INDEX idx_skills_category ON profiles.skills(category);

-- Learning indexes
CREATE INDEX idx_course_enrollments_user_id ON learning.course_enrollments(user_id);
CREATE INDEX idx_course_enrollments_course_id ON learning.course_enrollments(course_id);
CREATE INDEX idx_development_plans_user_id ON learning.development_plans(user_id);
CREATE INDEX idx_plan_tasks_plan_id ON learning.plan_tasks(plan_id);
CREATE INDEX idx_assessments_user_id ON learning.assessments(user_id);
CREATE INDEX idx_recommendations_user_id ON learning.recommendations(user_id);

-- Gamification indexes
CREATE INDEX idx_xp_events_user_id ON gamification.xp_events(user_id);
CREATE INDEX idx_xp_events_created_at ON gamification.xp_events(created_at);
CREATE INDEX idx_user_xp_user_id ON gamification.user_xp(user_id);
CREATE INDEX idx_user_badges_user_id ON gamification.user_badges(user_id);

-- Jobs indexes
CREATE INDEX idx_vacancies_status ON jobs.vacancies(status);
CREATE INDEX idx_vacancies_posted_at ON jobs.vacancies(posted_at);
CREATE INDEX idx_applications_user_id ON jobs.applications(user_id);
CREATE INDEX idx_applications_vacancy_id ON jobs.applications(vacancy_id);
CREATE INDEX idx_matches_user_id ON jobs.matches(user_id);
CREATE INDEX idx_matches_match_score ON jobs.matches(match_score DESC);

-- Analytics indexes
CREATE INDEX idx_facts_fact_type ON analytics.facts(fact_type);
CREATE INDEX idx_facts_occurred_at ON analytics.facts(occurred_at);
CREATE INDEX idx_user_activities_user_id ON analytics.user_activities(user_id);
CREATE INDEX idx_user_activities_occurred_at ON analytics.user_activities(occurred_at);

-- STT/TTS indexes
CREATE INDEX idx_stt_jobs_user_id ON stt_jobs(user_id);
CREATE INDEX idx_stt_jobs_status ON stt_jobs(status);
CREATE INDEX idx_tts_jobs_user_id ON tts_jobs(user_id);
CREATE INDEX idx_transcripts_user_id ON transcripts(user_id);
CREATE INDEX idx_transcripts_session_id ON transcripts(session_id);
CREATE INDEX idx_llm_traces_user_id ON llm_traces(user_id);
CREATE INDEX idx_llm_traces_created_at ON llm_traces(created_at);

-- Audit indexes
CREATE INDEX idx_audit_logs_user_id ON audit.logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit.logs(created_at);
CREATE INDEX idx_data_access_logs_user_id ON audit.data_access_logs(user_id);
CREATE INDEX idx_gdpr_requests_user_id ON audit.gdpr_requests(user_id);

-- ============================================================================
-- TRIGGERS for updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON auth.roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON profiles.user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON profiles.skills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_skills_updated_at BEFORE UPDATE ON profiles.user_skills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON learning.courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_development_plans_updated_at BEFORE UPDATE ON learning.development_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plan_tasks_updated_at BEFORE UPDATE ON learning.plan_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recommendations_updated_at BEFORE UPDATE ON learning.recommendations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vacancies_updated_at BEFORE UPDATE ON jobs.vacancies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON jobs.applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();