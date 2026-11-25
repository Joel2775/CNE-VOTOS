# Estilo visual: claymorfismo

Look de "arcilla": formas muy redondeadas, colores suaves, volumen con sombras
exteriores e interiores. Aplica a TODA la app.

## Tokens (viven en src/ui/tema, nunca valores sueltos en las pantallas)
- fondo #E9ECFB · superficie #F4F5FF · texto #25233F · texto suave #5A5878
- primario #5B52E6 · primario claro #8B84FF
- éxito #2E9E6B · error #D64550 · alerta #E0A100
- Radios: tarjetas 28 · botones 24 · campos 20 · chips 999
- Botones: alto mínimo 56 · letra base 18 (personas mayores, RNF-01)
- Los colores de las organizaciones (S-02) se mantienen en candidatos y resultados.

## Receta de volumen (4 capas con boxShadow)
```ts
boxShadow: [
  { offsetX: 8,  offsetY: 10, blurRadius: 20, color: 'rgba(70,60,140,0.25)' },
  { offsetX: -6, offsetY: -6, blurRadius: 14, color: 'rgba(255,255,255,0.9)' },
  { offsetX: 4,  offsetY: 4,  blurRadius: 10, color: 'rgba(255,255,255,0.7)', inset: true },
  { offsetX: -4, offsetY: -6, blurRadius: 10, color: 'rgba(70,60,140,0.18)', inset: true },
]
```

## Reglas
1. Todo componente visual sale de src/ui/componentes (ClayCard, ClayButton,
   ClayInput, ClayChip, ClayHeader). Las pantallas no definen sombras ni colores.
2. Botón presionado: Reanimated con escala 0.97 y sombra más suave (RNF-02).
3. Contraste de texto mínimo 4.5:1; el estilo nunca debe bajar la legibilidad.
4. Estados del acta (en proceso, pendiente, enviada, error) = ClayChip con color y
   ícono, no solo color.
5. Rendimiento en gama baja (RNF-10): el volumen va en tarjetas y botones, no en
   cada fila de listas largas; ahí usa una versión plana.
6. Animaciones Lottie para proceso, éxito y error, con fondo transparente.