-- ============================================================================
-- Career Platform Demo Data
-- Демонстрационные данные для тестирования системы
-- ============================================================================

-- Создание демо-пользователей
INSERT INTO users (id, email, external_id, role, status, data_processing_consent, consent_date) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'john.doe@company.com', 'oidc_user_001', 'employee', 'active', true, NOW()),
    ('550e8400-e29b-41d4-a716-446655440002', 'jane.smith@company.com', 'oidc_user_002', 'employee', 'active', true, NOW()),
    ('550e8400-e29b-41d4-a716-446655440003', 'hr.specialist@company.com', 'oidc_user_003', 'hr_specialist', 'active', true, NOW()),
    ('550e8400-e29b-41d4-a716-446655440004', 'team.lead@company.com', 'oidc_user_004', 'team_lead', 'active', true, NOW()),
    ('550e8400-e29b-41d4-a716-446655440005', 'admin@company.com', 'oidc_user_005', 'admin', 'active', true, NOW());

-- Создание профилей пользователей
INSERT INTO user_profiles (id, user_id, first_name, last_name, display_name, position, department, location, bio, career_interests, ready_for_rotation, profile_completion_percentage) VALUES
    (uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440001', 'John', 'Doe', 'John Doe', 'Senior Software Engineer', 'Engineering', 'New York', 'Experienced full-stack developer with passion for AI and machine learning', ARRAY['Technical Leadership', 'AI/ML', 'Architecture'], true, 85),
    (uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440002', 'Jane', 'Smith', 'Jane Smith', 'Product Manager', 'Product', 'San Francisco', 'Product leader with 5+ years experience in fintech and e-commerce', ARRAY['Product Strategy', 'Team Management', 'Data Analytics'], false, 90),
    (uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440003', 'Sarah', 'Johnson', 'Sarah Johnson', 'HR Business Partner', 'Human Resources', 'Chicago', 'People-focused HR professional specializing in talent development', ARRAY['People Management', 'Organizational Development', 'Change Management'], true, 95),
    (uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440004', 'Michael', 'Chen', 'Mike Chen', 'Engineering Manager', 'Engineering', 'Seattle', 'Technical leader with expertise in distributed systems and cloud architecture', ARRAY['Technical Leadership', 'Cloud Architecture', 'Team Building'], false, 88),
    (uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440005', 'Anna', 'Williams', 'Anna Williams', 'VP of Engineering', 'Engineering', 'Austin', 'Senior technology executive with 15+ years in software development and team leadership', ARRAY['Strategic Planning', 'Executive Leadership', 'Innovation'], false, 100);

-- Создание навыков
INSERT INTO skills (id, name, category, description) VALUES
    ('skill-001', 'JavaScript', 'technical', 'Programming language for web development'),
    ('skill-002', 'Python', 'technical', 'General-purpose programming language'),
    ('skill-003', 'React', 'framework', 'JavaScript library for building user interfaces'),
    ('skill-004', 'Node.js', 'framework', 'JavaScript runtime for server-side development'),
    ('skill-005', 'PostgreSQL', 'technical', 'Advanced open source relational database'),
    ('skill-006', 'Docker', 'tool', 'Platform for developing, shipping, and running applications'),
    ('skill-007', 'Kubernetes', 'tool', 'Open-source container orchestration system'),
    ('skill-008', 'AWS', 'technical', 'Amazon Web Services cloud platform'),
    ('skill-009', 'Machine Learning', 'domain_knowledge', 'AI/ML algorithms and techniques'),
    ('skill-010', 'Product Management', 'soft_skills', 'Product strategy and lifecycle management'),
    ('skill-011', 'Team Leadership', 'soft_skills', 'Leading and managing teams'),
    ('skill-012', 'Data Analysis', 'technical', 'Analyzing and interpreting data'),
    ('skill-013', 'UI/UX Design', 'technical', 'User interface and experience design'),
    ('skill-014', 'Agile/Scrum', 'soft_skills', 'Agile project management methodologies'),
    ('skill-015', 'Communication', 'soft_skills', 'Effective verbal and written communication');

-- Привязка навыков к пользователям
INSERT INTO user_skills (user_id, skill_id, level, experience_years, verified) VALUES
    -- John Doe (Senior Software Engineer)
    ('550e8400-e29b-41d4-a716-446655440001', 'skill-001', 'expert', 8, true),
    ('550e8400-e29b-41d4-a716-446655440001', 'skill-002', 'advanced', 6, true),
    ('550e8400-e29b-41d4-a716-446655440001', 'skill-003', 'expert', 5, true),
    ('550e8400-e29b-41d4-a716-446655440001', 'skill-004', 'advanced', 4, true),
    ('550e8400-e29b-41d4-a716-446655440001', 'skill-005', 'advanced', 5, false),
    ('550e8400-e29b-41d4-a716-446655440001', 'skill-006', 'intermediate', 3, true),
    ('550e8400-e29b-41d4-a716-446655440001', 'skill-009', 'intermediate', 2, false),
    
    -- Jane Smith (Product Manager)
    ('550e8400-e29b-41d4-a716-446655440002', 'skill-010', 'expert', 5, true),
    ('550e8400-e29b-41d4-a716-446655440002', 'skill-012', 'advanced', 4, true),
    ('550e8400-e29b-41d4-a716-446655440002', 'skill-013', 'intermediate', 3, false),
    ('550e8400-e29b-41d4-a716-446655440002', 'skill-014', 'expert', 5, true),
    ('550e8400-e29b-41d4-a716-446655440002', 'skill-015', 'expert', 6, true),
    
    -- Sarah Johnson (HR Business Partner)
    ('550e8400-e29b-41d4-a716-446655440003', 'skill-011', 'expert', 7, true),
    ('550e8400-e29b-41d4-a716-446655440003', 'skill-015', 'expert', 8, true),
    ('550e8400-e29b-41d4-a716-446655440003', 'skill-014', 'advanced', 5, true),
    
    -- Mike Chen (Engineering Manager)
    ('550e8400-e29b-41d4-a716-446655440004', 'skill-001', 'expert', 10, true),
    ('550e8400-e29b-41d4-a716-446655440004', 'skill-002', 'advanced', 8, true),
    ('550e8400-e29b-41d4-a716-446655440004', 'skill-007', 'expert', 4, true),
    ('550e8400-e29b-41d4-a716-446655440004', 'skill-008', 'advanced', 6, true),
    ('550e8400-e29b-41d4-a716-446655440004', 'skill-011', 'expert', 5, true),
    
    -- Anna Williams (VP of Engineering)
    ('550e8400-e29b-41d4-a716-446655440005', 'skill-011', 'expert', 15, true),
    ('550e8400-e29b-41d4-a716-446655440005', 'skill-001', 'expert', 12, true),
    ('550e8400-e29b-41d4-a716-446655440005', 'skill-008', 'expert', 8, true),
    ('550e8400-e29b-41d4-a716-446655440005', 'skill-015', 'expert', 15, true);

-- Создание курсов
INSERT INTO courses (id, title, description, type, difficulty, duration_hours, provider, skills, is_active) VALUES
    (uuid_generate_v4(), 'Advanced JavaScript Patterns', 'Learn advanced JavaScript patterns and best practices', 'online', 'advanced', 40, 'TechEdu', ARRAY['JavaScript', 'Web Development'], true),
    (uuid_generate_v4(), 'Machine Learning Fundamentals', 'Introduction to machine learning algorithms and applications', 'online', 'intermediate', 60, 'AI Institute', ARRAY['Machine Learning', 'Python', 'Data Science'], true),
    (uuid_generate_v4(), 'Leadership Excellence Program', 'Comprehensive leadership development program', 'hybrid', 'intermediate', 80, 'Leadership Academy', ARRAY['Team Leadership', 'Communication', 'Management'], true),
    (uuid_generate_v4(), 'Cloud Architecture with AWS', 'Designing scalable cloud solutions on AWS', 'online', 'advanced', 50, 'Cloud Masters', ARRAY['AWS', 'Cloud Computing', 'Architecture'], true),
    (uuid_generate_v4(), 'Product Strategy Workshop', 'Strategic product management methodologies', 'offline', 'advanced', 16, 'Product Guild', ARRAY['Product Management', 'Strategy', 'Analytics'], true),
    (uuid_generate_v4(), 'Docker and Kubernetes Mastery', 'Container orchestration and deployment', 'online', 'intermediate', 35, 'DevOps Pro', ARRAY['Docker', 'Kubernetes', 'DevOps'], true);

-- Создание записей на курсы
INSERT INTO course_enrollments (user_id, course_id, status, enrolled_at, progress_percentage) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', (SELECT id FROM courses WHERE title = 'Machine Learning Fundamentals'), 'in_progress', NOW() - INTERVAL '2 weeks', 45),
    ('550e8400-e29b-41d4-a716-446655440001', (SELECT id FROM courses WHERE title = 'Advanced JavaScript Patterns'), 'completed', NOW() - INTERVAL '1 month', 100),
    ('550e8400-e29b-41d4-a716-446655440002', (SELECT id FROM courses WHERE title = 'Leadership Excellence Program'), 'in_progress', NOW() - INTERVAL '3 weeks', 60),
    ('550e8400-e29b-41d4-a716-446655440003', (SELECT id FROM courses WHERE title = 'Product Strategy Workshop'), 'enrolled', NOW() - INTERVAL '1 week', 0),
    ('550e8400-e29b-41d4-a716-446655440004', (SELECT id FROM courses WHERE title = 'Cloud Architecture with AWS'), 'completed', NOW() - INTERVAL '2 months', 100);

-- Создание планов развития
INSERT INTO development_plans (id, user_id, title, description, target_role, status, start_date, target_date, created_by) VALUES
    (uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440001', 'Transition to ML Engineer', 'Development plan to transition from full-stack to ML engineering', 'Senior ML Engineer', 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '6 months', '550e8400-e29b-41d4-a716-446655440004'),
    (uuid_generate_v4(), '550e8400-e29b-41d4-a716-446655440002', 'Product Leadership Track', 'Path to senior product leadership role', 'Senior Product Manager', 'active', CURRENT_DATE - INTERVAL '1 month', CURRENT_DATE + INTERVAL '8 months', '550e8400-e29b-41d4-a716-446655440003');

-- Создание задач в планах развития
INSERT INTO development_plan_tasks (plan_id, title, description, status, due_date, priority) VALUES
    ((SELECT id FROM development_plans WHERE title = 'Transition to ML Engineer'), 'Complete ML Fundamentals Course', 'Finish the machine learning fundamentals course', 'in_progress', CURRENT_DATE + INTERVAL '1 month', 1),
    ((SELECT id FROM development_plans WHERE title = 'Transition to ML Engineer'), 'Implement ML Project', 'Build and deploy a machine learning project', 'pending', CURRENT_DATE + INTERVAL '3 months', 2),
    ((SELECT id FROM development_plans WHERE title = 'Transition to ML Engineer'), 'ML Certification', 'Obtain AWS ML certification', 'pending', CURRENT_DATE + INTERVAL '5 months', 2),
    ((SELECT id FROM development_plans WHERE title = 'Product Leadership Track'), 'Leadership Training', 'Complete leadership excellence program', 'in_progress', CURRENT_DATE + INTERVAL '2 months', 1),
    ((SELECT id FROM development_plans WHERE title = 'Product Leadership Track'), 'Mentor Junior PMs', 'Mentor 2 junior product managers', 'pending', CURRENT_DATE + INTERVAL '4 months', 3);

-- Создание XP событий и балансов
INSERT INTO xp_events (user_id, event_type, points, description, created_at) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'profile_completion', 100, 'Completed profile with 85% completion', NOW() - INTERVAL '2 months'),
    ('550e8400-e29b-41d4-a716-446655440001', 'skill_added', 25, 'Added Machine Learning skill', NOW() - INTERVAL '1.5 months'),
    ('550e8400-e29b-41d4-a716-446655440001', 'course_completed', 200, 'Completed Advanced JavaScript Patterns', NOW() - INTERVAL '1 month'),
    ('550e8400-e29b-41d4-a716-446655440001', 'course_enrolled', 50, 'Enrolled in ML Fundamentals', NOW() - INTERVAL '2 weeks'),
    
    ('550e8400-e29b-41d4-a716-446655440002', 'profile_completion', 100, 'Completed profile with 90% completion', NOW() - INTERVAL '3 months'),
    ('550e8400-e29b-41d4-a716-446655440002', 'plan_created', 75, 'Created development plan', NOW() - INTERVAL '1 month'),
    ('550e8400-e29b-41d4-a716-446655440002', 'course_enrolled', 50, 'Enrolled in Leadership program', NOW() - INTERVAL '3 weeks'),
    
    ('550e8400-e29b-41d4-a716-446655440003', 'profile_completion', 100, 'Completed profile with 95% completion', NOW() - INTERVAL '4 months'),
    ('550e8400-e29b-41d4-a716-446655440003', 'skill_added', 25, 'Added new HR skill', NOW() - INTERVAL '2 months'),
    
    ('550e8400-e29b-41d4-a716-446655440004', 'profile_completion', 100, 'Completed profile with 88% completion', NOW() - INTERVAL '3 months'),
    ('550e8400-e29b-41d4-a716-446655440004', 'course_completed', 200, 'Completed Cloud Architecture course', NOW() - INTERVAL '2 months'),
    ('550e8400-e29b-41d4-a716-446655440004', 'skill_added', 25, 'Added Kubernetes skill', NOW() - INTERVAL '1 month'),
    
    ('550e8400-e29b-41d4-a716-446655440005', 'profile_completion', 100, 'Completed profile with 100% completion', NOW() - INTERVAL '6 months'),
    ('550e8400-e29b-41d4-a716-446655440005', 'skill_added', 25, 'Added strategic planning skill', NOW() - INTERVAL '3 months');

-- Создание достижений
INSERT INTO achievements (id, name, description, type, points_reward, requirements, rarity) VALUES
    ('achievement-001', 'Profile Perfectionist', 'Complete your profile with 100% completion', 'milestone', 100, '{"profile_completion": 100}', 'uncommon'),
    ('achievement-002', 'Learning Enthusiast', 'Enroll in 3 courses', 'milestone', 150, '{"courses_enrolled": 3}', 'common'),
    ('achievement-003', 'Course Crusher', 'Complete 5 courses', 'completion', 250, '{"courses_completed": 5}', 'rare'),
    ('achievement-004', 'Skill Collector', 'Add 10 skills to your profile', 'milestone', 200, '{"skills_added": 10}', 'uncommon'),
    ('achievement-005', 'Early Adopter', 'Be among the first 50 users', 'special', 500, '{"user_rank": 50}', 'epic'),
    ('achievement-006', 'Mentor Master', 'Help 5 colleagues with their development', 'community', 300, '{"mentoring_sessions": 5}', 'rare'),
    ('achievement-007', '7-Day Streak', 'Log in for 7 consecutive days', 'streak', 100, '{"login_streak": 7}', 'common');

-- Присвоение достижений
INSERT INTO user_achievements (user_id, achievement_id) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'achievement-002'),
    ('550e8400-e29b-41d4-a716-446655440001', 'achievement-004'),
    ('550e8400-e29b-41d4-a716-446655440002', 'achievement-001'),
    ('550e8400-e29b-41d4-a716-446655440002', 'achievement-002'),
    ('550e8400-e29b-41d4-a716-446655440003', 'achievement-001'),
    ('550e8400-e29b-41d4-a716-446655440003', 'achievement-004'),
    ('550e8400-e29b-41d4-a716-446655440004', 'achievement-003'),
    ('550e8400-e29b-41d4-a716-446655440004', 'achievement-004'),
    ('550e8400-e29b-41d4-a716-446655440005', 'achievement-001'),
    ('550e8400-e29b-41d4-a716-446655440005', 'achievement-005');

-- Создание вакансий
INSERT INTO vacancies (id, title, description, department, location, employment_type, seniority_level, required_skills, salary_min, salary_max, status, published_at, hiring_manager_id, created_by) VALUES
    (uuid_generate_v4(), 'Senior Full Stack Developer', 'We are looking for an experienced full-stack developer to join our engineering team', 'Engineering', 'Remote', 'full_time', 'senior', ARRAY['skill-001', 'skill-002', 'skill-003', 'skill-004'], 120000, 150000, 'published', NOW() - INTERVAL '1 week', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003'),
    (uuid_generate_v4(), 'Machine Learning Engineer', 'Join our AI team to build next-generation ML solutions', 'Engineering', 'San Francisco', 'full_time', 'middle', ARRAY['skill-002', 'skill-009', 'skill-008'], 130000, 160000, 'published', NOW() - INTERVAL '3 days', '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440003'),
    (uuid_generate_v4(), 'Product Manager', 'Lead product development for our core platform', 'Product', 'New York', 'full_time', 'senior', ARRAY['skill-010', 'skill-012', 'skill-014'], 140000, 170000, 'published', NOW() - INTERVAL '5 days', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003'),
    (uuid_generate_v4(), 'DevOps Engineer', 'Scale our infrastructure and deployment processes', 'Engineering', 'Seattle', 'full_time', 'middle', ARRAY['skill-006', 'skill-007', 'skill-008'], 110000, 140000, 'published', NOW() - INTERVAL '2 weeks', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003');

-- Создание рекомендаций вакансий
INSERT INTO job_recommendations (user_id, vacancy_id, similarity_score, match_factors, explanation, status) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', (SELECT id FROM vacancies WHERE title = 'Machine Learning Engineer'), 0.85, '{"skills_match": 0.7, "experience_match": 0.9, "location_preference": 0.8}', 'Strong match based on Python and ML skills, with relevant experience', 'viewed'),
    ('550e8400-e29b-41d4-a716-446655440001', (SELECT id FROM vacancies WHERE title = 'Senior Full Stack Developer'), 0.92, '{"skills_match": 0.95, "experience_match": 0.9, "location_preference": 1.0}', 'Excellent match - all required skills present with senior level experience', 'interested'),
    ('550e8400-e29b-41d4-a716-446655440002', (SELECT id FROM vacancies WHERE title = 'Product Manager'), 0.88, '{"skills_match": 0.9, "experience_match": 0.85, "location_preference": 0.9}', 'Great fit for senior PM role with strong product and analytics background', 'pending');

-- Создание аналитических фактов
INSERT INTO analytics_facts (fact_date, user_id, department, profile_completeness, skill_count, xp_earned, courses_enrolled, courses_completed, recommendations_count) VALUES
    (CURRENT_DATE - INTERVAL '30 days', '550e8400-e29b-41d4-a716-446655440001', 'Engineering', 85, 7, 375, 2, 1, 2),
    (CURRENT_DATE - INTERVAL '30 days', '550e8400-e29b-41d4-a716-446655440002', 'Product', 90, 5, 225, 1, 0, 1),
    (CURRENT_DATE - INTERVAL '30 days', '550e8400-e29b-41d4-a716-446655440003', 'Human Resources', 95, 3, 125, 0, 0, 0),
    (CURRENT_DATE - INTERVAL '30 days', '550e8400-e29b-41d4-a716-446655440004', 'Engineering', 88, 5, 325, 1, 1, 0),
    (CURRENT_DATE - INTERVAL '30 days', '550e8400-e29b-41d4-a716-446655440005', 'Engineering', 100, 4, 125, 0, 0, 0);

-- Создание настроек уведомлений
INSERT INTO user_notification_preferences (user_id, email_notifications, push_notifications, frequency) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', true, true, 'immediate'),
    ('550e8400-e29b-41d4-a716-446655440002', true, false, 'daily'),
    ('550e8400-e29b-41d4-a716-446655440003', true, true, 'immediate'),
    ('550e8400-e29b-41d4-a716-446655440004', true, true, 'weekly'),
    ('550e8400-e29b-41d4-a716-446655440005', false, false, 'weekly');

-- Создание демо-уведомлений
INSERT INTO notifications (user_id, type, channel, title, message, read) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'new_recommendation', 'in_app', 'New Job Recommendation', 'We found a new Machine Learning Engineer position that matches your skills!', false),
    ('550e8400-e29b-41d4-a716-446655440001', 'course_reminder', 'in_app', 'Course Reminder', 'Don''t forget to continue your ML Fundamentals course', true),
    ('550e8400-e29b-41d4-a716-446655440002', 'plan_deadline', 'in_app', 'Development Plan Update', 'Your leadership training task is due next week', false),
    ('550e8400-e29b-41d4-a716-446655440003', 'system_update', 'in_app', 'New Features Available', 'Check out the new voice assistant feature!', true);

-- Создание опыта работы
INSERT INTO work_experience (user_id, company_name, position, description, start_date, end_date, is_current, achievements, technologies) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'TechCorp Inc.', 'Senior Software Engineer', 'Led development of microservices architecture', '2020-01-15', NULL, true, ARRAY['Reduced system latency by 40%', 'Mentored 3 junior developers'], ARRAY['JavaScript', 'Node.js', 'React', 'PostgreSQL']),
    ('550e8400-e29b-41d4-a716-446655440001', 'StartupXYZ', 'Full Stack Developer', 'Built web applications from scratch', '2018-06-01', '2019-12-31', false, ARRAY['Delivered 5 major features', 'Improved code coverage to 85%'], ARRAY['JavaScript', 'Python', 'MongoDB']),
    
    ('550e8400-e29b-41d4-a716-446655440002', 'ProductCorp', 'Senior Product Manager', 'Lead product strategy and roadmap', '2021-03-01', NULL, true, ARRAY['Increased user engagement by 35%', 'Launched 3 successful features'], ARRAY['Analytics', 'A/B Testing', 'Figma']),
    ('550e8400-e29b-41d4-a716-446655440002', 'E-commerce Inc.', 'Product Manager', 'Managed marketplace product line', '2019-01-15', '2021-02-28', false, ARRAY['Grew GMV by 50%', 'Improved conversion rate by 25%'], ARRAY['SQL', 'Tableau', 'Jira']);

-- Создание образования
INSERT INTO education (user_id, institution, degree, field_of_study, start_date, end_date, gpa) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'MIT', 'Master of Science', 'Computer Science', '2016-09-01', '2018-05-31', 3.8),
    ('550e8400-e29b-41d4-a716-446655440001', 'UC Berkeley', 'Bachelor of Science', 'Computer Science', '2012-09-01', '2016-05-31', 3.6),
    
    ('550e8400-e29b-41d4-a716-446655440002', 'Stanford University', 'Master of Business Administration', 'Business Administration', '2017-09-01', '2019-06-30', 3.9),
    ('550e8400-e29b-41d4-a716-446655440002', 'Northwestern University', 'Bachelor of Arts', 'Economics', '2013-09-01', '2017-06-30', 3.7);

-- Финальное обновление статистики
ANALYZE;

SELECT 'Demo data inserted successfully! Users created: ' || COUNT(*) AS status 
FROM users;
