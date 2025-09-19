-- Seed data for Career Development Platform
-- This file contains initial data for development and testing

-- ============================================================================
-- ROLES AND PERMISSIONS
-- ============================================================================

INSERT INTO auth.roles (id, name, description, permissions) VALUES
(uuid_generate_v4(), 'admin', 'System Administrator', 
 '["system:admin", "users:read", "users:write", "users:delete", "roles:read", "roles:write", "analytics:read", "gdpr:admin"]'),
(uuid_generate_v4(), 'hr_manager', 'HR Manager', 
 '["users:read", "profiles:read", "profiles:write", "analytics:read", "jobs:read", "jobs:write", "reports:read"]'),
(uuid_generate_v4(), 'manager', 'Team Manager', 
 '["team:read", "team:write", "profiles:read", "development_plans:read", "development_plans:write", "assessments:write"]'),
(uuid_generate_v4(), 'employee', 'Regular Employee', 
 '["profile:read", "profile:write", "learning:read", "learning:write", "jobs:read", "applications:write"]'),
(uuid_generate_v4(), 'guest', 'Guest User', 
 '["profile:read", "learning:read"]');

-- ============================================================================
-- SKILLS CATALOG
-- ============================================================================

INSERT INTO profiles.skills (id, name, category, description) VALUES
-- Technical Skills
(uuid_generate_v4(), 'JavaScript', 'Programming', 'Modern JavaScript programming language'),
(uuid_generate_v4(), 'Python', 'Programming', 'Python programming language for backend and data science'),
(uuid_generate_v4(), 'Java', 'Programming', 'Java programming language for enterprise applications'),
(uuid_generate_v4(), 'React', 'Frontend', 'React.js library for building user interfaces'),
(uuid_generate_v4(), 'Node.js', 'Backend', 'Node.js runtime for server-side JavaScript'),
(uuid_generate_v4(), 'PostgreSQL', 'Database', 'Advanced relational database management'),
(uuid_generate_v4(), 'Docker', 'DevOps', 'Containerization and deployment'),
(uuid_generate_v4(), 'Kubernetes', 'DevOps', 'Container orchestration platform'),
(uuid_generate_v4(), 'AWS', 'Cloud', 'Amazon Web Services cloud platform'),
(uuid_generate_v4(), 'Machine Learning', 'AI/ML', 'Machine learning algorithms and models'),

-- Soft Skills
(uuid_generate_v4(), 'Leadership', 'Management', 'Leading teams and projects effectively'),
(uuid_generate_v4(), 'Communication', 'Interpersonal', 'Effective verbal and written communication'),
(uuid_generate_v4(), 'Project Management', 'Management', 'Planning and executing projects'),
(uuid_generate_v4(), 'Problem Solving', 'Analytical', 'Analytical thinking and problem resolution'),
(uuid_generate_v4(), 'Agile Methodology', 'Process', 'Agile development methodologies'),

-- Business Skills
(uuid_generate_v4(), 'Data Analysis', 'Analytics', 'Analyzing and interpreting business data'),
(uuid_generate_v4(), 'Product Management', 'Business', 'Managing product lifecycle and strategy'),
(uuid_generate_v4(), 'UX Design', 'Design', 'User experience design principles'),
(uuid_generate_v4(), 'Digital Marketing', 'Marketing', 'Online marketing strategies and tools'),
(uuid_generate_v4(), 'Financial Analysis', 'Finance', 'Financial modeling and analysis');

-- ============================================================================
-- COURSES CATALOG
-- ============================================================================

INSERT INTO learning.courses (id, title, description, category, difficulty_level, duration_hours, provider, external_url, skills_covered) VALUES
(uuid_generate_v4(), 'Advanced JavaScript Concepts', 'Deep dive into modern JavaScript features and patterns', 'Programming', 'advanced', 40, 'Internal Training', 'https://learning.company.com/js-advanced', 
 ARRAY[(SELECT id FROM profiles.skills WHERE name = 'JavaScript')]),

(uuid_generate_v4(), 'React Development Bootcamp', 'Comprehensive React.js development course', 'Frontend', 'intermediate', 60, 'Tech Academy', 'https://techacademy.com/react', 
 ARRAY[(SELECT id FROM profiles.skills WHERE name = 'React'), (SELECT id FROM profiles.skills WHERE name = 'JavaScript')]),

(uuid_generate_v4(), 'Python for Data Science', 'Python programming for data analysis and machine learning', 'Programming', 'intermediate', 80, 'DataCamp', 'https://datacamp.com/python-ds', 
 ARRAY[(SELECT id FROM profiles.skills WHERE name = 'Python'), (SELECT id FROM profiles.skills WHERE name = 'Machine Learning'), (SELECT id FROM profiles.skills WHERE name = 'Data Analysis')]),

(uuid_generate_v4(), 'Leadership Fundamentals', 'Essential leadership skills for new managers', 'Management', 'beginner', 20, 'Leadership Institute', 'https://leadership.com/fundamentals', 
 ARRAY[(SELECT id FROM profiles.skills WHERE name = 'Leadership'), (SELECT id FROM profiles.skills WHERE name = 'Communication')]),

(uuid_generate_v4(), 'Docker and Kubernetes', 'Containerization and orchestration technologies', 'DevOps', 'intermediate', 50, 'Cloud Native Academy', 'https://cloudnative.com/docker-k8s', 
 ARRAY[(SELECT id FROM profiles.skills WHERE name = 'Docker'), (SELECT id FROM profiles.skills WHERE name = 'Kubernetes')]),

(uuid_generate_v4(), 'AWS Solutions Architect', 'Designing scalable systems on AWS', 'Cloud', 'advanced', 100, 'AWS Training', 'https://aws.amazon.com/training', 
 ARRAY[(SELECT id FROM profiles.skills WHERE name = 'AWS')]),

(uuid_generate_v4(), 'Agile Project Management', 'Managing projects using Agile methodologies', 'Management', 'intermediate', 30, 'Agile Alliance', 'https://agilealliance.org/training', 
 ARRAY[(SELECT id FROM profiles.skills WHERE name = 'Agile Methodology'), (SELECT id FROM profiles.skills WHERE name = 'Project Management')]),

(uuid_generate_v4(), 'UX Design Principles', 'User-centered design thinking and methods', 'Design', 'beginner', 35, 'Design School', 'https://designschool.com/ux', 
 ARRAY[(SELECT id FROM profiles.skills WHERE name = 'UX Design')]),

(uuid_generate_v4(), 'Database Design with PostgreSQL', 'Advanced database design and optimization', 'Database', 'advanced', 45, 'DB Masters', 'https://dbmasters.com/postgresql', 
 ARRAY[(SELECT id FROM profiles.skills WHERE name = 'PostgreSQL')]),

(uuid_generate_v4(), 'Digital Marketing Strategy', 'Modern digital marketing techniques and tools', 'Marketing', 'intermediate', 25, 'Marketing Pro', 'https://marketingpro.com/digital', 
 ARRAY[(SELECT id FROM profiles.skills WHERE name = 'Digital Marketing')]);

-- ============================================================================
-- DEMO USERS (for development/testing)
-- ============================================================================

INSERT INTO auth.users (id, external_id, email, email_verified, first_name, last_name, preferred_username, status, gdpr_consent_at) VALUES
(uuid_generate_v4(), 'demo-admin-001', 'admin@company.com', true, 'Alice', 'Administrator', 'alice.admin', 'active', NOW()),
(uuid_generate_v4(), 'demo-hr-001', 'hr@company.com', true, 'Bob', 'HR Manager', 'bob.hr', 'active', NOW()),
(uuid_generate_v4(), 'demo-manager-001', 'manager@company.com', true, 'Carol', 'Team Lead', 'carol.manager', 'active', NOW()),
(uuid_generate_v4(), 'demo-employee-001', 'john.doe@company.com', true, 'John', 'Doe', 'john.doe', 'active', NOW()),
(uuid_generate_v4(), 'demo-employee-002', 'jane.smith@company.com', true, 'Jane', 'Smith', 'jane.smith', 'active', NOW()),
(uuid_generate_v4(), 'demo-employee-003', 'mike.wilson@company.com', true, 'Mike', 'Wilson', 'mike.wilson', 'active', NOW());

-- Assign roles to demo users
INSERT INTO auth.user_roles (user_id, role_id, assigned_by) 
SELECT u.id, r.id, u.id
FROM auth.users u, auth.roles r 
WHERE (u.external_id = 'demo-admin-001' AND r.name = 'admin')
   OR (u.external_id = 'demo-hr-001' AND r.name = 'hr_manager')
   OR (u.external_id = 'demo-manager-001' AND r.name = 'manager')
   OR (u.external_id = 'demo-employee-001' AND r.name = 'employee')
   OR (u.external_id = 'demo-employee-002' AND r.name = 'employee')
   OR (u.external_id = 'demo-employee-003' AND r.name = 'employee');

-- ============================================================================
-- USER PROFILES
-- ============================================================================

INSERT INTO profiles.user_profiles (user_id, bio, department, position, hire_date, location) 
SELECT u.id, 
       CASE 
         WHEN u.external_id = 'demo-admin-001' THEN 'System administrator with 10+ years experience'
         WHEN u.external_id = 'demo-hr-001' THEN 'HR professional focused on talent development'
         WHEN u.external_id = 'demo-manager-001' THEN 'Engineering team lead with strong technical background'
         WHEN u.external_id = 'demo-employee-001' THEN 'Full-stack developer passionate about modern web technologies'
         WHEN u.external_id = 'demo-employee-002' THEN 'Data scientist with expertise in machine learning'
         WHEN u.external_id = 'demo-employee-003' THEN 'DevOps engineer specializing in cloud infrastructure'
       END as bio,
       CASE 
         WHEN u.external_id = 'demo-admin-001' THEN 'IT'
         WHEN u.external_id = 'demo-hr-001' THEN 'Human Resources'
         WHEN u.external_id = 'demo-manager-001' THEN 'Engineering'
         WHEN u.external_id = 'demo-employee-001' THEN 'Engineering'
         WHEN u.external_id = 'demo-employee-002' THEN 'Data Science'
         WHEN u.external_id = 'demo-employee-003' THEN 'DevOps'
       END as department,
       CASE 
         WHEN u.external_id = 'demo-admin-001' THEN 'System Administrator'
         WHEN u.external_id = 'demo-hr-001' THEN 'HR Manager'
         WHEN u.external_id = 'demo-manager-001' THEN 'Engineering Manager'
         WHEN u.external_id = 'demo-employee-001' THEN 'Senior Developer'
         WHEN u.external_id = 'demo-employee-002' THEN 'Data Scientist'
         WHEN u.external_id = 'demo-employee-003' THEN 'DevOps Engineer'
       END as position,
       CURRENT_DATE - INTERVAL '2 years' as hire_date,
       'San Francisco, CA' as location
FROM auth.users u 
WHERE u.external_id LIKE 'demo-%';

-- ============================================================================
-- USER SKILLS
-- ============================================================================

-- John Doe (Full-stack developer) skills
INSERT INTO profiles.user_skills (user_id, skill_id, level, years_experience) 
SELECT u.id, s.id, 'advanced', 5
FROM auth.users u, profiles.skills s 
WHERE u.external_id = 'demo-employee-001' AND s.name IN ('JavaScript', 'React', 'Node.js');

INSERT INTO profiles.user_skills (user_id, skill_id, level, years_experience) 
SELECT u.id, s.id, 'intermediate', 3
FROM auth.users u, profiles.skills s 
WHERE u.external_id = 'demo-employee-001' AND s.name IN ('Python', 'PostgreSQL', 'Docker');

-- Jane Smith (Data scientist) skills
INSERT INTO profiles.user_skills (user_id, skill_id, level, years_experience) 
SELECT u.id, s.id, 'expert', 6
FROM auth.users u, profiles.skills s 
WHERE u.external_id = 'demo-employee-002' AND s.name IN ('Python', 'Machine Learning', 'Data Analysis');

INSERT INTO profiles.user_skills (user_id, skill_id, level, years_experience) 
SELECT u.id, s.id, 'intermediate', 2
FROM auth.users u, profiles.skills s 
WHERE u.external_id = 'demo-employee-002' AND s.name IN ('PostgreSQL', 'AWS');

-- Mike Wilson (DevOps engineer) skills
INSERT INTO profiles.user_skills (user_id, skill_id, level, years_experience) 
SELECT u.id, s.id, 'expert', 7
FROM auth.users u, profiles.skills s 
WHERE u.external_id = 'demo-employee-003' AND s.name IN ('Docker', 'Kubernetes', 'AWS');

INSERT INTO profiles.user_skills (user_id, skill_id, level, years_experience) 
SELECT u.id, s.id, 'advanced', 4
FROM auth.users u, profiles.skills s 
WHERE u.external_id = 'demo-employee-003' AND s.name IN ('Python', 'PostgreSQL');

-- ============================================================================
-- GAMIFICATION SETUP
-- ============================================================================

-- Initialize XP for demo users
INSERT INTO gamification.user_xp (user_id, total_xp, current_level, xp_to_next_level)
SELECT u.id, 
       CASE 
         WHEN u.external_id = 'demo-employee-001' THEN 1250
         WHEN u.external_id = 'demo-employee-002' THEN 2100
         WHEN u.external_id = 'demo-employee-003' THEN 1800
         ELSE 500
       END as total_xp,
       CASE 
         WHEN u.external_id = 'demo-employee-001' THEN 3
         WHEN u.external_id = 'demo-employee-002' THEN 4
         WHEN u.external_id = 'demo-employee-003' THEN 4
         ELSE 2
       END as current_level,
       250 as xp_to_next_level
FROM auth.users u 
WHERE u.external_id LIKE 'demo-%';

-- Create sample badges
INSERT INTO gamification.badges (id, name, description, icon_url, category, rarity, criteria) VALUES
(uuid_generate_v4(), 'First Steps', 'Complete your first learning module', '/icons/first-steps.svg', 'learning', 'common', 
 '{"type": "course_completion", "count": 1}'),
(uuid_generate_v4(), 'Skill Builder', 'Add 5 skills to your profile', '/icons/skill-builder.svg', 'profile', 'common', 
 '{"type": "skills_added", "count": 5}'),
(uuid_generate_v4(), 'Team Player', 'Help 3 colleagues with their development', '/icons/team-player.svg', 'collaboration', 'uncommon', 
 '{"type": "peer_help", "count": 3}'),
(uuid_generate_v4(), 'Knowledge Seeker', 'Complete 10 courses', '/icons/knowledge-seeker.svg', 'learning', 'rare', 
 '{"type": "course_completion", "count": 10}'),
(uuid_generate_v4(), 'Mentor', 'Mentor 5 junior colleagues', '/icons/mentor.svg', 'leadership', 'epic', 
 '{"type": "mentoring", "count": 5}');

-- Create sample achievements
INSERT INTO gamification.achievements (id, name, description, category, points, requirements) VALUES
(uuid_generate_v4(), 'Profile Complete', 'Fill out all profile sections', 'profile', 100, 
 '{"profile_completion": 100}'),
(uuid_generate_v4(), 'Learning Streak', 'Complete learning activities for 7 consecutive days', 'learning', 200, 
 '{"consecutive_days": 7, "activity_type": "learning"}'),
(uuid_generate_v4(), 'Skill Master', 'Reach expert level in any skill', 'skills', 300, 
 '{"skill_level": "expert", "count": 1}'),
(uuid_generate_v4(), 'Career Planner', 'Create and complete a development plan', 'planning', 250, 
 '{"development_plan": "completed"}'),
(uuid_generate_v4(), 'Voice Assistant User', 'Use voice assistant 10 times', 'engagement', 150, 
 '{"voice_interactions": 10}');

-- ============================================================================
-- SAMPLE VACANCIES
-- ============================================================================

INSERT INTO jobs.vacancies (id, title, description, department, location, employment_type, seniority_level, required_skills, preferred_skills, min_experience_years, posted_by, status) VALUES
(uuid_generate_v4(), 'Senior Full Stack Developer', 
 'We are looking for an experienced full-stack developer to join our engineering team. You will work on building scalable web applications using modern technologies.',
 'Engineering', 'San Francisco, CA', 'full_time', 'senior', 
 ARRAY[(SELECT id FROM profiles.skills WHERE name = 'JavaScript'), (SELECT id FROM profiles.skills WHERE name = 'React'), (SELECT id FROM profiles.skills WHERE name = 'Node.js')],
 ARRAY[(SELECT id FROM profiles.skills WHERE name = 'PostgreSQL'), (SELECT id FROM profiles.skills WHERE name = 'Docker')],
 5, (SELECT id FROM auth.users WHERE external_id = 'demo-hr-001'), 'open'),

(uuid_generate_v4(), 'Data Science Lead', 
 'Lead our data science initiatives and build machine learning models to drive business insights.',
 'Data Science', 'Remote', 'full_time', 'lead', 
 ARRAY[(SELECT id FROM profiles.skills WHERE name = 'Python'), (SELECT id FROM profiles.skills WHERE name = 'Machine Learning'), (SELECT id FROM profiles.skills WHERE name = 'Data Analysis')],
 ARRAY[(SELECT id FROM profiles.skills WHERE name = 'AWS'), (SELECT id FROM profiles.skills WHERE name = 'Leadership')],
 7, (SELECT id FROM auth.users WHERE external_id = 'demo-hr-001'), 'open'),

(uuid_generate_v4(), 'DevOps Engineer', 
 'Join our platform team to build and maintain our cloud infrastructure and deployment pipelines.',
 'DevOps', 'New York, NY', 'full_time', 'mid', 
 ARRAY[(SELECT id FROM profiles.skills WHERE name = 'Docker'), (SELECT id FROM profiles.skills WHERE name = 'Kubernetes'), (SELECT id FROM profiles.skills WHERE name = 'AWS')],
 ARRAY[(SELECT id FROM profiles.skills WHERE name = 'Python'), (SELECT id FROM profiles.skills WHERE name = 'PostgreSQL')],
 3, (SELECT id FROM auth.users WHERE external_id = 'demo-hr-001'), 'open');

-- ============================================================================
-- SAMPLE DEVELOPMENT PLANS
-- ============================================================================

INSERT INTO learning.development_plans (id, user_id, title, description, target_role, target_skills, status, start_date, target_date, created_by) VALUES
(uuid_generate_v4(), 
 (SELECT id FROM auth.users WHERE external_id = 'demo-employee-001'),
 'Path to Tech Lead', 
 'Development plan to transition from Senior Developer to Technical Lead role',
 'Technical Lead',
 ARRAY[(SELECT id FROM profiles.skills WHERE name = 'Leadership'), (SELECT id FROM profiles.skills WHERE name = 'Project Management')],
 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '12 months',
 (SELECT id FROM auth.users WHERE external_id = 'demo-manager-001')),

(uuid_generate_v4(), 
 (SELECT id FROM auth.users WHERE external_id = 'demo-employee-002'),
 'ML Engineering Transition', 
 'Transition from Data Science to ML Engineering with focus on production systems',
 'ML Engineer',
 ARRAY[(SELECT id FROM profiles.skills WHERE name = 'Docker'), (SELECT id FROM profiles.skills WHERE name = 'Kubernetes')],
 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '8 months',
 (SELECT id FROM auth.users WHERE external_id = 'demo-manager-001'));

-- Add tasks to development plans
INSERT INTO learning.plan_tasks (plan_id, title, description, task_type, related_course_id, priority, estimated_hours, due_date) 
SELECT dp.id, 'Complete Leadership Fundamentals Course', 'Build foundational leadership skills', 'course',
       (SELECT id FROM learning.courses WHERE title = 'Leadership Fundamentals'),
       1, 20, CURRENT_DATE + INTERVAL '2 months'
FROM learning.development_plans dp 
WHERE dp.title = 'Path to Tech Lead';

INSERT INTO learning.plan_tasks (plan_id, title, description, task_type, related_course_id, priority, estimated_hours, due_date) 
SELECT dp.id, 'Complete Docker and Kubernetes Course', 'Learn containerization technologies', 'course',
       (SELECT id FROM learning.courses WHERE title = 'Docker and Kubernetes'),
       1, 50, CURRENT_DATE + INTERVAL '3 months'
FROM learning.development_plans dp 
WHERE dp.title = 'ML Engineering Transition';

-- ============================================================================
-- SAMPLE RECOMMENDATIONS
-- ============================================================================

INSERT INTO learning.recommendations (user_id, recommendation_type, title, description, related_course_id, confidence_score, reasoning, llm_model_version, status) VALUES
((SELECT id FROM auth.users WHERE external_id = 'demo-employee-001'), 
 'course', 'Leadership Fundamentals', 
 'Based on your career goal to become a Tech Lead, this course will help you develop essential leadership skills.',
 (SELECT id FROM learning.courses WHERE title = 'Leadership Fundamentals'),
 0.92, 'User expressed interest in leadership role and has strong technical skills but lacks formal leadership training',
 'gpt-4-turbo', 'pending'),

((SELECT id FROM auth.users WHERE external_id = 'demo-employee-002'), 
 'course', 'Docker and Kubernetes', 
 'To transition to ML Engineering, you should learn containerization technologies used in production ML systems.',
 (SELECT id FROM learning.courses WHERE title = 'Docker and Kubernetes'),
 0.88, 'User has strong ML skills but needs infrastructure knowledge for production deployment',
 'gpt-4-turbo', 'pending'),

((SELECT id FROM auth.users WHERE external_id = 'demo-employee-003'), 
 'skill', 'Machine Learning', 
 'Adding ML skills would complement your DevOps expertise and open opportunities in MLOps.',
 NULL,
 0.75, 'User has strong infrastructure skills and could benefit from understanding ML workloads',
 'gpt-4-turbo', 'pending');

-- ============================================================================
-- SAMPLE ANALYTICS DATA
-- ============================================================================

-- Generate some sample user activity
INSERT INTO analytics.user_activities (user_id, activity_type, activity_description, entity_type, entity_id, occurred_at) 
SELECT u.id, 'profile_update', 'Updated profile information', 'profile', up.id, NOW() - INTERVAL '1 day'
FROM auth.users u 
JOIN profiles.user_profiles up ON u.id = up.user_id
WHERE u.external_id LIKE 'demo-%';

INSERT INTO analytics.user_activities (user_id, activity_type, activity_description, entity_type, entity_id, occurred_at) 
SELECT u.id, 'skill_added', 'Added new skill to profile', 'skill', us.skill_id, NOW() - INTERVAL '2 days'
FROM auth.users u 
JOIN profiles.user_skills us ON u.id = us.user_id
WHERE u.external_id LIKE 'demo-%'
LIMIT 5;

-- Generate some XP events
INSERT INTO gamification.xp_events (user_id, event_type, event_description, xp_amount, related_entity_type, created_at) 
SELECT u.id, 'profile_completion', 'Completed profile setup', 100, 'profile', NOW() - INTERVAL '3 days'
FROM auth.users u 
WHERE u.external_id LIKE 'demo-%';

INSERT INTO gamification.xp_events (user_id, event_type, event_description, xp_amount, related_entity_type, created_at) 
SELECT u.id, 'skill_added', 'Added skill to profile', 25, 'skill', NOW() - INTERVAL '2 days'
FROM auth.users u 
WHERE u.external_id LIKE 'demo-%';

-- ============================================================================
-- DATA RETENTION POLICIES (GDPR Compliance)
-- ============================================================================

-- Set data retention periods for demo users (normally this would be configured per data type)
UPDATE auth.users 
SET data_retention_until = CURRENT_DATE + INTERVAL '7 years'
WHERE external_id LIKE 'demo-%';

-- ============================================================================
-- SAMPLE AUDIT LOGS
-- ============================================================================

INSERT INTO audit.logs (user_id, action, resource_type, resource_id, success, created_at) 
SELECT u.id, 'login', 'session', uuid_generate_v4(), true, NOW() - INTERVAL '1 hour'
FROM auth.users u 
WHERE u.external_id LIKE 'demo-%';

INSERT INTO audit.logs (user_id, action, resource_type, resource_id, success, created_at) 
SELECT u.id, 'profile_update', 'profile', up.id, true, NOW() - INTERVAL '1 day'
FROM auth.users u 
JOIN profiles.user_profiles up ON u.id = up.user_id
WHERE u.external_id LIKE 'demo-%';