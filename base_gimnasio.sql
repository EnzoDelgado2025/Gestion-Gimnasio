-- Tabla de Personas: Contiene datos comunes para empleados y socios
CREATE TABLE PERSONAS (
    ID_Persona VARCHAR(10) PRIMARY KEY, -- MODIFICADO: De SERIAL a VARCHAR(10)
    Nombre VARCHAR(50) NOT NULL,
    Apellido VARCHAR(50) NOT NULL,
    FechaNacimiento DATE NOT NULL,
    Telefono VARCHAR(15) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    password text pg_catalog."default" NOT NULL,
    CHECK (Email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$') -- Validación básica de email
);
-- Tabla de Socios: Extiende PERSONAS
CREATE TABLE SOCIOS (
    ID_Socio VARCHAR(10) PRIMARY KEY, -- MODIFICADO: De INT a VARCHAR(10)
    FechaRegistro DATE NOT NULL DEFAULT CURRENT_DATE,
    Estado VARCHAR(10) NOT NULL DEFAULT 'Activo',
    FOREIGN KEY (ID_Socio) REFERENCES PERSONAS(ID_Persona) ON DELETE CASCADE,
    CHECK (Estado IN ('Activo', 'Inactivo'))
);
-- Tabla de Empleados: Extiende PERSONAS
CREATE TABLE EMPLEADOS (
    ID_Empleado VARCHAR(10) PRIMARY KEY, -- MODIFICADO: De INT a VARCHAR(10)
    Cargo VARCHAR(50) NOT NULL,
    Salario DECIMAL(10, 2) NOT NULL,
    FechaContratacion DATE NOT NULL,
    FOREIGN KEY (ID_Empleado) REFERENCES PERSONAS(ID_Persona) ON DELETE CASCADE,
    CHECK (Salario > 0)
);
---------------------------------------------------
-- ADMINISTRACIÓN DE MEMBRESÍAS Y PAGOS
---------------------------------------------------

-- Tabla de Planes de Membresía
CREATE TABLE PLANES_MEMBRESIA (
    ID_Plan SERIAL PRIMARY KEY,
    NombrePlan VARCHAR(50) UNIQUE NOT NULL,
    DuracionDias INT NOT NULL,
    Precio DECIMAL(10, 2) NOT NULL,
    CHECK (DuracionDias > 0),
    CHECK (Precio >= 0)
);

-- Tabla de Membresías Contratadas
CREATE TABLE MEMBRESIAS (
    ID_Membresia SERIAL PRIMARY KEY,
    ID_Socio VARCHAR(10) NOT NULL,
    ID_Plan INT NOT NULL,
    FechaInicio DATE NOT NULL,
    FechaFin DATE NOT NULL,
    FOREIGN KEY (ID_Socio) REFERENCES SOCIOS(ID_Socio) ON DELETE RESTRICT,
    FOREIGN KEY (ID_Plan) REFERENCES PLANES_MEMBRESIA(ID_Plan) ON DELETE RESTRICT,
    CHECK (FechaFin > FechaInicio) -- Asegura que la membresía tenga duración
);

-- Tabla de Pagos
CREATE TABLE PAGOS (
    ID_Pago SERIAL PRIMARY KEY,
    ID_Membresia INT NOT NULL,
    MontoPagado DECIMAL(10, 2) NOT NULL,
    FechaPago TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    MetodoPago VARCHAR(20) NOT NULL,
    Estado VARCHAR(15) NOT NULL DEFAULT 'Completado',
    FOREIGN KEY (ID_Membresia) REFERENCES MEMBRESIAS(ID_Membresia) ON DELETE RESTRICT,
    CHECK (MontoPagado >= 0),
    CHECK (Estado IN ('Completado', 'Pendiente'))
);

---------------------------------------------------
-- ADMINISTRACIÓN Y RESERVA DE MÁQUINAS
---------------------------------------------------

-- Tabla de Máquinas (Inventario)
CREATE TABLE MAQUINAS (
    ID_Maquina SERIAL PRIMARY KEY,
    Nombre VARCHAR(50) NOT NULL,
    Tipo VARCHAR(50) NOT NULL, -- Ej: Cardio, Fuerza
    UltimoMantenimiento DATE,
    EstadoOperativo VARCHAR(10) NOT NULL DEFAULT 'Operativa',
    Imagen TEXT,
    CHECK (EstadoOperativo IN ('Operativa', 'Averiada'))
);

-- Tabla de Reservas de Máquinas
CREATE TABLE RESERVAS_MAQUINAS (
    ID_Reserva SERIAL PRIMARY KEY,
    ID_Socio VARCHAR(10) NOT NULL,
    ID_Maquina INT NOT NULL,
    FechaReserva DATE NOT NULL,
    HoraInicio TIME NOT NULL,
    HoraFin TIME NOT NULL,
    FOREIGN KEY (ID_Socio) REFERENCES SOCIOS(ID_Socio) ON DELETE CASCADE,
    FOREIGN KEY (ID_Maquina) REFERENCES MAQUINAS(ID_Maquina) ON DELETE RESTRICT,
    UNIQUE (ID_Maquina, FechaReserva, HoraInicio), -- No se puede reservar la misma máquina a la misma hora
    CHECK (HoraFin > HoraInicio) -- Asegura que la reserva tenga duración
);

-- Índice para mejorar las búsquedas por socio en reservas
CREATE INDEX idx_reservas_socio ON RESERVAS_MAQUINAS (ID_Socio);

-- ---------------------------------------------------
-- GESTIÓN DE BASE DE DATOS
-- ---------------------------------------------------

-- 1. CREACIÓN DE LA BASE DE DATOS (Opcional, si no existe)
-- CREATE DATABASE gym_management_db;
-- \c gym_management_db; -- Conectar a la nueva base de datos

-- ---------------------------------------------------
-- 2. ESTRUCTURA DE TABLAS
-- ---------------------------------------------------

-- GESTIÓN DE PERSONAS (Entidad Base)
---------------------------------------------------
-- Tabla de Personas: Contiene datos comunes para empleados y socios
CREATE TABLE PERSONAS (
    ID_Persona VARCHAR(10) PRIMARY KEY, -- MODIFICADO: Ahora es VARCHAR(10) para cédulas
    Nombre VARCHAR(50) NOT NULL,
    Apellido VARCHAR(50) NOT NULL,
    FechaNacimiento DATE NOT NULL,
    Telefono VARCHAR(15) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    CHECK (Email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$')
);

-- Tabla de Socios: Extiende PERSONAS
CREATE TABLE SOCIOS (
    ID_Socio VARCHAR(10) PRIMARY KEY, -- MODIFICADO: Ahora es VARCHAR(10)
    FechaRegistro DATE NOT NULL DEFAULT CURRENT_DATE,
    Estado VARCHAR(10) NOT NULL DEFAULT 'Activo',
    FOREIGN KEY (ID_Socio) REFERENCES PERSONAS(ID_Persona) ON DELETE CASCADE,
    CHECK (Estado IN ('Activo', 'Inactivo'))
);

-- Tabla de Empleados: Extiende PERSONAS
CREATE TABLE EMPLEADOS (
    ID_Empleado VARCHAR(10) PRIMARY KEY, -- MODIFICADO: Ahora es VARCHAR(10)
    Cargo VARCHAR(50) NOT NULL,
    Salario DECIMAL(10, 2) NOT NULL,
    FechaContratacion DATE NOT NULL,
    FOREIGN KEY (ID_Empleado) REFERENCES PERSONAS(ID_Persona) ON DELETE CASCADE,
    CHECK (Salario > 0)
);

-- ADMINISTRACIÓN DE MEMBRESÍAS Y PAGOS
---------------------------------------------------
-- Tabla de Planes de Membresía
CREATE TABLE PLANES_MEMBRESIA (
    ID_Plan SERIAL PRIMARY KEY,
    NombrePlan VARCHAR(50) UNIQUE NOT NULL,
    DuracionDias INT NOT NULL,
    Precio DECIMAL(10, 2) NOT NULL,
    CHECK (DuracionDias > 0),
    CHECK (Precio >= 0)
);

-- Tabla de Membresías Contratadas
CREATE TABLE MEMBRESIAS (
    ID_Membresia SERIAL PRIMARY KEY,
    ID_Socio VARCHAR(10) NOT NULL,
    ID_Plan INT NOT NULL,
    FechaInicio DATE NOT NULL,
    FechaFin DATE NOT NULL,
    FOREIGN KEY (ID_Socio) REFERENCES SOCIOS(ID_Socio) ON DELETE RESTRICT,
    FOREIGN KEY (ID_Plan) REFERENCES PLANES_MEMBRESIA(ID_Plan) ON DELETE RESTRICT,
    CHECK (FechaFin > FechaInicio)
);

-- Tabla de Pagos
CREATE TABLE PAGOS (
    ID_Pago SERIAL PRIMARY KEY,
    ID_Membresia INT NOT NULL,
    MontoPagado DECIMAL(10, 2) NOT NULL,
    FechaPago TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    MetodoPago VARCHAR(20) NOT NULL,
    Estado VARCHAR(15) NOT NULL DEFAULT 'Completado',
    FOREIGN KEY (ID_Membresia) REFERENCES MEMBRESIAS(ID_Membresia) ON DELETE RESTRICT,
    CHECK (MontoPagado >= 0),
    CHECK (Estado IN ('Completado', 'Pendiente'))
);

-- ADMINISTRACIÓN Y RESERVA DE MÁQUINAS
---------------------------------------------------
-- Tabla de Máquinas (Inventario)
CREATE TABLE MAQUINAS (
    ID_Maquina SERIAL PRIMARY KEY,
    Nombre VARCHAR(50) NOT NULL,
    Tipo VARCHAR(50) NOT NULL, -- Ej: Cardio, Fuerza
    UltimoMantenimiento DATE,
    EstadoOperativo VARCHAR(10) NOT NULL DEFAULT 'Operativa',
    CHECK (EstadoOperativo IN ('Operativa', 'Averiada'))
);

-- Tabla de Reservas de Máquinas
CREATE TABLE RESERVAS_MAQUINAS (
    ID_Reserva SERIAL PRIMARY KEY,
    ID_Socio VARCHAR(10) NOT NULL,
    ID_Maquina INT NOT NULL,
    FechaReserva DATE NOT NULL,
    HoraInicio TIME NOT NULL,
    HoraFin TIME NOT NULL,
    FOREIGN KEY (ID_Socio) REFERENCES SOCIOS(ID_Socio) ON DELETE CASCADE,
    FOREIGN KEY (ID_Maquina) REFERENCES MAQUINAS(ID_Maquina) ON DELETE RESTRICT,
    UNIQUE (ID_Maquina, FechaReserva, HoraInicio), -- No se puede reservar la misma máquina a la misma hora
    CHECK (HoraFin > HoraInicio)
);

-- Índice para mejorar las búsquedas por socio en reservas
CREATE INDEX idx_reservas_socio ON RESERVAS_MAQUINAS (ID_Socio);


-- ---------------------------------------------------
-- 3. INSERCIÓN DE DATOS FICTICIOS
-- ---------------------------------------------------

-- DATOS INICIALES (5 personas)
INSERT INTO PERSONAS (ID_Persona, Nombre, Apellido, FechaNacimiento, Telefono, Email) VALUES
('1710034065', 'Andrea', 'Maldonado', '1995-05-15', '0991234567', 'andrea.maldonado@email.com'),
('0912345678', 'Juan', 'Pérez', '1988-10-20', '0987654321', 'juan.perez@email.com'),
('1301234567', 'Luis', 'García', '2001-03-01', '0960010020', 'luis.garcia@email.com'),
('0701234567', 'Marta', 'Vásquez', '1990-11-28', '0990909090', 'marta.vasquez@email.com'),
('2101234567', 'Carlos', 'Rojas', '1975-08-10', '0955554444', 'carlos.rojas@email.com');

-- DATOS ADICIONALES (3 personas)
INSERT INTO PERSONAS (ID_Persona, Nombre, Apellido, FechaNacimiento, Telefono, Email) VALUES
('0801234567', 'Sofía', 'Ramírez', '1998-01-25', '0992345678', 'sofia.ramirez@email.com'),
('1101234567', 'Roberto', 'Ortiz', '1985-07-03', '0983456789', 'roberto.ortiz@email.com'),
('0601234567', 'Diana', 'Vera', '1992-04-12', '0974567890', 'diana.vera@email.com');

-- SOCIOS (5 registros en total)
INSERT INTO SOCIOS (ID_Socio, FechaRegistro, Estado) VALUES
('1710034065', '2024-01-10', 'Activo'),
('0912345678', '2024-01-15', 'Activo'),
('1301234567', '2024-03-20', 'Activo'),
('0801234567', '2024-05-01', 'Activo'),
('1101234567', '2024-06-20', 'Inactivo');

-- EMPLEADOS (3 registros en total)
INSERT INTO EMPLEADOS (ID_Empleado, Cargo, Salario, FechaContratacion) VALUES
('0701234567', 'Entrenador Personal', 850.00, '2023-05-01'),
('2101234567', 'Administrador', 1200.00, '2022-11-15'),
('0601234567', 'Mantenimiento', 650.00, '2023-10-10');

-- PLANES_MEMBRESIA (4 registros en total)
INSERT INTO PLANES_MEMBRESIA (NombrePlan, DuracionDias, Precio) VALUES
('Básico Mensual', 30, 40.00),
('Anual VIP', 365, 360.00),
('Trimestral Estándar', 90, 100.00),
('Semanal Prueba', 7, 15.00);

-- MEMBRESIAS (5 registros en total)
INSERT INTO MEMBRESIAS (ID_Socio, ID_Plan, FechaInicio, FechaFin) VALUES
('1710034065', 1, '2024-06-01', '2024-07-01'),  -- Andrea: Mensual (ID_Membresia: 1)
('0912345678', 2, '2024-03-01', '2025-03-01'),  -- Juan: Anual (ID_Membresia: 2)
('1301234567', 3, '2024-05-15', '2024-08-13'),  -- Luis: Trimestral (ID_Membresia: 3)
('0801234567', 1, '2024-06-15', '2024-07-15'),  -- Sofía: Mensual (ID_Membresia: 4)
('1101234567', 4, '2024-06-20', '2024-06-27');  -- Roberto: Semanal (ID_Membresia: 5)

-- PAGOS (6 registros en total)
INSERT INTO PAGOS (ID_Membresia, MontoPagado, FechaPago, MetodoPago, Estado) VALUES
(1, 40.00, CURRENT_TIMESTAMP, 'Tarjeta', 'Completado'),
(2, 360.00, CURRENT_TIMESTAMP, 'Transferencia', 'Completado'),
(3, 100.00, CURRENT_TIMESTAMP, 'Efectivo', 'Completado'),
(4, 40.00, '2024-06-15 11:30:00', 'Transferencia', 'Completado'),
(5, 15.00, '2024-06-20 09:00:00', 'Efectivo', 'Completado'),
(4, 40.00, '2024-07-15 12:00:00', 'Tarjeta', 'Pendiente'); -- Pago pendiente

-- MAQUINAS (5 registros en total)
INSERT INTO MAQUINAS (Nombre, Tipo, UltimoMantenimiento, EstadoOperativo) VALUES
('Caminadora X100', 'Cardio', '2024-04-10', 'Operativa'),
('Prensa de Piernas', 'Fuerza', '2024-01-05', 'Operativa'),
('Bicicleta Estática', 'Cardio', '2024-06-01', 'Averiada'),
('Máquina de Remo', 'Cardio', '2024-03-20', 'Operativa'),
('Rack de Sentadillas', 'Fuerza', '2024-05-15', 'Operativa');

-- RESERVAS_MAQUINAS (7 registros en total)
INSERT INTO RESERVAS_MAQUINAS (ID_Socio, ID_Maquina, FechaReserva, HoraInicio, HoraFin) VALUES
('1710034065', 1, '2024-06-25', '10:00:00', '11:00:00'),
('0912345678', 2, '2024-06-25', '18:30:00', '19:30:00'),
('1710034065', 2, '2024-06-26', '10:30:00', '11:30:00'),
('0801234567', 4, '2024-06-25', '19:00:00', '20:00:00'),
('0912345678', 1, '2024-06-26', '07:00:00', '08:00:00'),
('1710034065', 5, '2024-06-27', '17:00:00', '18:30:00'),
('0801234567', 5, '2024-06-27', '18:30:00', '19:30:00');