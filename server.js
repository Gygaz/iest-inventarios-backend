const http = require('http');
const fs = require('fs');
const url = require('url');
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const bodyParser = require('body-parser');
require('dotenv').config();
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const port = 3001;

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());

const pool = new Pool({
  host: 'localhost',
  database: 'iestinventarios',
  user: 'postgres',
  password: 'mundo131626%',
  max: 5,
  connectionTimeoutMillis: 20000
});

app.use(session({
  secret: 'placeholdersecret',
  resave: false,
  saveUninitialized: true,
  store: new pgSession({
    pool: pool,
    createTableIfMissing: true
  })
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Endpoint de Login
app.post('/login', async (req, res) => {
  const { idInput, passwordInput } = req.body;
  console.log('Intento de login recibido:', { idInput });

  try {
    // Verificar si el usuario existe
    const userExists = await pool.query(
      'SELECT * FROM usuarios WHERE id = $1', 
      [idInput]
    );
    
    if (userExists.rows.length === 0) {
      console.log('Usuario no encontrado:', idInput);
      return res.status(401).json({ message: 'ID o contraseña incorrectos' });
    }

    const user = userExists.rows[0];
    console.log('Usuario encontrado:', user);

    // Verificar contraseña
    const validPassword = await bcrypt.compare(passwordInput, user.password);
    console.log('Resultado comparación contraseña:', validPassword);

    if (!validPassword) {
      console.log('Contraseña incorrecta para usuario:', idInput);
      return res.status(401).json({ message: 'ID o contraseña incorrectos' });
    }

    // Configurar sesión
    req.session.user = {
      userId: user.id,
      userType: user.tipo,
    };
    req.session.isAuth = true;

    console.log('Sesión creada para usuario:', user.id);
    res.status(200).json({ 
      redirectTo: '/home',
      message: '¡Bienvenido!' 
    });

  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Endpoint de Logout
app.post('/logout', (req, res) => {
  console.log('Intento de logout');
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destruyendo sesión:', err);
      return res.status(500).json({ message: 'Error al cerrar sesión' });
    }
    res.clearCookie('connect.sid');
    console.log('Sesión cerrada exitosamente');
    res.status(200).json({ message: 'Sesión cerrada' });
  });
});

// Endpoint de Información de Usuario
app.get('/user-info', (req, res) => {
  console.log('Solicitud de información de usuario');
  if (req.session.user) {
    console.log('Usuario autenticado:', req.session.user);
    res.json({ 
      userType: req.session.user.userType, 
      userId: req.session.user.userId 
    });
  } else {
    console.log('Usuario no autenticado');
    res.status(401).json({ message: 'No autenticado' });
  }
});

// Endpoint de Registro
app.post('/register', async (req, res) => {
  const { id, tipo, password } = req.body;
  console.log('Datos de registro recibidos:', { id, tipo });

  try {
    // Verificar si el usuario ya existe
    const userExists = await pool.query(
      'SELECT id FROM usuarios WHERE id = $1', 
      [id]
    );

    if (userExists.rows.length > 0) {
      console.log('ID ya registrado:', id);
      return res.status(409).json({ message: 'El ID ya está registrado' });
    }

    // Crear nuevo usuario
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO usuarios (id, tipo, password) VALUES ($1, $2, $3)',
      [id, tipo, hashedPassword]
    );

    console.log('Usuario registrado exitosamente:', id);
    res.status(201).json({ message: 'Registro exitoso' });

  } catch (err) {
    console.error('Error en registro:', err);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

app.get('/cargarInventario', async(req,res) => {
  console.log("Se recibio request para cargar inventario");
  const {area} = req.query;
  console.log("Area del request: ", area);

  try{
    let articulosArea = await pool.query(
      "SELECT id, ruta_img, nombre, cant, ruta_pdf_instructivo, ruta_pdf_seguridad FROM articulos WHERE area = $1", [area]
    );
    console.log("Resultado: ", articulosArea.rows)
    res.json(articulosArea.rows);
  } catch (error) {
    console.error("Error en el fetch de articulos: ", error);
    res.status(500).json({ error: "Error fetching data from database"});
  }
})

app.post('/updateChanges', async(req, res) => {
  const {rowIndex, colName, newValue} = req.body;
  console.log("Recieved data for file source update: ", rowIndex, colName, newValue);

  try{
    const result = await pool.query(`UPDATE articulos SET ${colName} = $1 WHERE id = $2`, [newValue, rowIndex])

    if (result.rowCount > 0) {
      console.log("Update successful");
      res.status(200).json({ status: 'success', message: 'Data updated successfully' });
    } else {
      // If no rows were updated, notify the client
      res.status(404).json({ status: 'error', message: 'No matching record found to update' });
    }
  } catch (err) {
    console.error('Error updating data:', err);
    res.status(500).json({ status: 'error', message: 'Error updating data', error: err.message });
  }

});


process.on('uncaughtException', function (err) {
  console.log('Excepción no capturada:', err);
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
