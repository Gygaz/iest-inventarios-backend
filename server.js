const http = require('http');
const fs = require('fs');
const url = require('url');
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const bodyParser = require('body-parser');
require ('dotenv').config();
const { Pool }  = require ('pg');
const cors = require('cors');

const bcrypt = require('bcrypt');
const salt_rounds = 10;

const path = require('path');

const app = express();
const port = 3001;

const {
PG_HOST,
PG_DB,
PG_USER,
PG_PASSWORD,
SECRET,
PG_PORT
} = process.env

app.use(cors({
  origin: 'http://localhost:3000', // React app URL
  credentials: true               // if you're using cookies or sessions
}));

app.use(express.static(path.join(__dirname,'..','Vitalmed')));

app.use(express.json());

app.get('/', (req,res) => {
    res.sendFile(path.join(__dirname,'..','Vitalmed','html','index.html'));
})

const pool = new Pool({
    host: 'localhost',
    database: 'iestinventarios',
    user: PG_USER,
    password: PG_PASSWORD,
    max: 5,
    connectionTimeoutMillis: 20000
});

app.use(session({
    secret: 'placeholdersecret',
    resave: false,
    saveUninitialized: true,
    store: new pgSession({
        pool: pool
    })
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

app.post('/login', async(req, res) => {
    const {idInput, passwordInput} = req.body;
    console.log(req.body);
    let userInDatabase = await pool.query("SELECT EXISTS (SELECT * FROM usuarios WHERE id=$1)", [idInput]); //Query que regresa una columna bool dependiendo de la existencia de un renglon con el valor de username en la tabla usuarios

    console.log(userInDatabase);
    let user = await pool.query("SELECT * FROM usuarios WHERE id = $1", [idInput]);
    
    if(userInDatabase.rows[0].exists) {
        hashedPassword = user.rows[0].password;
        const passwordAuth = await bcrypt.compare(passwordInput, hashedPassword);
        if (passwordAuth) {

            req.session.user = {
                userId: user.id,
                userType: user.tipo,
            };

            console.log('Usuario autenticado');
            tipoUsuario = user.rows[0].tipo;
            switch (tipoUsuario){
              case 'normal':
                console.log('Usuario detectado: normal');
                req.session.isAuth = true;
                 res.redirect("../");
                break;
              case 'Secretaria':
                res.redirect("/html/secretaria-perfil.html");
                break;
              case 'Administrador':
                break;
              case 'Encargado de Clinica':
                break;
              default:
                console.log('Error en el tipo de usuario');             
            }
        }
        else {
        }
    } else {
    }
});

app.post('/subir-datos', async(req, res)=> {
    const [nombre, peso, estatura, correo, fecha_nacimiento, fecha_primera_visita, fecha_ultima_visita, telefono_celular, telefono_fijo] = req.body;

    console.log('Datos recibidos en el servidor: ', {nombre, peso, estatura, correo, fecha_nacimiento, fecha_primera_visita, fecha_ultima_visita, telefono_celular, telefono_fijo})

    try{
        const result = await pool.query('INSERT INTO paciente (id, nombre, peso, estatura, correo, fecha_nacimiento, fecha_primera_visita, fecha_ultima_visita, telefono_celular, telefono_fijo) VALUES (DEFAULT, $1, $2, $3, $4, $5, $6, $7, $8, $9)',[nombre, peso, estatura, correo, fecha_nacimiento, fecha_primera_visita, fecha_ultima_visita, telefono_celular, telefono_fijo])
        res.status(200).json({ status: 'success', message: 'Datos subidos correctamente' });
    } catch (err) {
        console.error('Error subiendo los datos:',err);
        res.status(500).json({status: 'error', message: 'Error subiendo los datos', error: err.message});
    }
});

app.post('/subir-datos/RegP', async(req, res)=> {
    const [tipo, username, contrasena, nombre, fecha_nacimiento, correo, telefono_celular, telefono_fijo] = req.body;

    console.log('Datos recibidos en el servidor: ', {username, contrasena, tipo, nombre, fecha_nacimiento, correo, telefono_celular, telefono_fijo})

    const hashedPassword = await bcrypt.hash(contrasena, salt_rounds);

    console.log(hashedPassword);

    try{
        await pool.query('INSERT INTO usuarios (id, tipo, username, password ) VALUES (DEFAULT, $1, $2, $3);',[tipo, username, hashedPassword,]);
        await pool.query('INSERT INTO datos_personales (id_usuario, nombre, fecha_nacimiento, correo_electronico, telefono_celular, telefono_fijo) VALUES (DEFAULT, $1, $2, $3, $4, $5)',[nombre, fecha_nacimiento, correo, telefono_celular, telefono_fijo]);
        res.status(200).json({ status: 'success', message: 'Datos subidos correctamente' });
    } catch (err) {
        console.error('Error subiendo los datos:',err);
        res.status(500).json({status: 'error', message: 'Error subiendo los datos', error: err.message});
    }
});

app.post('/subir-datos/FM-DG', async(req, res)=> {
    const [nombre, peso, estatura, correo, fecha_nacimiento, fecha_primera_visita, telefono_celular, telefono_fijo] = req.body;

    console.log('Datos recibidos en el servidor: ', {nombre, peso, estatura, correo, fecha_nacimiento, fecha_primera_visita, telefono_celular, telefono_fijo})

    try{
        const result = await pool.query('INSERT INTO paciente (id, nombre, peso, estatura, correo, fecha_nacimiento, fecha_primera_visita, telefono_celular, telefono_fijo) VALUES (DEFAULT, $1, $2, $3, $4, $5, $6, $7, $8)',[nombre, peso, estatura, correo, fecha_nacimiento, fecha_primera_visita, telefono_celular, telefono_fijo])
        res.status(200).json({ status: 'success', message: 'Datos subidos correctamente' });
    } catch (err) {
        console.error('Error subiendo los datos:',err);
        res.status(500).json({status: 'error', message: 'Error subiendo los datos', error: err.message});
    }
});

app.post('/subir-datos/FM-Antecedentes', async(req, res)=> {
    const [AHF, APnP, APP, PA] = req.body;

    console.log('Datos recibidos en el servidor: ', {nombre, peso, estatura, correo, fecha_nacimiento, fecha_primera_visita, telefono_celular, telefono_fijo})

    try{
        const result = await pool.query('INSERT INTO paciente (id, nombre, peso, estatura, correo, fecha_nacimiento, fecha_primera_visita, telefono_celular, telefono_fijo) VALUES (DEFAULT, $1, $2, $3, $4, $5, $6, $7, $8)',[nombre, peso, estatura, correo, fecha_nacimiento, fecha_primera_visita, telefono_celular, telefono_fijo])
        res.status(200).json({ status: 'success', message: 'Datos subidos correctamente' });
    } catch (err) {
        console.error('Error subiendo los datos:',err);
        res.status(500).json({status: 'error', message: 'Error subiendo los datos', error: err.message});
    }
});

app.post('/subir-datos/FM-AyD', async(req, res)=> {
    const [fecha, EF, LyG, IDX, PM, Notas] = req.body;
    console.log(req.body);

    console.log('Datos recibidos en el servidor: ', {EF, LyG, IDX, PM, Notas})

    try{
        const result = await pool.query('INSERT INTO ficha_medica (id, id_paciente, id_medico, fecha, exploracion_fisica, laboratorio_gabinete, integracion_diagnostica, plan_medico, notas) VALUES (DEFAULT, DEFAULT, DEFAULT, $1, $2, $3, $4, $5, $6)',[fecha, EF, LyG, IDX, PM, Notas])
        res.status(200).json({ status: 'success', message: 'Datos subidos correctamente' });
    } catch (err) {
        console.error('Error subiendo los datos:',err);
        res.status(500).json({status: 'error', message: 'Error subiendo los datos', error: err.message});
    }
});

app.post('/subir-datos/ficha-medica', async(req, res) => {
    const {nombre, peso, estatura, correo, fecha_nacimiento, fecha_primera_visita, telefono_celular, telefono_fijo, AHF, APnP, APP, PA, fechaFM,EF, LyG, username_medico} = req.body;

    try{
        let id_medico = await pool.query("SELECT EXISTS (SELECT * FROM usuarios WHERE username=$1)", [username_medico]);
        let id_paciente = await pool.query("SELECT EXISTS (SELECT * FROM paciente WHERE nombre=$1)", [nombre]);
        fechaFM = new Date();
        const result = await pool.query('INSERT INTO ficha_medica (id, id_paciente, id_medico, fecha, exploracion_fisica, laboratorio_gabinete, integracion_diagnostica, plan_medico, notas) VALUES (DEFAULT, $1, $2, $3, $4, $5, $6, $7, $8)',[id_paciente, id_medico, fecha, EF, LyG, IDX, PM, Notas])
        res.status(200).json({ status: 'success', message: 'Datos subidos correctamente' });
    } catch (err) {
        console.error('Error subiendo los datos:',err);
        res.status(500).json({status: 'error', message: 'Error subiendo los datos', error: err.message});
    }
})

app.get('/datos/pacientes', async (req,res) => {
    try{
        const query = `
        SELECT * FROM paciente WHERE LOWER (nombre) ILIKE ($1)
    `;
        const nombre = req.query.nombre || '';
        const result = await pool.query(query, [`${nombre}%`]);
        res.json(result.rows);
    } catch(err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.get('/listado/pacientes', async (req, res) => {
    let offsetLista = req.query.offset;
    console.log(offsetLista);
    pacientes = await pool.query('SELECT nombre, fecha_primera_visita, fecha_ultima_visita FROM paciente LIMIT 11 OFFSET $1', [offsetLista]);
    res.json(pacientes.rows);
}) 

app.get('/listado/num-pacientes', async (req, res) => {
    try{
        const result = await pool.query('SELECT COUNT (*) FROM paciente');
        const num_pacientes = result.rows[0].count;
        res.json({num_pacientes: parseInt(num_pacientes)});
    } catch (error) {

    }
}) 

process.on('uncaughtException', function (err) {
    console.log(err);
}); 

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
