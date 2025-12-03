-- ---------------------------------------------------
-- 3. INSERCIÓN DE DATOS FICTICIOS (CIFRADOS con crypt y salt='my_salt')
-- ---------------------------------------------------

-- Nota: Estas sentencias asumen que la extensión pgcrypto está instalada.
-- Las contraseñas en texto plano para referencia son las siguientes:
-- andrea123, juanpass, luis_g, marta456, carlitos77, sofia_p, roberto_o, diana100

INSERT INTO PERSONAS (ID_Persona, Nombre, Apellido, FechaNacimiento, Telefono, Email, password) VALUES
('1710034065', 'Andrea', 'Maldonado', '1995-05-15', '0991234567', 'andrea.maldonado@email.com', crypt('andrea123', 'my_salt')),
('0912345678', 'Juan', 'Pérez', '1988-10-20', '0987654321', 'juan.perez@email.com', crypt('juanpass', 'my_salt')),
('1301234567', 'Luis', 'García', '2001-03-01', '0960010020', 'luis.garcia@email.com', crypt('luis_g', 'my_salt')),
('0701234567', 'Marta', 'Vásquez', '1990-11-28', '0990909090', 'marta.vasquez@email.com', crypt('marta456', 'my_salt')),
('2101234567', 'Carlos', 'Rojas', '1975-08-10', '0955554444', 'carlos.rojas@email.com', crypt('carlitos77', 'my_salt')),
('0801234567', 'Sofía', 'Ramírez', '1998-01-25', '0992345678', 'sofia.ramirez@email.com', crypt('sofia_p', 'my_salt')),
('1101234567', 'Roberto', 'Ortiz', '1985-07-03', '0983456789', 'roberto.ortiz@email.com', crypt('roberto_o', 'my_salt')),
('0601234567', 'Diana', 'Vera', '1992-04-12', '0974567890', 'diana.vera@email.com', crypt('diana100', 'my_salt'));

-- ---------------------------------------------------
-- 4. INSERCIÓN DE DATOS PARA SOCIOS
-- ---------------------------------------------------

-- SOCIOS (5 registros en total)
INSERT INTO SOCIOS (ID_Socio, FechaRegistro, Estado) VALUES
('0912345678', '2024-01-15', 'Activo'),   -- Juan Pérez
('1301234567', '2024-03-20', 'Activo'),   -- Luis García
('0801234567', '2024-05-01', 'Activo'),   -- Sofía Ramírez
('1101234567', '2024-06-20', 'Inactivo'); -- Roberto Ortiz (El socio inactivo)


5. INSERCIÓN DE DATOS PARA EMPLEADOS
-- ---------------------------------------------------

-- EMPLEADOS (3 registros en total)
INSERT INTO EMPLEADOS (ID_Empleado, Cargo, Salario, FechaContratacion) VALUES
('0701234567', 'Entrenador Personal', 850.00, '2023-05-01'), -- Marta Vásquez
('2101234567', 'Administrador', 1200.00, '2022-11-15'),      -- Carlos Rojas
('0601234567', 'Mantenimiento', 650.00, '2023-10-10');       -- Diana Vera

-- 6. INSERCIÓN DE DATOS PARA MEMBRESIAS
-- ---------------------------------------------------

INSERT INTO MEMBRESIAS (ID_Socio, ID_Plan, FechaInicio, FechaFin) VALUES
('1710034065', 1, '2024-06-01', '2024-07-01'),  -- Andrea: Plan 1 (Básico Mensual)
('0912345678', 2, '2024-03-01', '2025-03-01'),  -- Juan: Plan 2 (Anual VIP)
('1301234567', 3, '2024-05-15', '2024-08-13'),  -- Luis: Plan 3 (Trimestral Estándar)
('0801234567', 1, '2024-06-15', '2024-07-15'),  -- Sofía: Plan 1 (Básico Mensual)
('1101234567', 4, '2024-06-20', '2024-06-27');  -- Roberto: Plan 4 (Semanal Prueba)