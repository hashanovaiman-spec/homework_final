USE ProductsApplication;

-- Example from task 25.6.1. The API stores a pair in canonical order,
-- so a single row represents a two-way "similar" relation.
INSERT IGNORE INTO related_products (product_id, similar_product_id) VALUES
('34e1a2a7-d0a9-4c7a-99f6-c2d5b5afaa06', '88a3f826-9c3d-4f7c-a56e-156d7c3f3b28'), -- Galaxy A52 <-> Phone X
('34e1a2a7-d0a9-4c7a-99f6-c2d5b5afaa06', '9b4d4a1a-5224-4ad4-b4e3-053dcbfa0f3c'), -- Galaxy A52 <-> iPhone SE
('6f1a6b96-6cd2-439c-a648-88b9f287f7d2', 'e144947e-3af7-4d3c-8327-ecf39255617d'); -- Moto G60 <-> Zenfone 8
