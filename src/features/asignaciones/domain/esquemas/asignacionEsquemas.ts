import { z } from "zod";

export const asignarVeedorSchema = z.object({
  mesa_id: z.uuid(),
  veedor_id: z.uuid(),
});

export const reemplazarVeedorSchema = z.object({
  asignacion_anterior_id: z.uuid(),
  veedor_entrante_id: z.uuid(),
  motivo: z.string().trim().min(3, "Describe el motivo del reemplazo."),
});

export type NuevaAsignacion = z.infer<typeof asignarVeedorSchema>;
export type NuevoReemplazo = z.infer<typeof reemplazarVeedorSchema>;
