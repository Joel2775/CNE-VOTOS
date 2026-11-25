console.log("EL ARCHIVO VALIDAR.JS SE ESTA EJECUTANDO");

function generarCedulaEcuatoriana() {
  // Generar provincia entre 01 y 24
  const provincia = String(Math.floor(Math.random() * 24) + 1).padStart(2, "0");

  // Tercer dígito: entre 0 y 5
  const tercerDigito = Math.floor(Math.random() * 6);

  // Generar los primeros 9 dígitos
  let cedula = provincia + tercerDigito;

  for (let i = 0; i < 6; i++) {
    cedula += Math.floor(Math.random() * 10);
  }

  // Calcular el dígito verificador
  let suma = 0;

  for (let i = 0; i < 9; i++) {
    let valor = Number(cedula[i]);

    // Multiplicar posiciones impares (desde índice 0)
    if (i % 2 === 0) {
      valor *= 2;

      if (valor > 9) {
        valor -= 9;
      }
    }

    suma += valor;
  }

  const digitoVerificador = (10 - (suma % 10)) % 10;

  return cedula + digitoVerificador;
}

// Generar 10 cédulas sintéticas
const cedulasPrueba = Array.from({ length: 10 }, () =>
  generarCedulaEcuatoriana(),
);

// Mostrar resultados
console.log("\nCÉDULAS SINTÉTICAS GENERADAS:\n");

cedulasPrueba.forEach((cedula, index) => {
  console.log(`${index + 1}. ${cedula}`);
});

console.log("\nTotal generadas:", cedulasPrueba.length);
