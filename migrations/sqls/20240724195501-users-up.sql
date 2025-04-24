/* Replace with your SQL commands */
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  password TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'normal' CHECK (tipo = 'admin' OR tipo = 'normal')
);

