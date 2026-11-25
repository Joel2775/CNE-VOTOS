import { z } from "zod";

const numeroEntero = z
  .string()
  .trim()
  .regex(/^\d+$/, "Ingresa un número entero igual o mayor que cero.")
  .transform(Number)
  .pipe(
    z
      .number()
      .int()
      .min(0)
      .max(2_147_483_647, "El valor no puede superar el máximo permitido."),
  );

export const formularioActaSchema = z
  .object({
    total_sufragantes: numeroEntero,
    votos_nulos: numeroEntero,
    votos_blancos: numeroEntero,
    votos: z
      .array(
        z.object({
          organizacion_id: z.uuid(),
          votos: numeroEntero,
        }),
      )
      .length(5, "El acta debe incluir las cinco organizaciones."),
  })
  .superRefine((acta, contexto) => {
    const total = acta.total_sufragantes;
    const ids = acta.votos.map((voto) => voto.organizacion_id);

    if (new Set(ids).size !== ids.length) {
      contexto.addIssue({
        code: "custom",
        message: "No repitas organizaciones en el acta.",
        path: ["votos"],
      });
    }

    acta.votos.forEach((voto, indice) => {
      if (voto.votos > total) {
        contexto.addIssue({
          code: "custom",
          message: "Los votos no pueden superar el total de sufragantes.",
          path: ["votos", indice, "votos"],
        });
      }
    });

    if (acta.votos_nulos > total || acta.votos_blancos > total) {
      contexto.addIssue({
        code: "custom",
        message: "Nulos y blancos no pueden superar el total de sufragantes.",
        path: ["votos_nulos"],
      });
    }

    const suma =
      acta.votos.reduce((acumulado, voto) => acumulado + voto.votos, 0) +
      acta.votos_nulos +
      acta.votos_blancos;

    if (suma !== total) {
      contexto.addIssue({
        code: "custom",
        message: "La suma de votos, nulos y blancos debe igualar el total.",
        path: ["votos"],
      });
    }
  });

export type FormularioActaEntrada = z.input<typeof formularioActaSchema>;
export type FormularioActaValida = z.output<typeof formularioActaSchema>;
