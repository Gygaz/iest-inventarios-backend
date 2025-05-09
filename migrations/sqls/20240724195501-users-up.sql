/* Replace with your SQL commands */
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  password TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'normal' CHECK (tipo = 'admin' OR tipo = 'normal')
);

CREATE TABLE articulos (
  id SERIAL PRIMARY KEY,
  ruta_img TEXT,
  nombre TEXT NOT NULL,
  cant NUMERIC NOT NULL,
  cant_vol NUMERIC NOT NULL,
  ruta_pdf_instructivo TEXT,
  ruta_img_instructivo TEXT,
  ruta_pdf_seguridad TEXT,
  ruta_img_seguridad TEXT,
  area TEXT NOT NULL DEFAULT 'serviciosGenerales' CHECK (area = 'serviciosGenerales' OR area = 'medicina ' OR area = 'gastronomia' OR area='cafeteria')
)
