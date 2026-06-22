-- Audit query: list every action each user can perform, through their roles.
-- Run it BEFORE and AFTER solution.sql to see the effect on Taylor.
USE qa_case;

SELECT u.name                       AS user_name,
       GROUP_CONCAT(DISTINCT r.label    ORDER BY r.label    SEPARATOR ', ') AS roles,
       GROUP_CONCAT(DISTINCT a.description ORDER BY a.id     SEPARATOR ', ') AS allowed_actions
FROM   user_define u
JOIN   user_role_rela   ur ON ur.user_id = u.id
JOIN   role_define      r  ON r.id       = ur.role_id
JOIN   role_action_rela ra ON ra.role_id = r.id
JOIN   action_define    a  ON a.id       = ra.action_id
GROUP  BY u.id, u.name
ORDER  BY u.id;

-- Focused check on Taylor's product permissions.
SELECT a.description AS taylor_can,
       CASE WHEN a.description IN ('create products','delete products')
            THEN 'inventory change (should be denied)'
            ELSE 'ok' END AS note
FROM   user_define u
JOIN   user_role_rela   ur ON ur.user_id = u.id
JOIN   role_action_rela ra ON ra.role_id = ur.role_id
JOIN   action_define    a  ON a.id       = ra.action_id
WHERE  u.name = 'Taylor'
  AND  a.description LIKE '%products%'
ORDER  BY a.id;
