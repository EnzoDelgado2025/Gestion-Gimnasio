const axios = require('axios');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testRegistroPersona() {
  try {
    const response = await axios.post('https://localhost:3000/registro_persona', {
      ID_Persona: '9999999999',
      Nombre: 'Prueba',
      Apellido: 'Test',
      FechaNacimiento: '2000-01-01',
      Telefono: '0999999999',
      Email: 'prueba.test@email.com',
      password: 'miclave123'
    });
    console.log('Respuesta:', response.data);
  } catch (error) {
    if (error.response) {
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testRegistroPersona();
