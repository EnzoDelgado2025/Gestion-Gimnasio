const express = require('express');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const app = express();
const puerto= 3000;
const pool = require('./db');



app.use(express.json());

app.use(cors({
    origin: true,
    credentials: true
}));


// Servir archivos estáticos desde /html
const path = require('path');
app.use(express.static(path.join(__dirname, 'html')));

// Endpoint para registrar una persona (con password encriptado usando crypt de PostgreSQL)
app.post('/registro_persona', async (req, res) => {
    const client = await pool.connect();
    try {
        const { ID_Persona, Nombre, Apellido, FechaNacimiento, Telefono, Email, password, FechaRegistro, Estado } = req.body;
        const salt = 'my_salt';
        await client.query('BEGIN');
        // Insertar en PERSONAS
        const queryPersona = `INSERT INTO PERSONAS (ID_Persona, Nombre, Apellido, FechaNacimiento, Telefono, Email, password)
                              VALUES ($1, $2, $3, $4, $5, $6, crypt($7, $8)) RETURNING *`;
        const valuesPersona = [ID_Persona, Nombre, Apellido, FechaNacimiento, Telefono, Email, password, salt];
        const resultPersona = await client.query(queryPersona, valuesPersona);

        // Insertar en SOCIOS con todos los campos
        const querySocio = `INSERT INTO SOCIOS (ID_Socio, FechaRegistro, Estado) VALUES ($1, $2, $3) RETURNING *`;
        const valuesSocio = [ID_Persona, FechaRegistro || null, Estado || null];
        const resultSocio = await client.query(querySocio, valuesSocio);

        await client.query('COMMIT');
        res.json({ mensaje: 'registro correcto', persona: resultPersona.rows[0], socio: resultSocio.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error.message);
        res.status(500).send('Error al registrar ');
    } finally {
        client.release();
    }
});

// Endpoint para login de persona (autenticación solo en PERSONAS)
app.post('/login_socio', async (req, res) => {
    try {
        const { ID_Persona, password } = req.body;
        const salt = 'my_salt';
        // Verificar credenciales en PERSONAS
        const query = `SELECT ID_Persona, Nombre, Apellido, Email FROM PERSONAS WHERE ID_Persona = $1 AND password = crypt($2, $3)`;
        const values = [ID_Persona, password, salt];
        const result = await pool.query(query, values);
        if (result.rowCount === 0) {
            return res.status(401).json({ mensaje: 'Credenciales inválidas' });
        }
        // Verificar si es socio
        const socioResult = await pool.query('SELECT 1 FROM SOCIOS WHERE ID_Socio = $1', [ID_Persona]);
        if (socioResult.rowCount > 0) {
            return res.json({ mensaje: 'Login exitoso', tipo: 'socio', persona: result.rows[0] });
        }
        // Verificar si es empleado
        const empleadoResult = await pool.query('SELECT 1 FROM EMPLEADOS WHERE ID_Empleado = $1', [ID_Persona]);
        if (empleadoResult.rowCount > 0) {
            return res.json({ mensaje: 'Login exitoso', tipo: 'empleado', persona: result.rows[0] });
        }
        // Si no es socio ni empleado
        return res.status(403).json({ mensaje: 'Usuario sin rol válido' });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error en el login');
    }
});



// Endpoint para modificar el estado de un socio
app.put('/modificar_estado_socio/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { Estado } = req.body;
        // Primero buscar el socio
        const busqueda = await pool.query(
            `SELECT p.ID_Persona, p.Nombre, p.Apellido, p.Email, 
                    s.ID_Socio, s.FechaRegistro, s.Estado 
             FROM PERSONAS p
             JOIN SOCIOS s ON p.ID_Persona = s.ID_Socio
             WHERE p.ID_Persona = $1`,
            [id]
        );
        if (busqueda.rowCount === 0) {
            return res.status(404).json({ mensaje: 'Socio no encontrado' });
        }
        // Si se encuentra, modificar su estado
        const result = await pool.query('UPDATE SOCIOS SET Estado = $1 WHERE ID_Socio = $2 RETURNING *', [Estado, id]);
        res.json({ mensaje: 'Estado del socio actualizado correctamente', socio: result.rows[0], socioAnterior: busqueda.rows[0] });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error al modificar el estado del socio');
    }
});
// Endpoint para eliminar un socio por ID_Socio
app.delete('/eliminar_socio/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        await client.query('BEGIN');
        // Primero obtener la información del socio antes de eliminarlo
        const socioResult = await client.query('SELECT * FROM SOCIOS WHERE ID_Socio = $1', [id]);
        if (socioResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ mensaje: 'Socio no encontrado' });
        }
        // Eliminar de SOCIOS
        const result = await client.query('DELETE FROM SOCIOS WHERE ID_Socio = $1 RETURNING *', [id]);
        // Eliminar de PERSONAS
        const personaResult = await client.query('DELETE FROM PERSONAS WHERE ID_Persona = $1 RETURNING *', [id]);
        await client.query('COMMIT');
        res.json({ mensaje: 'Socio eliminado correctamente', socio: result.rows[0], persona: personaResult.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error.message);
        res.status(500).send('Error al eliminar socio');
    } finally {
        client.release();
    }
});

// Endpoint para consultar un socio por ID
app.get('/consulta_socios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT p.ID_Persona, p.Nombre, p.Apellido, p.FechaNacimiento, p.Telefono, p.Email, 
                    s.ID_Socio, s.FechaRegistro, s.Estado 
             FROM PERSONAS p
             JOIN SOCIOS s ON p.ID_Persona = s.ID_Socio
             WHERE p.ID_Persona = $1`,
            [id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ mensaje: 'Socio no encontrado' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error al consultar el socio');
    }
});


//Endpoint empleados

// Endpoint para registrar un empleado (inserta en PERSONAS y EMPLEADOS)
app.post('/registro_empleado', async (req, res) => {
    const client = await pool.connect();
    try {
        const { ID_Persona, Nombre, Apellido, FechaNacimiento, Telefono, Email, password, Cargo, Salario, FechaContratacion } = req.body;
        const salt = 'my_salt';
        await client.query('BEGIN');
        // Insertar en PERSONAS
        const queryPersona = `INSERT INTO PERSONAS (ID_Persona, Nombre, Apellido, FechaNacimiento, Telefono, Email, password)
                              VALUES ($1, $2, $3, $4, $5, $6, crypt($7, $8)) RETURNING *`;
        const valuesPersona = [ID_Persona, Nombre, Apellido, FechaNacimiento, Telefono, Email, password, salt];
        const resultPersona = await client.query(queryPersona, valuesPersona);

        // Insertar en EMPLEADOS
        const queryEmpleado = `INSERT INTO EMPLEADOS (ID_Empleado, Cargo, Salario, FechaContratacion)
                              VALUES ($1, $2, $3, $4) RETURNING *`;
        const valuesEmpleado = [ID_Persona, Cargo, Salario, FechaContratacion];
        const resultEmpleado = await client.query(queryEmpleado, valuesEmpleado);

        await client.query('COMMIT');
        res.json({ mensaje: 'registro correcto', persona: resultPersona.rows[0], empleado: resultEmpleado.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error.message);
        res.status(500).send('Error al registrar empleado');
    } finally {
        client.release();
    }
});

// Endpoint para consultar un empleado por ID
app.get('/empleados/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT p.ID_Persona, p.Nombre, p.Apellido, p.FechaNacimiento, p.Telefono, p.Email, 
                    e.ID_Empleado, e.Cargo, e.Salario, e.FechaContratacion 
             FROM PERSONAS p
             JOIN EMPLEADOS e ON p.ID_Persona = e.ID_Empleado
             WHERE p.ID_Persona = $1`,
            [id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ mensaje: 'Empleado no encontrado' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error al consultar el empleado');
    }
});

// Endpoint para modificar un empleado
app.put('/modificar_empleado/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { Nombre, Apellido, FechaNacimiento, Telefono, Email, Cargo, Salario, FechaContratacion } = req.body;
        
        await client.query('BEGIN');
        
        // Primero buscar el empleado
        const busqueda = await client.query(
            `SELECT p.ID_Persona, p.Nombre, p.Apellido, p.FechaNacimiento, p.Telefono, p.Email, 
                    e.ID_Empleado, e.Cargo, e.Salario, e.FechaContratacion 
             FROM PERSONAS p
             JOIN EMPLEADOS e ON p.ID_Persona = e.ID_Empleado
             WHERE p.ID_Persona = $1`,
            [id]
        );
        if (busqueda.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ mensaje: 'Empleado no encontrado' });
        }
        
        // Actualizar PERSONAS
        await client.query(
            'UPDATE PERSONAS SET Nombre = $1, Apellido = $2, FechaNacimiento = $3, Telefono = $4, Email = $5 WHERE ID_Persona = $6',
            [Nombre, Apellido, FechaNacimiento, Telefono, Email, id]
        );
        
        // Actualizar EMPLEADOS
        const result = await client.query(
            'UPDATE EMPLEADOS SET Cargo = $1, Salario = $2, FechaContratacion = $3 WHERE ID_Empleado = $4 RETURNING *',
            [Cargo, Salario, FechaContratacion, id]
        );
        
        await client.query('COMMIT');
        res.json({ mensaje: 'Empleado actualizado correctamente', empleado: result.rows[0], empleadoAnterior: busqueda.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error.message);
        res.status(500).send('Error al modificar el empleado');
    } finally {
        client.release();
    }
});

// Endpoint para eliminar un empleado
app.delete('/eliminar_empleado/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        await client.query('BEGIN');
        // Primero buscar el empleado
        const empleadoResult = await client.query('SELECT * FROM EMPLEADOS WHERE ID_Empleado = $1', [id]);
        if (empleadoResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ mensaje: 'Empleado no encontrado' });
        }
        // Eliminar de EMPLEADOS
        const result = await client.query('DELETE FROM EMPLEADOS WHERE ID_Empleado = $1 RETURNING *', [id]);
        // Eliminar de PERSONAS
        const personaResult = await client.query('DELETE FROM PERSONAS WHERE ID_Persona = $1 RETURNING *', [id]);
        await client.query('COMMIT');
        res.json({ mensaje: 'Empleado eliminado correctamente', empleado: result.rows[0], persona: personaResult.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error.message);
        res.status(500).send('Error al eliminar empleado');
    } finally {
        client.release();
    }
});


//Endpoint maquinas
// Endpoint para registrar una máquina
app.post('/registro_maquina', async (req, res) => {
    try {
        const { Nombre, Tipo, UltimoMantenimiento, EstadoOperativo, Imagen } = req.body;
        const query = `INSERT INTO MAQUINAS (Nombre, Tipo, UltimoMantenimiento, EstadoOperativo, Imagen)
                       VALUES ($1, $2, $3, $4, $5) RETURNING *`;
        const values = [
            Nombre,
            Tipo,
            UltimoMantenimiento || null,
            EstadoOperativo || 'Operativa',
            Imagen || null
        ];
        const result = await pool.query(query, values);
        res.json({ mensaje: 'Máquina registrada correctamente', maquina: result.rows[0] });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error al registrar la máquina');
    }
});


// Endpoint para consultar todas las máquinas
app.get('/maquinas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM MAQUINAS ORDER BY ID_Maquina');
        res.json(result.rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error al consultar las máquinas');
    }
});

// Endpoint para consultar una máquina por ID
app.get('/consultar_maquinas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM MAQUINAS WHERE ID_Maquina = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ mensaje: 'Máquina no encontrada' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error al consultar la máquina');
    }
});

// Endpoint para modificar el estado de una máquina
app.put('/modificar_estado_maquina/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { EstadoOperativo } = req.body;
        // Primero buscar la máquina
        const busqueda = await pool.query('SELECT * FROM MAQUINAS WHERE ID_Maquina = $1', [id]);
        if (busqueda.rowCount === 0) {
            return res.status(404).json({ mensaje: 'Máquina no encontrada' });
        }
        // Si se encuentra, modificar su estado
        const result = await pool.query('UPDATE MAQUINAS SET EstadoOperativo = $1 WHERE ID_Maquina = $2 RETURNING *', [EstadoOperativo, id]);
        res.json({ mensaje: 'Estado de la máquina actualizado correctamente', maquina: result.rows[0], maquinaAnterior: busqueda.rows[0] });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error al modificar el estado de la máquina');
    }
});

// Endpoint para eliminar una máquina
app.delete('/eliminar_maquina/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Primero buscar la máquina
        const busqueda = await pool.query('SELECT * FROM MAQUINAS WHERE ID_Maquina = $1', [id]);
        if (busqueda.rowCount === 0) {
            return res.status(404).json({ mensaje: 'Máquina no encontrada' });
        }
        // Si se encuentra, eliminarla
        const result = await pool.query('DELETE FROM MAQUINAS WHERE ID_Maquina = $1 RETURNING *', [id]);
        res.json({ mensaje: 'Máquina eliminada correctamente', maquina: result.rows[0] });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error al eliminar la máquina');
    }
});

// Endpoint para reservar una máquina
app.post('/reservar_maquina', async (req, res) => {
    const client = await pool.connect();
    try {
        const { ID_Socio, ID_Maquina, FechaReserva, HoraInicio, HoraFin } = req.body;
        
        await client.query('BEGIN');
        
        // Verificar que el socio existe y está activo
        const socioResult = await client.query(
            'SELECT s.ID_Socio, s.Estado FROM SOCIOS s WHERE s.ID_Socio = $1',
            [ID_Socio]
        );
        if (socioResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ mensaje: 'Socio no encontrado' });
        }
        if (socioResult.rows[0].estado !== 'Activo') {
            await client.query('ROLLBACK');
            return res.status(403).json({ mensaje: 'El socio no está activo' });
        }
        
        // Verificar que el socio tiene una membresía vigente
        const membresiaResult = await client.query(
            `SELECT m.ID_Membresia FROM MEMBRESIAS m 
             WHERE m.ID_Socio = $1 AND m.FechaInicio <= CURRENT_DATE AND m.FechaFin >= CURRENT_DATE`,
            [ID_Socio]
        );
        if (membresiaResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(403).json({ mensaje: 'El socio no tiene una membresía vigente' });
        }
        
        // Verificar que la máquina existe y está operativa
        const maquinaResult = await client.query(
            'SELECT * FROM MAQUINAS WHERE ID_Maquina = $1',
            [ID_Maquina]
        );
        if (maquinaResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ mensaje: 'Máquina no encontrada' });
        }
        if (maquinaResult.rows[0].estadooperativo !== 'Operativa') {
            await client.query('ROLLBACK');
            return res.status(400).json({ mensaje: 'La máquina no está operativa' });
        }
        
        // Verificar que no existe conflicto de horario
        const conflictoResult = await client.query(
            `SELECT * FROM RESERVAS_MAQUINAS 
             WHERE ID_Maquina = $1 AND FechaReserva = $2 AND HoraInicio = $3`,
            [ID_Maquina, FechaReserva, HoraInicio]
        );
        if (conflictoResult.rowCount > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ mensaje: 'La máquina ya está reservada en esa fecha y hora' });
        }
        
        // Crear la reserva
        const query = `INSERT INTO RESERVAS_MAQUINAS (ID_Socio, ID_Maquina, FechaReserva, HoraInicio, HoraFin)
                       VALUES ($1, $2, $3, $4, $5) RETURNING *`;
        const values = [ID_Socio, ID_Maquina, FechaReserva, HoraInicio, HoraFin];
        const result = await client.query(query, values);
        
        await client.query('COMMIT');
        res.json({ 
            mensaje: 'Reserva registrada correctamente', 
            reserva: result.rows[0],
            maquina: maquinaResult.rows[0].nombre
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error.message);
        res.status(500).send('Error al registrar la reserva');
    } finally {
        client.release();
    }
});

// Endpoint para consultar todas las reservas
app.get('/reservas_maquinas', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT r.ID_Reserva, r.ID_Socio, p.Nombre, p.Apellido, m.Nombre as NombreMaquina, 
                    r.FechaReserva, r.HoraInicio, r.HoraFin
             FROM RESERVAS_MAQUINAS r
             JOIN SOCIOS s ON r.ID_Socio = s.ID_Socio
             JOIN PERSONAS p ON s.ID_Socio = p.ID_Persona
             JOIN MAQUINAS m ON r.ID_Maquina = m.ID_Maquina
             ORDER BY r.FechaReserva, r.HoraInicio`
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error al consultar las reservas');
    }
});

// Endpoint para consultar reservas de un socio
app.get('/reservas_socio/:id_socio', async (req, res) => {
    try {
        const { id_socio } = req.params;
        const result = await pool.query(
            `SELECT r.ID_Reserva, r.ID_Socio, p.Nombre, p.Apellido, m.Nombre as NombreMaquina,
                    r.FechaReserva, r.HoraInicio, r.HoraFin
             FROM RESERVAS_MAQUINAS r
             JOIN SOCIOS s ON r.ID_Socio = s.ID_Socio
             JOIN PERSONAS p ON s.ID_Socio = p.ID_Persona
             JOIN MAQUINAS m ON r.ID_Maquina = m.ID_Maquina
             WHERE r.ID_Socio = $1
             ORDER BY r.FechaReserva DESC`,
            [id_socio]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ mensaje: 'No hay reservas para este socio' });
        }
        res.json(result.rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error al consultar las reservas del socio');
    }
});

// Endpoint para cancelar una reserva
app.delete('/cancelar_reserva/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        
        await client.query('BEGIN');
        
        // Verificar que la reserva existe
        const reservaResult = await client.query(
            'SELECT * FROM RESERVAS_MAQUINAS WHERE ID_Reserva = $1',
            [id]
        );
        if (reservaResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ mensaje: 'Reserva no encontrada' });
        }
        
        // Cancelar la reserva
        const result = await client.query(
            'DELETE FROM RESERVAS_MAQUINAS WHERE ID_Reserva = $1 RETURNING *',
            [id]
        );
        
        await client.query('COMMIT');
        res.json({ mensaje: 'Reserva cancelada correctamente', reserva: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error.message);
        res.status(500).send('Error al cancelar la reserva');
    } finally {
        client.release();
    }
});


//Endpoint pagos

// Endpoint para registrar un pago
app.post('/registrar_pago', async (req, res) => {
    const client = await pool.connect();
    try {
        const { ID_Membresia, MontoPagado, MetodoPago } = req.body;
        
        await client.query('BEGIN');
        
        // Verificar que la membresía existe
        const membresiaResult = await client.query(
            'SELECT * FROM MEMBRESIAS WHERE ID_Membresia = $1',
            [ID_Membresia]
        );
        if (membresiaResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ mensaje: 'Membresía no encontrada' });
        }
        
        // Validar monto
        if (!MontoPagado || MontoPagado <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ mensaje: 'El monto debe ser mayor a 0' });
        }
        
        // Registrar el pago
        const query = `INSERT INTO PAGOS (ID_Membresia, MontoPagado, MetodoPago, Estado)
                       VALUES ($1, $2, $3, 'Completado') RETURNING *`;
        const values = [ID_Membresia, MontoPagado, MetodoPago];
        const result = await client.query(query, values);
        
        await client.query('COMMIT');
        res.json({ mensaje: 'Pago registrado correctamente', pago: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error.message);
        res.status(500).send('Error al registrar el pago');
    } finally {
        client.release();
    }
});

// Endpoint para obtener todos los pagos con detalles
app.get('/pagos', async (req, res) => {
    try {
        const query = `SELECT 
                        p.ID_Pago, 
                        p.ID_Membresia, 
                        p.MontoPagado, 
                        p.FechaPago, 
                        p.MetodoPago, 
                        p.Estado,
                        pe.Nombre,
                        pe.Apellido,
                        pe.Email,
                        pm.NombrePlan,
                        pm.Precio
                       FROM PAGOS p
                       JOIN MEMBRESIAS m ON p.ID_Membresia = m.ID_Membresia
                       JOIN PERSONAS pe ON m.ID_Socio = pe.ID_Persona
                       JOIN PLANES_MEMBRESIA pm ON m.ID_Plan = pm.ID_Plan
                       ORDER BY p.FechaPago DESC`;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error al consultar los pagos');
    }
});

// Endpoint para obtener un pago específico por ID
app.get('/pagos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const query = `SELECT 
                        p.ID_Pago, 
                        p.ID_Membresia, 
                        p.MontoPagado, 
                        p.FechaPago, 
                        p.MetodoPago, 
                        p.Estado,
                        pe.Nombre,
                        pe.Apellido,
                        pe.Email,
                        pm.NombrePlan,
                        pm.Precio
                       FROM PAGOS p
                       JOIN MEMBRESIAS m ON p.ID_Membresia = m.ID_Membresia
                       JOIN PERSONAS pe ON m.ID_Socio = pe.ID_Persona
                       JOIN PLANES_MEMBRESIA pm ON m.ID_Plan = pm.ID_Plan
                       WHERE p.ID_Pago = $1`;
        const result = await pool.query(query, [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ mensaje: 'Pago no encontrado' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error al consultar el pago');
    }
});

// Endpoint para obtener pagos por membresía
app.get('/pagos_membresia/:id_membresia', async (req, res) => {
    try {
        const { id_membresia } = req.params;
        const query = `SELECT 
                        p.ID_Pago, 
                        p.ID_Membresia, 
                        p.MontoPagado, 
                        p.FechaPago, 
                        p.MetodoPago, 
                        p.Estado,
                        pe.Nombre,
                        pe.Apellido,
                        pe.Email,
                        pm.NombrePlan,
                        pm.Precio
                       FROM PAGOS p
                       JOIN MEMBRESIAS m ON p.ID_Membresia = m.ID_Membresia
                       JOIN PERSONAS pe ON m.ID_Socio = pe.ID_Persona
                       JOIN PLANES_MEMBRESIA pm ON m.ID_Plan = pm.ID_Plan
                       WHERE p.ID_Membresia = $1
                       ORDER BY p.FechaPago DESC`;
        const result = await pool.query(query, [id_membresia]);
        res.json(result.rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error al consultar los pagos');
    }
});

// Endpoint para obtener pagos por socio
app.get('/pagos_socio/:id_socio', async (req, res) => {
    try {
        const { id_socio } = req.params;
        const query = `SELECT 
                        p.ID_Pago, 
                        p.ID_Membresia, 
                        p.MontoPagado, 
                        p.FechaPago, 
                        p.MetodoPago, 
                        p.Estado,
                        pe.Nombre,
                        pe.Apellido,
                        pe.Email,
                        pm.NombrePlan,
                        pm.Precio
                       FROM PAGOS p
                       JOIN MEMBRESIAS m ON p.ID_Membresia = m.ID_Membresia
                       JOIN PERSONAS pe ON m.ID_Socio = pe.ID_Persona
                       JOIN PLANES_MEMBRESIA pm ON m.ID_Plan = pm.ID_Plan
                       WHERE m.ID_Socio = $1
                       ORDER BY p.FechaPago DESC`;
        const result = await pool.query(query, [id_socio]);
        res.json(result.rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error al consultar los pagos');
    }
});

//Endpoint para membresías

// Endpoint para registrar un plan de membresía
app.post('/registro_plan_membresia', async (req, res) => {
    try {
        const { NombrePlan, DuracionDias, Precio } = req.body;
        const query = `INSERT INTO PLANES_MEMBRESIA (NombrePlan, DuracionDias, Precio)
                       VALUES ($1, $2, $3) RETURNING *`;
        const values = [NombrePlan, DuracionDias, Precio];
        const result = await pool.query(query, values);
        res.json({ mensaje: 'Plan de membresía registrado correctamente', plan: result.rows[0] });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error al registrar el plan de membresía');
    }
});

// Endpoint para consultar todos los planes de membresía
app.get('/planes_membresia', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM PLANES_MEMBRESIA ORDER BY ID_Plan');
        res.json(result.rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error al consultar los planes');
    }
});

// Endpoint para consultar un plan de membresía por ID
app.get('/planes_membresia/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM PLANES_MEMBRESIA WHERE ID_Plan = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ mensaje: 'Plan no encontrado' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error al consultar el plan');
    }
});

// Endpoint para modificar un plan de membresía
app.put('/modificar_plan_membresia/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { NombrePlan, DuracionDias, Precio } = req.body;
        
        // Primero buscar el plan
        const busqueda = await pool.query('SELECT * FROM PLANES_MEMBRESIA WHERE ID_Plan = $1', [id]);
        if (busqueda.rowCount === 0) {
            return res.status(404).json({ mensaje: 'Plan no encontrado' });
        }
        
        // Actualizar el plan
        const result = await pool.query(
            'UPDATE PLANES_MEMBRESIA SET NombrePlan = $1, DuracionDias = $2, Precio = $3 WHERE ID_Plan = $4 RETURNING *',
            [NombrePlan, DuracionDias, Precio, id]
        );
        res.json({ mensaje: 'Plan actualizado correctamente', plan: result.rows[0], planAnterior: busqueda.rows[0] });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error al modificar el plan');
    }
});

// Endpoint para eliminar un plan de membresía
app.delete('/eliminar_plan_membresia/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Primero buscar el plan
        const busqueda = await pool.query('SELECT * FROM PLANES_MEMBRESIA WHERE ID_Plan = $1', [id]);
        if (busqueda.rowCount === 0) {
            return res.status(404).json({ mensaje: 'Plan no encontrado' });
        }
        
        // Verificar si el plan tiene membresías asociadas
        const membresias = await pool.query('SELECT COUNT(*) FROM MEMBRESIAS WHERE ID_Plan = $1', [id]);
        if (parseInt(membresias.rows[0].count) > 0) {
            return res.status(400).json({ mensaje: 'No se puede eliminar el plan porque tiene membresías asociadas' });
        }
        
        // Eliminar el plan
        const result = await pool.query('DELETE FROM PLANES_MEMBRESIA WHERE ID_Plan = $1 RETURNING *', [id]);
        res.json({ mensaje: 'Plan eliminado correctamente', plan: result.rows[0] });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error al eliminar el plan');
    }
});

// Endpoint para registrar una membresía para un socio
app.post('/registro_membresia', async (req, res) => {
    const client = await pool.connect();
    try {
        const { ID_Socio, ID_Plan, FechaInicio, FechaFin } = req.body;
        
        await client.query('BEGIN');
        
        // Verificar que el socio existe
        const socioResult = await client.query('SELECT * FROM SOCIOS WHERE ID_Socio = $1', [ID_Socio]);
        if (socioResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ mensaje: 'Socio no encontrado' });
        }
        
        // Verificar que el plan existe
        const planResult = await client.query('SELECT * FROM PLANES_MEMBRESIA WHERE ID_Plan = $1', [ID_Plan]);
        if (planResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ mensaje: 'Plan no encontrado' });
        }
        
        // Insertar la membresía
        const query = `INSERT INTO MEMBRESIAS (ID_Socio, ID_Plan, FechaInicio, FechaFin)
                       VALUES ($1, $2, $3, $4) RETURNING *`;
        const values = [ID_Socio, ID_Plan, FechaInicio, FechaFin];
        const result = await client.query(query, values);
        
        await client.query('COMMIT');
        res.json({ mensaje: 'Membresía registrada correctamente', membresia: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error.message);
        res.status(500).send('Error al registrar la membresía');
    } finally {
        client.release();
    }
});

// Endpoint para consultar todas las membresías
app.get('/membresias', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT m.ID_Membresia, m.ID_Socio, p.Nombre, p.Apellido, pm.NombrePlan, pm.Precio, 
                    m.FechaInicio, m.FechaFin
             FROM MEMBRESIAS m
             JOIN SOCIOS s ON m.ID_Socio = s.ID_Socio
             JOIN PERSONAS p ON s.ID_Socio = p.ID_Persona
             JOIN PLANES_MEMBRESIA pm ON m.ID_Plan = pm.ID_Plan
             ORDER BY m.ID_Membresia`
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error al consultar las membresías');
    }
});

// Endpoint para consultar una membresía por ID
app.get('/membresias/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `SELECT m.ID_Membresia, m.ID_Socio, p.Nombre, p.Apellido, pm.NombrePlan, pm.Precio, pm.DuracionDias,
                    m.FechaInicio, m.FechaFin
             FROM MEMBRESIAS m
             JOIN SOCIOS s ON m.ID_Socio = s.ID_Socio
             JOIN PERSONAS p ON s.ID_Socio = p.ID_Persona
             JOIN PLANES_MEMBRESIA pm ON m.ID_Plan = pm.ID_Plan
             WHERE m.ID_Membresia = $1`,
            [id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ mensaje: 'Membresía no encontrada' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error al consultar la membresía');
    }
});

// Endpoint para consultar membresías de un socio
app.get('/membresias_socio/:id_socio', async (req, res) => {
    try {
        const { id_socio } = req.params;
        const result = await pool.query(
            `SELECT m.ID_Membresia, m.ID_Socio, p.Nombre, p.Apellido, pm.NombrePlan, pm.Precio,
                    m.FechaInicio, m.FechaFin
             FROM MEMBRESIAS m
             JOIN SOCIOS s ON m.ID_Socio = s.ID_Socio
             JOIN PERSONAS p ON s.ID_Socio = p.ID_Persona
             JOIN PLANES_MEMBRESIA pm ON m.ID_Plan = pm.ID_Plan
             WHERE m.ID_Socio = $1
             ORDER BY m.FechaInicio DESC`,
            [id_socio]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ mensaje: 'No hay membresías para este socio' });
        }
        res.json(result.rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error al consultar las membresías del socio');
    }
});

// Endpoint para modificar una membresía
app.put('/modificar_membresia/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { ID_Socio, ID_Plan, FechaInicio, FechaFin } = req.body;
        
        await client.query('BEGIN');
        
        // Verificar que la membresía existe
        const busqueda = await client.query('SELECT * FROM MEMBRESIAS WHERE ID_Membresia = $1', [id]);
        if (busqueda.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ mensaje: 'Membresía no encontrada' });
        }
        
        // Verificar que el plan existe
        const planResult = await client.query('SELECT * FROM PLANES_MEMBRESIA WHERE ID_Plan = $1', [ID_Plan]);
        if (planResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ mensaje: 'Plan no encontrado' });
        }
        
        // Actualizar la membresía
        const result = await client.query(
            'UPDATE MEMBRESIAS SET ID_Socio = $1, ID_Plan = $2, FechaInicio = $3, FechaFin = $4 WHERE ID_Membresia = $5 RETURNING *',
            [ID_Socio, ID_Plan, FechaInicio, FechaFin, id]
        );
        
        await client.query('COMMIT');
        res.json({ mensaje: 'Membresía actualizada correctamente', membresia: result.rows[0], membresiaAnterior: busqueda.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error.message);
        res.status(500).send('Error al modificar la membresía');
    } finally {
        client.release();
    }
});

// Endpoint para eliminar una membresía
app.delete('/eliminar_membresia/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        
        await client.query('BEGIN');
        
        // Verificar que la membresía existe
        const membresiaResult = await client.query('SELECT * FROM MEMBRESIAS WHERE ID_Membresia = $1', [id]);
        if (membresiaResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ mensaje: 'Membresía no encontrada' });
        }
        
        // Verificar si hay pagos asociados
        const pagosResult = await client.query('SELECT COUNT(*) FROM PAGOS WHERE ID_Membresia = $1', [id]);
        if (parseInt(pagosResult.rows[0].count) > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ mensaje: 'No se puede eliminar la membresía porque tiene pagos asociados' });
        }
        
        // Eliminar la membresía
        const result = await client.query('DELETE FROM MEMBRESIAS WHERE ID_Membresia = $1 RETURNING *', [id]);
        
        await client.query('COMMIT');
        res.json({ mensaje: 'Membresía eliminada correctamente', membresia: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error.message);
        res.status(500).send('Error al eliminar la membresía');
    } finally {
        client.release();
    }
});






const opcionesSSL = {
    key: fs.readFileSync('./certificados/key.pem'),
    cert: fs.readFileSync('./certificados/cert.pem')
};

https.createServer(opcionesSSL, app).listen(puerto, '0.0.0.0', () => {
    console.log('Servidor HTTPS corriendo en el puerto ' + puerto + ' (todas las interfaces)');
});