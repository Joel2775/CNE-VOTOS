import { z } from "zod";

export const correoSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Ingresa un correo válido." }));

export const contrasenaSchema = z
  .string()
  .min(1, "Ingresa tu contraseña.");

export function validarCedulaEcuatoriana(cedula: string): boolean {
  if (!/^\d{10}$/.test(cedula)) {
    return false;
  }

  const provincia = Number(cedula.slice(0, 2));
  if (provincia < 1 || provincia > 24) {
    return false;
  }

  let suma = 0;
  for (let indice = 0; indice < 9; indice += 1) {
    let digito = Number(cedula[indice]);
    if (indice % 2 === 0) {
      digito *= 2;
      if (digito > 9) {
        digito -= 9;
      }
    }
    suma += digito;
  }

  const verificador = (10 - (suma % 10)) % 10;
  return verificador === Number(cedula[9]);
}

export const cedulaSchema = z
  .string()
  .regex(/^\d{10}$/, "La cédula debe tener 10 dígitos.")
  .refine(validarCedulaEcuatoriana, {
    error: "La cédula no es válida. Revisa sus dígitos.",
  });

const datosNuevaCuentaSchema = z.object({
  nombres: z.string().trim().min(2, "Ingresa los nombres."),
  apellidos: z.string().trim().min(2, "Ingresa los apellidos."),
  cedula: cedulaSchema,
  telefono: z.string().trim().min(7, "Ingresa un teléfono válido."),
  correo: correoSchema,
});

export const nuevoVeedorSchema = datosNuevaCuentaSchema;
export const nuevoCoordinadorRecintoSchema = datosNuevaCuentaSchema;

export const credencialesAccesoSchema = z.object({
  correo: correoSchema,
  contrasena: contrasenaSchema,
});

export const solicitudRecuperacionSchema = z.object({
  correo: correoSchema,
});

export const contrasenaSeguraSchema = z
  .string()
  .min(12, "Usa al menos 12 caracteres.")
  .regex(/[a-z]/, "Incluye al menos una letra minúscula.")
  .regex(/[A-Z]/, "Incluye al menos una letra mayúscula.")
  .regex(/[0-9]/, "Incluye al menos un número.");

export const cambioContrasenaSchema = z
  .object({
    contrasena: contrasenaSeguraSchema,
    confirmarContrasena: z.string().min(1, "Confirma tu contraseña."),
  })
  .refine((datos) => datos.contrasena === datos.confirmarContrasena, {
    path: ["confirmarContrasena"],
    error: "Las contraseñas no coinciden.",
  });

export type CredencialesAcceso = z.infer<typeof credencialesAccesoSchema>;
export type SolicitudRecuperacion = z.infer<typeof solicitudRecuperacionSchema>;
export type NuevoVeedor = z.infer<typeof nuevoVeedorSchema>;
export type NuevoCoordinadorRecinto = z.infer<
  typeof nuevoCoordinadorRecintoSchema
>;
export type CambioContrasena = z.infer<typeof cambioContrasenaSchema>;
