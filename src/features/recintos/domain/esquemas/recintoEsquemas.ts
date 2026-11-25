import { z } from "zod";

const numeroDesdeTexto = (mensaje: string) =>
  z
    .string()
    .trim()
    .min(1, mensaje)
    .refine((valor) => Number.isFinite(Number(valor)), mensaje)
    .transform(Number);

export const nuevoRecintoSchema = z.object({
  nombre: z.string().trim().min(2, "Ingresa el nombre del recinto."),
  parroquia_id: z.uuid("Selecciona una parroquia válida."),
  latitud: numeroDesdeTexto("Ingresa una latitud válida.").pipe(
    z.number().min(-90, "La latitud debe estar entre -90 y 90.").max(90),
  ),
  longitud: numeroDesdeTexto("Ingresa una longitud válida.").pipe(
    z.number().min(-180, "La longitud debe estar entre -180 y 180.").max(180),
  ),
  cantidad_mesas: z
    .string()
    .trim()
    .regex(/^[1-9]\d*$/, "Ingresa un número entero de mesas mayor que cero.")
    .transform(Number)
    .pipe(z.number().int().max(32767, "El máximo es 32767 mesas.")),
  coordinador_id: z.union([z.uuid(), z.literal("")]).optional(),
});

export type NuevoRecintoFormulario = z.input<typeof nuevoRecintoSchema>;
export type NuevoRecintoValidado = z.output<typeof nuevoRecintoSchema>;
