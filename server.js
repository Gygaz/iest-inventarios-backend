const http = require('http');
const fs = require('fs');
const url = require('url');
const express = require('express');
const multer = require('multer');
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

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Carpeta donde se guardarán los archivos
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Nombre único para los archivos
  },
});

// File filter to allow only images and pdfs
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido'), false);
  }
};

const upload = multer({ storage, fileFilter });

// Servir archivos estáticos desde la carpeta 'uploads'
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.post('/upload', upload.single('archivo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ningún archivo' });
  }

  const relativePath = `uploads/${req.file.filename}`;
  const fileUrl = `http://localhost:3001/${relativePath}`;

  res.json({ message: 'Archivo subido correctamente', path: fileUrl });
});

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
      "SELECT * FROM articulos WHERE area = $1", [area]
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

// Endpoint para agregar artículo
app.post('/addItem', upload.fields([  // Configura multer para recibir múltiples archivos
  { name: 'ruta_img', maxCount: 1 },
  { name: 'ruta_pdf_instructivo', maxCount: 1 },
  { name: 'ruta_img_instructivo', maxCount: 1 },
  { name: 'ruta_pdf_seguridad', maxCount: 1 },
  { name: 'ruta_img_seguridad', maxCount: 1 }
]), async (req, res) => {
  // Desestructuración de los datos recibidos en el formulario
  const { area, nombre, cant, capRecipiente } = req.body;

  // Recuperación de las rutas de los archivos subidos
  const ruta_img = req.files.ruta_img ? req.files.ruta_img[0].path.replace(/\\/g, '/') : null;
  const ruta_pdf_instructivo = req.files.ruta_pdf_instructivo ? req.files.ruta_pdf_instructivo[0].path.replace(/\\/g, '/') : null;
  const ruta_img_instructivo = req.files.ruta_img_instructivo?.[0]?.path.replace(/\\/g, '/') || null;
  const ruta_pdf_seguridad = req.files.ruta_pdf_seguridad ? req.files.ruta_pdf_seguridad[0].path.replace(/\\/g, '/') : null;
  const ruta_img_seguridad = req.files.ruta_img_seguridad?.[0]?.path.replace(/\\/g, '/') || null;
  let cant_vol =  cant * capRecipiente;
  

  try {
    const result = await pool.query(
      `INSERT INTO articulos 
        (area, nombre, cant, cant_vol, ruta_img, ruta_pdf_instructivo, ruta_img_instructivo, ruta_pdf_seguridad, ruta_img_seguridad)
       VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        area,
        nombre,
        cant,
        cant_vol,
        ruta_img,
        ruta_pdf_instructivo,
        ruta_img_instructivo,
        ruta_pdf_seguridad,
        ruta_img_seguridad
      ]
    );

    console.log("Artículo agregado exitosamente:", result.rows[0]);
    res.status(201).json({ message: 'Artículo agregado exitosamente', articulo: result.rows[0] });
  } catch (error) {
    console.error("Error al agregar artículo:", error);
    res.status(500).json({ message: 'Error al agregar artículo', error: error.message });
  }
});

app.post('/upload-thumbnail', upload.single('thumbnail'), (req, res) => {
  console.log('Stored thumbnail at:', req.file.path);
  res.json({ path: req.file.path.replace(/\\/g, '/') });
});

app.post('/upload-pdf', upload.single('pdf'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({ path: `uploads/${req.file.filename}` });
});

app.post('/deleteItems', async (req, res) => {
  const { ids } = req.body;

  try{
    for(var i = 0; i < ids.length; i++){
      await pool.query(
        "DELETE FROM articulos WHERE id = $1", [ids[i]]
      );
    res.status(201).json({ message: 'Artículos borrados exitosamente'});
    }
  } catch (error) {
    console.error("Error al borrar articulos", error);
    res.status(500).json({ error: "Error deleting data from database"});
  }
});

app.get('/contarArticulos', async(req, res) => {
  try {
    const nServiciosGenerales = await pool.query("SELECT COUNT(*) FROM articulos WHERE area = 'serviciosGenerales'");
    const nMedicina = await pool.query("SELECT COUNT(*) FROM articulos WHERE area = 'medicina'");
    const nGastronomia = await pool.query("SELECT COUNT(*) FROM articulos WHERE area = 'gastronomia'");
    const nCafeteria = await pool.query("SELECT COUNT(*) FROM articulos WHERE area = 'cafeteria'");
    const nTotal = await pool.query("SELECT COUNT(*) FROM articulos");

    res.json({
      serviciosGenerales: nServiciosGenerales.rows[0].count,
      medicina: nMedicina.rows[0].count,
      gastronomia: nGastronomia.rows[0].count,
      cafeteria: nCafeteria.rows[0].count,
      total: nTotal.rows[0].count
    });
  } catch (error) {
    console.error('Error fetching counts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
