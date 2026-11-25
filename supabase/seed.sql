-- The initial coordinator is provisioned through the ADR-02 account flow.
INSERT INTO public.configuracion (unica, margen_ubicacion_m)
VALUES (true, 200)
ON CONFLICT DO NOTHING;

INSERT INTO public.provincias (nombre)
VALUES ('Pichincha')
ON CONFLICT DO NOTHING;

INSERT INTO public.cantones (provincia_id, nombre)
SELECT p.id, 'Quito'
FROM public.provincias AS p
WHERE p.nombre = 'Pichincha'
ON CONFLICT DO NOTHING;

INSERT INTO public.parroquias (provincia_id, canton_id, nombre)
SELECT p.id, c.id, parroquia.nombre
FROM public.provincias AS p
JOIN public.cantones AS c
  ON c.provincia_id = p.id
CROSS JOIN (
  VALUES
    ('Iñaquito'),
    ('Quitumbe'),
    ('La Magdalena'),
    ('Calderón'),
    ('Tumbaco'),
    ('Pifo')
) AS parroquia(nombre)
WHERE p.nombre = 'Pichincha'
  AND c.nombre = 'Quito'
ON CONFLICT DO NOTHING;

INSERT INTO public.recintos (
  provincia_id,
  canton_id,
  parroquia_id,
  nombre,
  latitud,
  longitud,
  coordinador_id
)
SELECT p.id,
       c.id,
       pa.id,
       recinto.nombre,
       recinto.latitud,
       recinto.longitud,
       NULL::uuid
FROM (
  VALUES
    (
      'Iñaquito',
      'Colegio La Condamine',
      -0.17261842559297133::double precision,
      -78.4829615893297::double precision
    ),
    (
      'Iñaquito',
      'Unidad Educativa Fiscal República de Bolivia',
      -0.18291876659431192::double precision,
      -78.48831391999724::double precision
    ),
    (
      'Quitumbe',
      'Unidad Educativa Municipal Quitumbe',
      -0.28092058299361927::double precision,
      -78.54875903535986::double precision
    ),
    (
      'Quitumbe',
      'U.E. Aurelio Bayas',
      -0.29650345455062216::double precision,
      -78.53182313350888::double precision
    ),
    (
      'La Magdalena',
      'Colegio Amazonas',
      -0.24557049627022853::double precision,
      -78.5267646200163::double precision
    ),
    (
      'La Magdalena',
      'Unidad Educativa Particular Fernández Salvador Villavicencio Ponce',
      -0.2432486595075582::double precision,
      -78.51896865060093::double precision
    ),
    (
      'Calderón',
      'Unidad Educativa Nicolás Jiménez',
      -0.08342352204887239::double precision,
      -78.42269598997954::double precision
    ),
    (
      'Calderón',
      'Unidad Educativa Luxemburgo',
      -0.09444252347955778::double precision,
      -78.45143258933005::double precision
    ),
    (
      'Tumbaco',
      'Unidad Educativa Tumbaco',
      -0.22461233844658068::double precision,
      -78.37609062001694::double precision
    ),
    (
      'Tumbaco',
      'Escuela Roberto Espinoza',
      -0.2113119957674417::double precision,
      -78.40451540652408::double precision
    ),
    (
      'Pifo',
      'C.F. Eduardo Salazar Gómez',
      -0.22732224972003667::double precision,
      -78.34325005070353::double precision
    ),
    (
      'Pifo',
      'Institución Educativa Fiscal Ricardo Rodríguez',
      -0.2245982397192964::double precision,
      -78.33664057583717::double precision
    )
) AS recinto(parroquia, nombre, latitud, longitud)
JOIN public.provincias AS p
  ON p.nombre = 'Pichincha'
JOIN public.cantones AS c
  ON c.provincia_id = p.id
 AND c.nombre = 'Quito'
JOIN public.parroquias AS pa
  ON pa.canton_id = c.id
 AND pa.nombre = recinto.parroquia
ON CONFLICT DO NOTHING;

INSERT INTO public.mesas (recinto_id, numero)
SELECT r.id, numero.numero
FROM public.recintos AS r
JOIN public.cantones AS c
  ON c.id = r.canton_id
 AND c.nombre = 'Quito'
JOIN public.provincias AS p
  ON p.id = c.provincia_id
 AND p.nombre = 'Pichincha'
JOIN public.parroquias AS pa
  ON pa.id = r.parroquia_id
CROSS JOIN (
  VALUES
    ('Iñaquito', 'Colegio La Condamine'),
    ('Iñaquito', 'Unidad Educativa Fiscal República de Bolivia'),
    ('Quitumbe', 'Unidad Educativa Municipal Quitumbe'),
    ('Quitumbe', 'U.E. Aurelio Bayas'),
    ('La Magdalena', 'Colegio Amazonas'),
    (
      'La Magdalena',
      'Unidad Educativa Particular Fernández Salvador Villavicencio Ponce'
    ),
    ('Calderón', 'Unidad Educativa Nicolás Jiménez'),
    ('Calderón', 'Unidad Educativa Luxemburgo'),
    ('Tumbaco', 'Unidad Educativa Tumbaco'),
    ('Tumbaco', 'Escuela Roberto Espinoza'),
    ('Pifo', 'C.F. Eduardo Salazar Gómez'),
    ('Pifo', 'Institución Educativa Fiscal Ricardo Rodríguez')
) AS semilla(parroquia, recinto)
CROSS JOIN (
  VALUES
    (1::smallint),
    (2::smallint),
    (3::smallint)
) AS numero(numero)
WHERE pa.nombre = semilla.parroquia
  AND r.nombre = semilla.recinto
ON CONFLICT DO NOTHING;

INSERT INTO public.organizaciones (sigla, nombre, color_hex, orden)
VALUES
  ('MFC', 'Movimiento Futuro Ciudadano', '#1769AA', 1),
  ('ARP', 'Alianza Renovación Popular', '#169B62', 2),
  ('MUC', 'Movimiento Unidos por el Cambio', '#E87932', 3),
  ('FDP', 'Frente Democrático Progreso', '#8054B8', 4),
  ('MNE', 'Movimiento Nueva Esperanza', '#D84A52', 5)
ON CONFLICT DO NOTHING;

INSERT INTO public.candidatos (organizacion_id, dignidad, nombre)
SELECT organizacion.id, candidato.dignidad, candidato.nombre
FROM (
  VALUES
    ('MFC', 'alcaldia', 'Daniel Andrade'),
    ('MFC', 'prefectura', 'Gabriela Torres'),
    ('ARP', 'alcaldia', 'Valeria Cárdenas'),
    ('ARP', 'prefectura', 'Mauricio Salazar'),
    ('MUC', 'alcaldia', 'Sebastián Molina'),
    ('MUC', 'prefectura', 'Carolina Herrera'),
    ('FDP', 'alcaldia', 'Natalia Espinosa'),
    ('FDP', 'prefectura', 'Andrés Villacís'),
    ('MNE', 'alcaldia', 'Ricardo Paredes'),
    ('MNE', 'prefectura', 'Daniela Morales')
) AS candidato(sigla, dignidad, nombre)
JOIN public.organizaciones AS organizacion
  ON organizacion.sigla = candidato.sigla
ON CONFLICT DO NOTHING;
