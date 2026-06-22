-- Data exactly as given in the case.
USE qa_case;

INSERT INTO user_define (id, name) VALUES
    (1, 'Ariel'),
    (2, 'Taylor'),
    (3, 'Luka');

INSERT INTO role_define (id, label) VALUES
    (1, 'charge'),
    (2, 'analyze'),
    (3, 'produce_consume'),
    (4, 'manage');

INSERT INTO action_define (id, description) VALUES
    (1, 'create bills'),
    (2, 'create products'),
    (3, 'view bills'),
    (4, 'view products'),
    (5, 'modify products'),
    (6, 'delete products');

INSERT INTO user_role_rela (id, user_id, role_id) VALUES
    (1, 1, 1),
    (2, 2, 2),
    (3, 2, 3),
    (4, 3, 2),
    (5, 3, 3),
    (6, 3, 4);

INSERT INTO role_action_rela (id, role_id, action_id) VALUES
    (1, 1, 1),
    (2, 1, 3),
    (3, 2, 4),
    (4, 3, 2),
    (5, 3, 6),
    (6, 4, 5);
