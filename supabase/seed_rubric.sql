-- Seeds rubric_criteria directly from rubric.txt (Kargo Hiring Rubric).
-- Weights are stored as decimals (0.30 == 30%). Do not edit criteria wording here;
-- if the rubric changes, edit rubric.txt first, then regenerate this file.

truncate table rubric_criteria;

insert into rubric_criteria (role, criterion_name, description, weight, sort_order) values
('PM', 'Self-Initiated Ownership',
 'At least one specific instance of the candidate stepping outside what their role already asked of them - solving a problem that wasn''t assigned, or responding to something unplanned - and building a fix or new way of working that others adopted unprompted. Strong execution on work that was already part of the job does not count on its own, however good the results.',
 0.30, 1),
('PM', 'Ground-Floor Logistics Exposure',
 'Has personally performed hands-on work inside freight, customs, carrier, or port operations - not just built or sold software near it - for at least one distinct role, described specifically enough to name what the work actually involved day to day.',
 0.20, 2),
('PM', 'Failure Into Durable Practice',
 'Describes a specific moment something broke or didn''t go to plan, and their response included writing down or building a lasting change - not just a one-off patch.',
 0.25, 3),
('PM', 'Trusted With Unsupervised Calls',
 'A specific, named instance - not a general statement about reporting lines or team structure - where someone let the candidate make a call alone on something with real stakes (money, a client relationship, a deadline), without approval sitting above them at that moment. A claim like "no manager above me" does not count without a concrete outcome attached to it.',
 0.25, 4),

('SPM', 'Self-Initiated Ownership',
 'Shows the same pattern as PM (stepping outside what their role already asked of them, not just executing assigned work well) more than once, and at least one instance reaches beyond their own desk - other teams, not just their own function, ended up depending on what they built.',
 0.35, 1),
('SPM', 'Ground-Floor Logistics Exposure',
 'Same bar as PM, but that operational grounding visibly shaped a later, higher-stakes technical or architectural call - not just background on the CV.',
 0.15, 2),
('SPM', 'Failure Into Durable Practice',
 'Same bar as PM, but the resulting change had to survive contact with more than one stakeholder or team - other people changed how they work because of it.',
 0.20, 3),
('SPM', 'Trusted With Unsupervised Calls',
 'Same bar as PM (a specific named instance with a concrete outcome, not a reporting-line claim), but the call sits at a cross-functional or strategic level, and ideally there''s a direct quote or explicit statement from someone else confirming the trust - not just self-description.',
 0.30, 4);
