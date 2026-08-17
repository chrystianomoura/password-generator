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
   02. ESTADO LOCAL DA INTERFACE
   ========================================================= */

let copyFeedbackTimeout = null;

/* =========================================================
   03. CONTROLE DE COMPRIMENTO
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
   04. LEITURA DAS CONFIGURAÇÕES
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
   05. CONTROLES ON / OFF
   ========================================================= */

function countActiveCharacterSets() {
  const characterOptions = ["uppercase", "lowercase", "numbers", "symbols"];

  return characterOptions.filter(isOptionEnabled).length;
}

function toggleConfigButton(button) {
  const optionName = button.dataset.option;

  const isActive = button.getAttribute("aria-pressed") === "true";

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
   06. AJUSTE RESPONSIVO DA SENHA
   ========================================================= */

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
   07. GERAÇÃO DA SENHA
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
   08. CÓPIA PARA A ÁREA DE TRANSFERÊNCIA
   ========================================================= */

/*
  Mostra um feedback curto no próprio botão.

  O timer anterior é cancelado antes de criar outro,
  evitando conflitos caso o usuário clique repetidamente.
*/

function showCopyFeedback(message) {
  if (copyFeedbackTimeout !== null) {
    clearTimeout(copyFeedbackTimeout);
  }

  elements.copyButton.textContent = message;

  copyFeedbackTimeout = window.setTimeout(() => {
    elements.copyButton.textContent = "Copy to clipboard";

    copyFeedbackTimeout = null;
  }, 1400);
}

/*
  Fallback para ambientes onde navigator.clipboard
  não esteja disponível ou a operação seja recusada.

  O textarea é criado apenas durante a cópia e
  removido imediatamente depois.
*/

function copyWithFallback(text) {
  const temporaryTextarea = document.createElement("textarea");

  temporaryTextarea.value = text;

  temporaryTextarea.setAttribute("readonly", "");

  temporaryTextarea.style.position = "fixed";
  temporaryTextarea.style.opacity = "0";
  temporaryTextarea.style.pointerEvents = "none";

  document.body.appendChild(temporaryTextarea);

  temporaryTextarea.select();

  const copied = document.execCommand("copy");

  temporaryTextarea.remove();

  if (!copied) {
    throw new Error("Fallback clipboard copy failed.");
  }
}

async function copyPassword() {
  const password = elements.passwordOutput.textContent;

  if (!password) {
    return;
  }

  try {
    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      await navigator.clipboard.writeText(password);
    } else {
      copyWithFallback(password);
    }

    showCopyFeedback("Copied!");
  } catch (error) {
    /*
      Se a API moderna existir, mas falhar por política,
      permissão ou contexto, tentamos o fallback.
    */

    try {
      copyWithFallback(password);

      showCopyFeedback("Copied!");
    } catch (fallbackError) {
      console.error("Clipboard copy failed:", error, fallbackError);

      showCopyFeedback("Copy failed");
    }
  }
}

/* =========================================================
   09. OBSERVAÇÃO DO LAYOUT
   ========================================================= */

const passwordResizeObserver = new ResizeObserver(() => {
  fitPasswordToDisplay();
});

passwordResizeObserver.observe(elements.passwordDisplay);

/* =========================================================
   10. EVENTOS
   ========================================================= */

elements.lengthInput.addEventListener("input", updateLength);

elements.configButtons.forEach((button) => {
  button.addEventListener("click", () => {
    toggleConfigButton(button);
  });
});

elements.generateButton.addEventListener("click", createPassword);

elements.copyButton.addEventListener("click", copyPassword);

/* =========================================================
   11. INICIALIZAÇÃO
   ========================================================= */

updateLength();
createPassword();

if (document.fonts?.ready) {
  document.fonts.ready.then(() => {
    fitPasswordToDisplay();
  });
}