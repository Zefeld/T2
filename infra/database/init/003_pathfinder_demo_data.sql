-- ============================================================================
-- PathFinder AI HR-Consultant Demo Data
-- Демонстрационные данные для MVP
-- ============================================================================

-- Вставка базовых навыков в SkillGraph
INSERT INTO skill_graph (id, name, category, description, level, popularity_score, market_demand) VALUES
-- Технические навыки
('550e8400-e29b-41d4-a716-446655440001', 'Python', 'technical', 'Язык программирования Python', 1, 9.5, 9.2),
('550e8400-e29b-41d4-a716-446655440002', 'JavaScript', 'technical', 'Язык программирования JavaScript', 1, 9.3, 9.0),
('550e8400-e29b-41d4-a716-446655440003', 'React', 'framework', 'JavaScript библиотека для создания пользовательских интерфейсов', 2, 8.8, 8.5),
('550e8400-e29b-41d4-a716-446655440004', 'Node.js', 'framework', 'JavaScript runtime для серверной разработки', 2, 8.2, 8.0),
('550e8400-e29b-41d4-a716-446655440005', 'PostgreSQL', 'tool', 'Реляционная база данных', 1, 7.8, 7.5),
('550e8400-e29b-41d4-a716-446655440006', 'Docker', 'tool', 'Платформа контейнеризации', 1, 8.5, 8.2),
('550e8400-e29b-41d4-a716-446655440007', 'Kubernetes', 'tool', 'Оркестрация контейнеров', 2, 7.9, 8.8),
('550e8400-e29b-41d4-a716-446655440008', 'Machine Learning', 'domain_knowledge', 'Машинное обучение и анализ данных', 1, 9.0, 9.5),
('550e8400-e29b-41d4-a716-446655440009', 'FastAPI', 'framework', 'Современный веб-фреймворк для Python', 2, 7.5, 8.0),
('550e8400-e29b-41d4-a716-446655440010', 'Git', 'tool', 'Система контроля версий', 1, 9.8, 9.0),

-- Софт скиллы
('550e8400-e29b-41d4-a716-446655440011', 'Leadership', 'soft_skills', 'Лидерские качества и управление командой', 1, 8.5, 8.8),
('550e8400-e29b-41d4-a716-446655440012', 'Communication', 'soft_skills', 'Коммуникативные навыки', 1, 9.2, 9.0),
('550e8400-e29b-41d4-a716-446655440013', 'Problem Solving', 'soft_skills', 'Решение проблем и аналитическое мышление', 1, 8.8, 8.5),
('550e8400-e29b-41d4-a716-446655440014', 'Project Management', 'methodology', 'Управление проектами', 1, 8.0, 8.2),
('550e8400-e29b-41d4-a716-446655440015', 'Agile/Scrum', 'methodology', 'Гибкие методологии разработки', 1, 8.3, 8.0),

-- Языки
('550e8400-e29b-41d4-a716-446655440016', 'English', 'language', 'Английский язык', 1, 9.5, 9.8),
('550e8400-e29b-41d4-a716-446655440017', 'Russian', 'language', 'Русский язык', 1, 7.0, 6.5),

-- Домен знания
('550e8400-e29b-41d4-a716-446655440018', 'HR Analytics', 'domain_knowledge', 'Аналитика в области HR', 1, 6.5, 7.8),
('550e8400-e29b-41d4-a716-446655440019', 'Data Science', 'domain_knowledge', 'Наука о данных', 1, 8.8, 9.2),
('550e8400-e29b-41d4-a716-446655440020', 'UI/UX Design', 'domain_knowledge', 'Дизайн пользовательских интерфейсов', 1, 7.8, 8.0);

-- Связи между навыками
INSERT INTO skill_relationships (from_skill_id, to_skill_id, relationship_type, strength) VALUES
-- JavaScript -> React (prerequisite)
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', 'prerequisite', 0.9),
-- JavaScript -> Node.js (prerequisite)
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', 'prerequisite', 0.8),
-- Python -> Machine Learning (prerequisite)
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440008', 'prerequisite', 0.9),
-- Python -> FastAPI (prerequisite)
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440009', 'prerequisite', 0.8),
-- Docker -> Kubernetes (prerequisite)
('550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440007', 'prerequisite', 0.9),
-- Machine Learning -> Data Science (complement)
('550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440019', 'complement', 0.8),
-- Leadership -> Project Management (complement)
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440014', 'complement', 0.7);

-- Вставка ролей
INSERT INTO roles (id, title, description, department, role_type, seniority_level, skills_required, career_paths) VALUES
('660e8400-e29b-41d4-a716-446655440001', 'Senior Python Developer', 'Разработка backend сервисов на Python', 'Engineering', 'individual_contributor', 'senior', 
 '[
   {"skill_id": "550e8400-e29b-41d4-a716-446655440001", "min_level": "advanced", "weight": 0.9, "is_critical": true},
   {"skill_id": "550e8400-e29b-41d4-a716-446655440009", "min_level": "intermediate", "weight": 0.8, "is_critical": true},
   {"skill_id": "550e8400-e29b-41d4-a716-446655440005", "min_level": "intermediate", "weight": 0.7, "is_critical": false},
   {"skill_id": "550e8400-e29b-41d4-a716-446655440006", "min_level": "intermediate", "weight": 0.6, "is_critical": false}
 ]',
 '{"next_roles": ["Tech Lead", "Principal Engineer"], "departments": ["Engineering", "Data"]}'
),

('660e8400-e29b-41d4-a716-446655440002', 'Frontend Developer', 'Разработка пользовательских интерфейсов', 'Engineering', 'individual_contributor', 'middle', 
 '[
   {"skill_id": "550e8400-e29b-41d4-a716-446655440002", "min_level": "advanced", "weight": 0.9, "is_critical": true},
   {"skill_id": "550e8400-e29b-41d4-a716-446655440003", "min_level": "advanced", "weight": 0.9, "is_critical": true},
   {"skill_id": "550e8400-e29b-41d4-a716-446655440020", "min_level": "intermediate", "weight": 0.7, "is_critical": false}
 ]',
 '{"next_roles": ["Senior Frontend Developer", "Full Stack Developer"], "departments": ["Engineering", "Design"]}'
),

('660e8400-e29b-41d4-a716-446655440003', 'Data Scientist', 'Анализ данных и машинное обучение', 'Data', 'individual_contributor', 'middle', 
 '[
   {"skill_id": "550e8400-e29b-41d4-a716-446655440001", "min_level": "advanced", "weight": 0.9, "is_critical": true},
   {"skill_id": "550e8400-e29b-41d4-a716-446655440008", "min_level": "advanced", "weight": 0.9, "is_critical": true},
   {"skill_id": "550e8400-e29b-41d4-a716-446655440019", "min_level": "intermediate", "weight": 0.8, "is_critical": true}
 ]',
 '{"next_roles": ["Senior Data Scientist", "ML Engineer"], "departments": ["Data", "AI"]}'
),

('660e8400-e29b-41d4-a716-446655440004', 'Engineering Manager', 'Управление командой разработки', 'Engineering', 'manager', 'senior', 
 '[
   {"skill_id": "550e8400-e29b-41d4-a716-446655440011", "min_level": "advanced", "weight": 0.9, "is_critical": true},
   {"skill_id": "550e8400-e29b-41d4-a716-446655440012", "min_level": "advanced", "weight": 0.8, "is_critical": true},
   {"skill_id": "550e8400-e29b-41d4-a716-446655440014", "min_level": "advanced", "weight": 0.8, "is_critical": true},
   {"skill_id": "550e8400-e29b-41d4-a716-446655440001", "min_level": "intermediate", "weight": 0.6, "is_critical": false}
 ]',
 '{"next_roles": ["Senior Engineering Manager", "Director of Engineering"], "departments": ["Engineering"]}'
),

('660e8400-e29b-41d4-a716-446655440005', 'HR Data Analyst', 'Аналитика HR процессов и метрик', 'HR', 'individual_contributor', 'middle', 
 '[
   {"skill_id": "550e8400-e29b-41d4-a716-446655440018", "min_level": "advanced", "weight": 0.9, "is_critical": true},
   {"skill_id": "550e8400-e29b-41d4-a716-446655440001", "min_level": "intermediate", "weight": 0.7, "is_critical": false},
   {"skill_id": "550e8400-e29b-41d4-a716-446655440019", "min_level": "intermediate", "weight": 0.8, "is_critical": true}
 ]',
 '{"next_roles": ["Senior HR Analyst", "HR Business Partner"], "departments": ["HR", "Data"]}'
);

-- Вставка демо сотрудников
INSERT INTO employees (id, user_id, employee_id, first_name, last_name, email, department, current_role_id, position, hire_date, skills, mobility_status, preferred_roles, profile_completion) VALUES
('770e8400-e29b-41d4-a716-446655440001', '110e8400-e29b-41d4-a716-446655440001', 'EMP001', 'Алексей', 'Иванов', 'alexey.ivanov@company.com', 'Engineering', '660e8400-e29b-41d4-a716-446655440001', 'Senior Python Developer', '2022-03-15',
 '[
   {"skill_id": "550e8400-e29b-41d4-a716-446655440001", "level": "expert", "experience_years": 6, "last_used": "2024-01-15", "verified": true, "source": "self_assessment"},
   {"skill_id": "550e8400-e29b-41d4-a716-446655440009", "level": "advanced", "experience_years": 3, "last_used": "2024-01-15", "verified": true, "source": "peer_review"},
   {"skill_id": "550e8400-e29b-41d4-a716-446655440005", "level": "advanced", "experience_years": 4, "last_used": "2024-01-10", "verified": false, "source": "self_assessment"},
   {"skill_id": "550e8400-e29b-41d4-a716-446655440006", "level": "intermediate", "experience_years": 2, "last_used": "2024-01-12", "verified": true, "source": "certification"}
 ]',
 'considering', 
 ARRAY['660e8400-e29b-41d4-a716-446655440004'::UUID], 
 85
),

('770e8400-e29b-41d4-a716-446655440002', '110e8400-e29b-41d4-a716-446655440002', 'EMP002', 'Мария', 'Петрова', 'maria.petrova@company.com', 'Engineering', '660e8400-e29b-41d4-a716-446655440002', 'Frontend Developer', '2023-01-20',
 '[
   {"skill_id": "550e8400-e29b-41d4-a716-446655440002", "level": "advanced", "experience_years": 4, "last_used": "2024-01-15", "verified": true, "source": "self_assessment"},
   {"skill_id": "550e8400-e29b-41d4-a716-446655440003", "level": "advanced", "experience_years": 3, "last_used": "2024-01-15", "verified": true, "source": "project_work"},
   {"skill_id": "550e8400-e29b-41d4-a716-446655440020", "level": "intermediate", "experience_years": 2, "last_used": "2024-01-10", "verified": false, "source": "self_assessment"}
 ]',
 'ready', 
 ARRAY['660e8400-e29b-41d4-a716-446655440001'::UUID], 
 75
),

('770e8400-e29b-41d4-a716-446655440003', '110e8400-e29b-41d4-a716-446655440003', 'EMP003', 'Дмитрий', 'Сидоров', 'dmitry.sidorov@company.com', 'Data', '660e8400-e29b-41d4-a716-446655440003', 'Data Scientist', '2021-09-10',
 '[
   {"skill_id": "550e8400-e29b-41d4-a716-446655440001", "level": "expert", "experience_years": 5, "last_used": "2024-01-15", "verified": true, "source": "certification"},
   {"skill_id": "550e8400-e29b-41d4-a716-446655440008", "level": "expert", "experience_years": 4, "last_used": "2024-01-15", "verified": true, "source": "peer_review"},
   {"skill_id": "550e8400-e29b-41d4-a716-446655440019", "level": "advanced", "experience_years": 3, "last_used": "2024-01-14", "verified": true, "source": "project_work"},
   {"skill_id": "550e8400-e29b-41d4-a716-446655440011", "level": "intermediate", "experience_years": 1, "last_used": "2023-12-20", "verified": false, "source": "self_assessment"}
 ]',
 'actively_seeking', 
 ARRAY['660e8400-e29b-41d4-a716-446655440004'::UUID], 
 90
),

('770e8400-e29b-41d4-a716-446655440004', '110e8400-e29b-41d4-a716-446655440004', 'EMP004', 'Елена', 'Козлова', 'elena.kozlova@company.com', 'HR', '660e8400-e29b-41d4-a716-446655440005', 'HR Data Analyst', '2023-06-01',
 '[
   {"skill_id": "550e8400-e29b-41d4-a716-446655440018", "level": "advanced", "experience_years": 3, "last_used": "2024-01-15", "verified": true, "source": "certification"},
   {"skill_id": "550e8400-e29b-41d4-a716-446655440001", "level": "intermediate", "experience_years": 2, "last_used": "2024-01-12", "verified": false, "source": "self_assessment"},
   {"skill_id": "550e8400-e29b-41d4-a716-446655440019", "level": "intermediate", "experience_years": 2, "last_used": "2024-01-14", "verified": true, "source": "course_completion"}
 ]',
 'not_ready', 
 ARRAY[]::UUID[], 
 60
);

-- Вставка демо вакансий
INSERT INTO vacancies (id, title, description, role_id, department, location, employment_type, status, priority, hiring_manager_id, hr_contact_id, created_by) VALUES
('880e8400-e29b-41d4-a716-446655440001', 'Senior Python Developer - AI Team', 'Ищем опытного Python разработчика для работы над AI проектами', '660e8400-e29b-41d4-a716-446655440001', 'Engineering', 'Moscow', 'full_time', 'published', 'high', '110e8400-e29b-41d4-a716-446655440001', '110e8400-e29b-41d4-a716-446655440002', '110e8400-e29b-41d4-a716-446655440002'),

('880e8400-e29b-41d4-a716-446655440002', 'Engineering Manager - Growth Team', 'Руководитель команды разработки продуктового направления', '660e8400-e29b-41d4-a716-446655440004', 'Engineering', 'Moscow', 'full_time', 'published', 'critical', '110e8400-e29b-41d4-a716-446655440001', '110e8400-e29b-41d4-a716-446655440002', '110e8400-e29b-41d4-a716-446655440002'),

('880e8400-e29b-41d4-a716-446655440003', 'Full Stack Developer', 'Разработчик полного цикла для внутренних инструментов', '660e8400-e29b-41d4-a716-446655440002', 'Engineering', 'Remote', 'full_time', 'published', 'medium', '110e8400-e29b-41d4-a716-446655440001', '110e8400-e29b-41d4-a716-446655440002', '110e8400-e29b-41d4-a716-446655440002');

-- Вставка курсов
INSERT INTO courses (id, title, description, provider, format, difficulty, duration_hours, skills, cost, is_internal) VALUES
('990e8400-e29b-41d4-a716-446655440001', 'Advanced Python for Data Science', 'Углубленный курс Python для анализа данных', 'Internal Academy', 'online', 'advanced', 40,
 '[
   {"skill_id": "550e8400-e29b-41d4-a716-446655440001", "level_gained": "advanced", "weight": 0.9},
   {"skill_id": "550e8400-e29b-41d4-a716-446655440019", "level_gained": "intermediate", "weight": 0.7}
 ]',
 0, true
),

('990e8400-e29b-41d4-a716-446655440002', 'Leadership Fundamentals', 'Основы лидерства и управления командой', 'External Provider', 'hybrid', 'intermediate', 24,
 '[
   {"skill_id": "550e8400-e29b-41d4-a716-446655440011", "level_gained": "intermediate", "weight": 0.9},
   {"skill_id": "550e8400-e29b-41d4-a716-446655440012", "level_gained": "intermediate", "weight": 0.8}
 ]',
 15000, false
),

('990e8400-e29b-41d4-a716-446655440003', 'React Advanced Patterns', 'Продвинутые паттерны разработки на React', 'Tech Academy', 'online', 'advanced', 32,
 '[
   {"skill_id": "550e8400-e29b-41d4-a716-446655440003", "level_gained": "expert", "weight": 0.9},
   {"skill_id": "550e8400-e29b-41d4-a716-446655440002", "level_gained": "advanced", "weight": 0.7}
 ]',
 8000, false
);

-- Вставка квестов
INSERT INTO quests (id, title, description, type, requirements, completion_criteria, xp_reward, duration_days, difficulty_level) VALUES
('aa0e8400-e29b-41d4-a716-446655440001', 'Profile Master', 'Заполните профиль на 100%', 'profile_completion',
 '{"min_profile_completion": 0}',
 '{"profile_completion": 100, "required_sections": ["skills", "experience", "education", "preferences"]}',
 500, 30, 1
),

('aa0e8400-e29b-41d4-a716-446655440002', 'Skill Validator', 'Подтвердите 5 навыков через коллег', 'peer_interaction',
 '{"min_profile_completion": 50}',
 '{"verified_skills_count": 5, "verification_method": "peer_review"}',
 300, 14, 2
),

('aa0e8400-e29b-41d4-a716-446655440003', 'Learning Champion', 'Завершите 2 курса за месяц', 'learning',
 '{"min_profile_completion": 60}',
 '{"courses_completed": 2, "time_period_days": 30}',
 800, 30, 3
),

('aa0e8400-e29b-41d4-a716-446655440004', 'Career Explorer', 'Изучите 3 новые роли в системе', 'career_exploration',
 '{"min_profile_completion": 40}',
 '{"roles_viewed": 3, "time_spent_minutes": 30}',
 200, 7, 1
),

('aa0e8400-e29b-41d4-a716-446655440005', 'Mystery Match Hunter', 'Откройте 5 скрытых вакансий', 'mystery_match',
 '{"min_profile_completion": 70}',
 '{"mystery_matches_unlocked": 5, "profile_improvements": 3}',
 1000, 21, 3
);

-- Вставка достижений PathFinder
INSERT INTO pathfinder_achievements (id, name, description, type, category, requirements, xp_reward, rarity, prestige_points) VALUES
('bb0e8400-e29b-41d4-a716-446655440001', 'Profile Pioneer', 'Первый заполненный профиль', 'milestone', 'career',
 '{"profile_completion": 100, "first_time": true}',
 100, 'common', 10
),

('bb0e8400-e29b-41d4-a716-446655440002', 'Skill Master', '10 подтвержденных навыков', 'achievement', 'learning',
 '{"verified_skills": 10}',
 500, 'rare', 50
),

('bb0e8400-e29b-41d4-a716-446655440003', 'Team Player', 'Помог подтвердить навыки 5 коллегам', 'social', 'social',
 '{"peer_validations_given": 5}',
 300, 'uncommon', 30
),

('bb0e8400-e29b-41d4-a716-446655440004', 'Career Climber', 'Успешный переход на новую роль', 'milestone', 'career',
 '{"internal_role_change": true, "match_score": 0.8}',
 1000, 'epic', 100
),

('bb0e8400-e29b-41d4-a716-446655440005', 'Learning Machine', '5 завершенных курсов', 'achievement', 'learning',
 '{"courses_completed": 5}',
 750, 'rare', 75
);

-- Вставка примеров матчинга
INSERT INTO matches (vacancy_id, employee_id, score_total, score_hard, score_soft, score_experience, skill_gaps, strengths, explanation, status) VALUES
('880e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 0.92, 0.95, 0.85, 0.95,
 '[{"skill_id": "550e8400-e29b-41d4-a716-446655440008", "required_level": "intermediate", "current_level": "novice", "gap_severity": "medium"}]',
 '[{"skill_id": "550e8400-e29b-41d4-a716-446655440001", "strength": "expert_level"}, {"skill_id": "550e8400-e29b-41d4-a716-446655440009", "strength": "proven_experience"}]',
 'Отличное соответствие по основным техническим навыкам. Кандидат имеет экспертный уровень Python и продвинутый FastAPI. Рекомендуется дополнительное обучение по Machine Learning.',
 'pending'
),

('880e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440003', 0.78, 0.65, 0.85, 0.85,
 '[{"skill_id": "550e8400-e29b-41d4-a716-446655440014", "required_level": "advanced", "current_level": "novice", "gap_severity": "high"}]',
 '[{"skill_id": "550e8400-e29b-41d4-a716-446655440008", "strength": "expert_level"}, {"skill_id": "550e8400-e29b-41d4-a716-446655440011", "strength": "developing"}]',
 'Сильный технический кандидат с лидерским потенциалом. Необходимо развитие навыков управления проектами для полного соответствия роли Engineering Manager.',
 'viewed'
);

-- Вставка прогресса квестов для демо пользователей
INSERT INTO user_quests (user_id, quest_id, status, progress_data, completion_percentage, started_at) VALUES
('110e8400-e29b-41d4-a716-446655440001', 'aa0e8400-e29b-41d4-a716-446655440001', 'active',
 '{"current_completion": 85, "completed_sections": ["skills", "experience", "education"], "missing_sections": ["preferences"]}',
 85, NOW() - INTERVAL '5 days'
),

('110e8400-e29b-41d4-a716-446655440002', 'aa0e8400-e29b-41d4-a716-446655440002', 'active',
 '{"verified_skills": 3, "pending_verifications": 2, "target": 5}',
 60, NOW() - INTERVAL '3 days'
),

('110e8400-e29b-41d4-a716-446655440003', 'aa0e8400-e29b-41d4-a716-446655440003', 'completed',
 '{"courses_completed": 2, "completion_dates": ["2024-01-10", "2024-01-15"]}',
 100, NOW() - INTERVAL '20 days'
);

-- Вставка HR аналитики (примеры фактов)
INSERT INTO hr_analytics_facts (fact_date, department, employee_id, profile_completeness, skills_count, verified_skills_count, mobility_readiness_score, matches_generated, matches_viewed) VALUES
('2024-01-15', 'Engineering', '770e8400-e29b-41d4-a716-446655440001', 85, 4, 3, 7.5, 2, 1),
('2024-01-15', 'Engineering', '770e8400-e29b-41d4-a716-446655440002', 75, 3, 2, 8.0, 1, 1),
('2024-01-15', 'Data', '770e8400-e29b-41d4-a716-446655440003', 90, 4, 3, 9.0, 3, 2),
('2024-01-15', 'HR', '770e8400-e29b-41d4-a716-446655440004', 60, 3, 2, 4.0, 0, 0);

-- Вставка метрик по подразделениям
INSERT INTO department_metrics (department, period_start, period_end, total_employees, active_profiles, avg_profile_completeness, avg_skills_per_employee, mobility_ready_count, avg_match_score, quest_completion_rate) VALUES
('Engineering', '2024-01-01', '2024-01-31', 2, 2, 80.0, 3.5, 1, 0.85, 0.75),
('Data', '2024-01-01', '2024-01-31', 1, 1, 90.0, 4.0, 1, 0.78, 1.0),
('HR', '2024-01-01', '2024-01-31', 1, 1, 60.0, 3.0, 0, 0.0, 0.0);

-- Завершение вставки демо данных
SELECT 'PathFinder demo data inserted successfully' AS status;