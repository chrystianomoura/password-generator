"use strict";

import { generatePassword } from "./password-generator.js";

/* =========================================================
   PASSWORD GENERATOR — CONTROLADOR PRINCIPAL
   ---------------------------------------------------------
   Responsabilidade:
   conectar a interface aos módulos da aplicação.

   A lógica criptográfica permanece isolada em
   password-generator.js.
   ========================================================= */

/* =========================================================
   01. ELEMENTOS DA INTERFACE
   ========================================================= */

const elements = {
  lengthInput: document.querySelector("#password-length"),
  lengthValue: document.querySelector("#length-value"),
  analysisLength: document.querySelector("#analysis-length"),
  lengthTrack: document.querySelector(".length-control__track"),

  configButtons: document.querySelectorAll(".config-row button[data-option]"),

  passwordDisplay: document.querySelector(".password-display"),

  passwordOutput: document.querySelector("#generated-password"),

  generateButton: document.querySelector("#generate-password"),

  copyButton: document.querySelector("#copy-password"),
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
   03. LEITURA DAS CONFIGURAÇÕES
   ========================================================= */

function isOptionEnabled(optionName) {
  const button = document.querySelector(`[data-option="${optionName}"]`);

  return button?.getAttribute("aria-pressed") === "true";
}

function getPasswordOptions() {
  return {
    length: Number(elements.lengthInput.value),

    uppercase: isOptionEnabled("uppercase"),

    lowercase: isOptionEnabled("lowercase"),

    numbers: isOptionEnabled("numbers"),

    symbols: isOptionEnabled("symbols"),

    excludeAmbiguous: isOptionEnabled("excludeAmbiguous"),
  };
}

/* =========================================================
   04. CONTROLES ON / OFF
   ========================================================= */

function countActiveCharacterSets() {
  const characterOptions = ["uppercase", "lowercase", "numbers", "symbols"];

  return characterOptions.filter(isOptionEnabled).length;
}

function toggleConfigButton(button) {
  const optionName = button.dataset.option;

  const isActive = button.getAttribute("aria-pressed") === "true";

  /*
    Pelo menos uma categoria de caracteres precisa
    permanecer ativa.

    excludeAmbiguous não conta como categoria porque
    apenas modifica os conjuntos existentes.
  */

  const isCharacterOption = optionName !== "excludeAmbiguous";

  if (isCharacterOption && isActive && countActiveCharacterSets() === 1) {
    return;
  }

  const newState = !isActive;

  button.setAttribute("aria-pressed", String(newState));

  const label = button.querySelector("span");

  if (label) {
    label.textContent = newState ? "On" : "Off";
  }
}

/* =========================================================
   05. AJUSTE RESPONSIVO DA SENHA
   ========================================================= */

/*
  A senha deve permanecer inteira em uma única linha.

  Em vez de definir tamanhos diferentes manualmente
  para 8, 24, 40 ou 64 caracteres, medimos o espaço
  real disponível e encontramos o maior tamanho de
  fonte que ainda cabe dentro do campo.

  Isso mantém o componente robusto mesmo quando:
  - o comprimento da senha muda;
  - a viewport muda;
  - a largura do painel muda;
  - a tipografia termina de carregar.
*/

const PASSWORD_FONT = Object.freeze({
  minimum: 16,
  maximum: 80,
  precision: 0.25,
});

function fitPasswordToDisplay() {
  const output = elements.passwordOutput;
  const display = elements.passwordDisplay;

  if (!output || !display || !output.textContent) {
    return;
  }

  const availableWidth = display.clientWidth;

  if (availableWidth <= 0) {
    return;
  }

  /*
    Binary search evita diminuir a fonte pixel por pixel.

    Em poucas iterações encontramos o maior tamanho
    possível que ainda mantém a senha inteira visível.
  */

  let minimum = PASSWORD_FONT.minimum;
  let maximum = PASSWORD_FONT.maximum;
  let bestSize = minimum;

  while (maximum - minimum > PASSWORD_FONT.precision) {
    const candidate = (minimum + maximum) / 2;

    output.style.fontSize = `${candidate}px`;

    if (output.scrollWidth <= availableWidth) {
      bestSize = candidate;
      minimum = candidate;
    } else {
      maximum = candidate;
    }
  }

  output.style.fontSize = `${bestSize}px`;
}

/* =========================================================
   06. GERAÇÃO DA SENHA
   ========================================================= */

function createPassword() {
  try {
    const options = getPasswordOptions();

    const password = generatePassword(options);

    elements.passwordOutput.textContent = password;

    fitPasswordToDisplay();
  } catch (error) {
    console.error("Password generation failed:", error);
  }
}

/* =========================================================
   07. OBSERVAÇÃO DO LAYOUT
   ========================================================= */

/*
  Se o painel mudar de largura, recalculamos a fonte.

  ResizeObserver evita depender apenas do evento global
  de resize da janela e observa diretamente o componente
  que realmente importa.
*/

const passwordResizeObserver = new ResizeObserver(() => {
  fitPasswordToDisplay();
});

passwordResizeObserver.observe(elements.passwordDisplay);

/* =========================================================
   08. EVENTOS
   ========================================================= */

elements.lengthInput.addEventListener("input", updateLength);

elements.configButtons.forEach((button) => {
  button.addEventListener("click", () => {
    toggleConfigButton(button);
  });
});

elements.generateButton.addEventListener("click", createPassword);

/* =========================================================
   09. INICIALIZAÇÃO
   ========================================================= */

updateLength();
createPassword();

/*
  Fontes web podem terminar de carregar depois que o
  primeiro layout já foi calculado.

  Quando estiverem disponíveis, fazemos uma segunda
  medição para garantir precisão tipográfica.
*/

if (document.fonts?.ready) {
  document.fonts.ready.then(() => {
    fitPasswordToDisplay();
  });
}