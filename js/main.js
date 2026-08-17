"use strict";

import { generatePassword } from "./password-generator.js";

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

  configButtons: document.querySelectorAll(".config-row button[aria-pressed]"),
};

/* =========================================================
   02. CONTROLE DE COMPRIMENTO
   ========================================================= */

function updateLength() {
  const value = Number(elements.lengthInput.value);
  const minimum = Number(elements.lengthInput.min);
  const maximum = Number(elements.lengthInput.max);

  const progress = ((value - minimum) / (maximum - minimum)) * 100;

  elements.lengthValue.textContent = value;
  elements.analysisLength.textContent = value;

  elements.lengthTrack.style.setProperty("--length-progress", `${progress}%`);

  elements.lengthInput.setAttribute("aria-valuetext", `${value} characters`);
}

/* =========================================================
   03. CONTROLES ON / OFF
   ========================================================= */

function toggleConfigButton(button) {
  const isActive = button.getAttribute("aria-pressed") === "true";

  const newState = !isActive;

  button.setAttribute("aria-pressed", String(newState));

  const label = button.querySelector("span");

  if (label) {
    label.textContent = newState ? "On" : "Off";
  }
}

/* =========================================================
   04. EVENTOS
   ========================================================= */

elements.lengthInput.addEventListener("input", updateLength);

elements.configButtons.forEach((button) => {
  button.addEventListener("click", () => {
    toggleConfigButton(button);
  });
});

/* =========================================================
   05. INICIALIZAÇÃO
   ========================================================= */

updateLength();

/* =========================================================
   06. MOTOR DE SENHAS
   ---------------------------------------------------------
   O motor já está disponível para a próxima etapa.

   A conexão com Generate será feita separadamente para
   manter cada implementação pequena e testável.
   ========================================================= */

void generatePassword;