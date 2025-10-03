const express = require('express');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const app = express();
const puerto= 3000;
const pool = require('./db');

app.use(express.json());
app.use(cors());

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
        const query = `SELECT ID_Persona, Nombre, Apellido, Email FROM PERSONAS WHERE ID_Persona = $1 AND password = crypt($2, $3)`;
        const values = [ID_Persona, password, salt];
        const result = await pool.query(query, values);
        if (result.rowCount === 0) {
             return res.status(401).json({ mensaje: 'Credenciales inválidas' });
            
        }
        res.json({ mensaje: 'Login exitoso', persona: result.rows[0] });
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
        const result = await pool.query('UPDATE SOCIOS SET Estado = $1 WHERE ID_Socio = $2 RETURNING *', [Estado, id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ mensaje: 'Socio no encontrado' });
        }
        res.json({ mensaje: 'Estado del socio actualizado', socio: result.rows[0] });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error al modificar el estado del socio');
    }
});
// Endpoint para eliminar un socio por ID_Socio
app.delete('/eliminar_socio/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM SOCIOS WHERE ID_Socio = $1 RETURNING *', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ mensaje: 'Socio no encontrado' });
        }
        res.json({ mensaje: 'Socio eliminado correctamente', socio: result.rows[0] });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Error al eliminar socio');
    }
});








const opcionesSSL = {
    key: fs.readFileSync('./certificados/key.pem'),
    cert: fs.readFileSync('./certificados/cert.pem')
};

https.createServer(opcionesSSL, app).listen(puerto, () => {
    console.log('Servidor HTTPS corriendo en el puerto ' + puerto);
});