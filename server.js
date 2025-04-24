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
  origin: 'http://localhost:3000',
  credentials: true,
}));

//app.use(express.static(path.join(__dirname,'..','Vitalmed')));

app.use(express.json());

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
    datos = req.body;
    let userInDatabase = await pool.query("SELECT EXISTS (SELECT * FROM usuarios WHERE id=$1)", [datos.id]); //Query que regresa una columna bool dependiendo de la existencia de un renglon con el valor de username en la tabla usuarios

    let user = await pool.query("SELECT * FROM usuarios WHERE id = $1", [datos.id]);
    console.log(user.rows[0].password);
    
    if(userInDatabase.rows[0].exists) {
        hashedPassword = user.rows[0].password;
        const passwordAuth = await bcrypt.compare(datos.password, hashedPassword);
        if (passwordAuth) {
            req.session.user = {
                userId: user.rows[0].id,
                userType: user.rows[0].tipo,
            };
            console.log('Usuario autenticado');
            console.log (user.rows[0].tipo);
            req.session.isAuth = true;
            res.status(200).json({ redirectTo: '/home' });
        }
    } 
    else 
    {
    }
});

app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.status(200).json({ message: 'Logged out' });
    console.log("logged out")
  });
});

app.get('/user-info', (req, res) => {
  if (req.session.user) {
    res.json({ userType: req.session.user.userType, userId: req.session.user.userId });
  } else {
    res.status(401).json({ message: 'Not logged in' });
  }
});

app.post('/register', async(req, res)=> {
    const {id, tipo, password} = req.body;

    console.log('Datos recibidos en el servidor: ', {id, tipo, password})

    const hashedPassword = await bcrypt.hash(password, salt_rounds);


    try{
        await pool.query('INSERT INTO usuarios (id, tipo, password ) VALUES ($1, $2, $3);', [id, tipo, hashedPassword]);
        res.status(200).json({ status: 'success', message: 'Datos subidos correctamente' });
    } catch (err) {
        console.error('Error subiendo los datos:',err);
        res.status(500).json({status: 'error', message: 'Error subiendo los datos', error: err.message});
    }
});

process.on('uncaughtException', function (err) {
    console.log(err);
}); 

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
