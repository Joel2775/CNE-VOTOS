CREATE TABLE public.configuracion (
unica boolean PRIMARY KEY DEFAULT true CHECK (unica),
margen_ubicacion_m integer NOT NULL DEFAULT 200
CHECK (margen_ubicacion_m > 0)
);

INSERT INTO public.configuracion (unica, margen_ubicacion_m)
VALUES (true, 200);

CREATE TABLE public.provincias (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
nombre text NOT NULL UNIQUE CHECK (btrim(nombre) <> '')
);

CREATE TABLE public.cantones (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
provincia_id uuid NOT NULL REFERENCES public.provincias (id),
nombre text NOT NULL CHECK (btrim(nombre) <> ''),
UNIQUE (provincia_id, nombre),
UNIQUE (id, provincia_id)
);

CREATE TABLE public.parroquias (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
provincia_id uuid NOT NULL,
canton_id uuid NOT NULL,
nombre text NOT NULL CHECK (btrim(nombre) <> ''),
UNIQUE (canton_id, nombre),
UNIQUE (id, provincia_id, canton_id),
FOREIGN KEY (canton_id, provincia_id)
REFERENCES public.cantones (id, provincia_id)
);

CREATE TABLE public.perfiles (
id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE RESTRICT,
rol text NOT NULL CHECK (
rol IN ('coordinador_provincial', 'coordinador_recinto', 'veedor')
),
nombres text NOT NULL CHECK (btrim(nombres) <> ''),
apellidos text NOT NULL CHECK (btrim(apellidos) <> ''),
cedula text NOT NULL UNIQUE CHECK (cedula ~ '^[0-9]{10}$'),
correo text NOT NULL UNIQUE CHECK (
correo = lower(btrim(correo)) AND correo <> ''
),
telefono text NOT NULL CHECK (btrim(telefono) <> ''),
provincia_id uuid NOT NULL REFERENCES public.provincias (id),
creado_por uuid,
creado_en timestamptz NOT NULL DEFAULT now(),
CHECK (creado_por IS NOT NULL OR rol = 'coordinador_provincial'),
UNIQUE (id, provincia_id),
UNIQUE (id, rol),
UNIQUE (id, rol, provincia_id),
FOREIGN KEY (creado_por, provincia_id)
REFERENCES public.perfiles (id, provincia_id)
);

CREATE UNIQUE INDEX perfiles_un_coordinador_provincial
ON public.perfiles (rol)
WHERE rol = 'coordinador_provincial';

CREATE TABLE public.recintos (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
provincia_id uuid NOT NULL,
canton_id uuid NOT NULL,
parroquia_id uuid NOT NULL,
nombre text NOT NULL CHECK (btrim(nombre) <> ''),
latitud double precision NOT NULL CHECK (latitud BETWEEN -90 AND 90),
longitud double precision NOT NULL CHECK (longitud BETWEEN -180 AND 180),
coordinador_id uuid UNIQUE,
rol_coordinador text NOT NULL DEFAULT 'coordinador_recinto'
CHECK (rol_coordinador = 'coordinador_recinto'),
creado_en timestamptz NOT NULL DEFAULT now(),
UNIQUE (parroquia_id, nombre),
UNIQUE (id, provincia_id),
FOREIGN KEY (canton_id, provincia_id)
REFERENCES public.cantones (id, provincia_id),
FOREIGN KEY (parroquia_id, provincia_id, canton_id)
REFERENCES public.parroquias (id, provincia_id, canton_id),
FOREIGN KEY (coordinador_id, provincia_id)
REFERENCES public.perfiles (id, provincia_id),
FOREIGN KEY (coordinador_id, rol_coordinador, provincia_id)
REFERENCES public.perfiles (id, rol, provincia_id)
);

CREATE TABLE public.mesas (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
recinto_id uuid NOT NULL REFERENCES public.recintos (id),
numero smallint NOT NULL CHECK (numero > 0),
UNIQUE (recinto_id, numero)
);

CREATE TABLE public.organizaciones (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
sigla text NOT NULL UNIQUE,
nombre text NOT NULL UNIQUE,
color_hex text NOT NULL CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
orden smallint NOT NULL UNIQUE CHECK (orden > 0)
);

CREATE TABLE public.candidatos (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
organizacion_id uuid NOT NULL REFERENCES public.organizaciones (id),
dignidad text NOT NULL CHECK (dignidad IN ('alcaldia', 'prefectura')),
nombre text NOT NULL CHECK (btrim(nombre) <> ''),
UNIQUE (organizacion_id, dignidad)
);

CREATE TABLE public.asignaciones_veedor (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
veedor_id uuid NOT NULL REFERENCES public.perfiles (id),
rol_veedor text NOT NULL DEFAULT 'veedor' CHECK (rol_veedor = 'veedor'),
mesa_id uuid NOT NULL REFERENCES public.mesas (id),
asignado_por uuid NOT NULL REFERENCES public.perfiles (id),
asignado_en timestamptz NOT NULL DEFAULT now(),
finalizado_por uuid REFERENCES public.perfiles (id),
finalizado_en timestamptz,
CHECK (
(finalizado_en IS NULL AND finalizado_por IS NULL)
OR (finalizado_en IS NOT NULL AND finalizado_por IS NOT NULL)
),
CHECK (finalizado_en IS NULL OR finalizado_en >= asignado_en),
UNIQUE (id, mesa_id),
UNIQUE (id, mesa_id, veedor_id),
FOREIGN KEY (veedor_id, rol_veedor)
REFERENCES public.perfiles (id, rol)
);

CREATE UNIQUE INDEX asignaciones_veedor_mesa_activa_unica
ON public.asignaciones_veedor (mesa_id)
WHERE finalizado_en IS NULL;

CREATE INDEX asignaciones_veedor_veedor_activa_idx
ON public.asignaciones_veedor (veedor_id)
WHERE finalizado_en IS NULL;

CREATE TABLE public.reemplazos_veedor (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
mesa_id uuid NOT NULL REFERENCES public.mesas (id),
asignacion_anterior_id uuid NOT NULL,
asignacion_nueva_id uuid NOT NULL,
veedor_saliente_id uuid NOT NULL REFERENCES public.perfiles (id),
veedor_entrante_id uuid NOT NULL REFERENCES public.perfiles (id),
reemplazado_por uuid NOT NULL REFERENCES public.perfiles (id),
motivo text NOT NULL CHECK (btrim(motivo) <> ''),
reemplazado_en timestamptz NOT NULL DEFAULT now(),
CHECK (veedor_saliente_id <> veedor_entrante_id),
FOREIGN KEY (asignacion_anterior_id, mesa_id, veedor_saliente_id)
  REFERENCES public.asignaciones_veedor (id, mesa_id, veedor_id),
FOREIGN KEY (asignacion_nueva_id, mesa_id, veedor_entrante_id)
  REFERENCES public.asignaciones_veedor (id, mesa_id, veedor_id)
);

CREATE INDEX reemplazos_veedor_mesa_idx
ON public.reemplazos_veedor (mesa_id);

CREATE TABLE public.actas (
id uuid PRIMARY KEY,
mesa_id uuid NOT NULL REFERENCES public.mesas (id),
dignidad text NOT NULL CHECK (dignidad IN ('alcaldia', 'prefectura')),
creada_por uuid NOT NULL REFERENCES public.perfiles (id),
total_sufragantes integer NOT NULL CHECK (total_sufragantes >= 0),
votos_nulos integer NOT NULL CHECK (
votos_nulos >= 0 AND votos_nulos <= total_sufragantes
),
votos_blancos integer NOT NULL CHECK (
votos_blancos >= 0 AND votos_blancos <= total_sufragantes
),
capturada_en timestamptz NOT NULL,
distancia_recinto_m double precision NOT NULL
CHECK (distancia_recinto_m >= 0),
fuera_margen boolean NOT NULL DEFAULT false,
recibida_en timestamptz NOT NULL DEFAULT now(),
UNIQUE (mesa_id, dignidad)
);

CREATE INDEX actas_creada_por_idx ON public.actas (creada_por);

CREATE TABLE public.votos_por_organizacion (
acta_id uuid NOT NULL REFERENCES public.actas (id),
organizacion_id uuid NOT NULL REFERENCES public.organizaciones (id),
votos integer NOT NULL CHECK (votos >= 0),
PRIMARY KEY (acta_id, organizacion_id)
);

CREATE TABLE public.evidencias (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
acta_id uuid NOT NULL REFERENCES public.actas (id),
ruta_foto text NOT NULL CHECK (btrim(ruta_foto) <> ''),
latitud double precision NOT NULL CHECK (latitud BETWEEN -90 AND 90),
longitud double precision NOT NULL CHECK (longitud BETWEEN -180 AND 180),
precision_m double precision NOT NULL CHECK (precision_m >= 0),
capturada_en timestamptz NOT NULL,
recibida_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX evidencias_acta_id_idx ON public.evidencias (acta_id);