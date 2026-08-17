"use strict";

/* =========================================================
   PASSWORD GENERATOR — CONTROLADOR PRINCIPAL
   ========================================================= */

/* =========================================================
   01. ELEMENTOS DA INTERFACE
   ========================================================= */

const elements = {
  lengthInput: document.querySelector("#password-length"),
  lengthValue: document.querySelector("#length-value"),
  analysisLength: document.querySelector("#analysis-length"),
  lengthTrack: document.querySelector(".length-control__track"),
};

/* =========================================================
   02. CONTROLE DE COMPRIMENTO
   ========================================================= */

/*
  Mantém sincronizados:

  - o input range;
  - o valor exibido em Configuration;
  - o valor exibido em Analysis;
  - o preenchimento visual do slider;
  - a posição visual do marcador.
*/

function updateLength() {
  const value = Number(elements.lengthInput.value);
  const minimum = Number(elements.lengthInput.min);
  const maximum = Number(elements.lengthInput.max);

  const progress =
    ((value - minimum) / (maximum - minimum)) * 100;

  elements.lengthValue.textContent = value;
  elements.analysisLength.textContent = value;

  elements.lengthTrack.style.setProperty(
    "--length-progress",
    `${progress}%`,
  );

  elements.lengthInput.setAttribute(
    "aria-valuetext",
    `${value} characters`,
  );
}

/* =========================================================
   03. EVENTOS
   ========================================================= */

elements.lengthInput.addEventListener(
  "input",
  updateLength,
);

/* =========================================================
   04. INICIALIZAÇÃO
   ========================================================= */

updateLength();