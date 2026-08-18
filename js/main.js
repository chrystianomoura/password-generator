"use strict";

import { generatePassword } from "./password-generator.js";
import { calculateEntropy } from "./password-entropy.js";
import { evaluatePasswordStrength } from "./password-strength.js";
import { copyTextToClipboard } from "./clipboard.js";

/* =========================================================
   PASSWORD GENERATOR — CONTROLADOR PRINCIPAL
   ---------------------------------------------------------
   Responsabilidade:
   conectar a interface aos módulos da aplicação.

   A geração, a análise, a classificação de segurança
   e a lógica de clipboard permanecem isoladas.
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

  appStatus: document.querySelector("#app-status"),

  entropyValue: document.querySelector("#entropy-value"),
  securityLevel: document.querySelector("#security-level"),
  strengthBars: document.querySelectorAll("#strength-bars span"),
};

/* =========================================================
   02. ESTADO LOCAL DA INTERFACE
   ========================================================= */

let copyFeedbackTimeout = null;
let generatedPasswordOptions = null;
let generationFailed = false;

/* =========================================================
   03. STATUS DA APLICAÇÃO
   ========================================================= */

function setAppStatus(message = "") {
  elements.appStatus.textContent = message;
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
   05. COMPARAÇÃO DAS CONFIGURAÇÕES
   ========================================================= */

function passwordOptionsAreEqual(firstOptions, secondOptions) {
  if (!firstOptions || !secondOptions) {
    return false;
  }

  return (
    firstOptions.length === secondOptions.length &&
    firstOptions.uppercase === secondOptions.uppercase &&
    firstOptions.lowercase === secondOptions.lowercase &&
    firstOptions.numbers === secondOptions.numbers &&
    firstOptions.symbols === secondOptions.symbols &&
    firstOptions.excludeAmbiguous === secondOptions.excludeAmbiguous
  );
}

/* =========================================================
   06. ESTADO DA GERAÇÃO
   ========================================================= */

function updateGenerationState() {
  const currentOptions = getPasswordOptions();

  const isStale =
    generatedPasswordOptions !== null &&
    !passwordOptionsAreEqual(currentOptions, generatedPasswordOptions);

  elements.generateButton.dataset.stale = String(isStale);

  if (generationFailed) {
    elements.generateButton.textContent = "Try again";

    elements.generateButton.setAttribute(
      "aria-label",
      "Try to generate the password again",
    );

    return;
  }

  elements.generateButton.textContent = isStale
    ? "Generate updated password"
    : "Generate new password";

  elements.generateButton.setAttribute(
    "aria-label",
    isStale
      ? "Generate a password using the updated configuration"
      : "Generate a new password",
  );
}

/* =========================================================
   07. ANÁLISE
   ========================================================= */

function updateAnalysis() {
  try {
    const options = getPasswordOptions();

    const entropy = calculateEntropy(options);

    const strength = evaluatePasswordStrength(entropy);

    elements.entropyValue.textContent = Math.round(entropy);

    elements.securityLevel.textContent = strength.label;

    elements.strengthBars.forEach((bar, index) => {
      bar.style.opacity = index < strength.bars ? "1" : "0.18";
    });

    elements.securityLevel.setAttribute(
      "aria-label",
      `Security level: ${strength.label}`,
    );
  } catch (error) {
    console.error("Password analysis failed:", error);

    elements.entropyValue.textContent = "—";
    elements.securityLevel.textContent = "Unavailable";

    elements.strengthBars.forEach((bar) => {
      bar.style.opacity = "0.18";
    });

    setAppStatus("Password analysis is temporarily unavailable.");
  }
}

/* =========================================================
   08. CONTROLE DE COMPRIMENTO
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

  updateAnalysis();
  updateGenerationState();
}

/* =========================================================
   09. CONTROLES ON / OFF
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

  updateAnalysis();
  updateGenerationState();
}

/* =========================================================
   10. AJUSTE RESPONSIVO DA SENHA
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
   11. GERAÇÃO DA SENHA
   ========================================================= */

function createPassword() {
  try {
    const options = getPasswordOptions();

    const password = generatePassword(options);

    elements.passwordOutput.textContent = password;

    generatedPasswordOptions = {
      ...options,
    };

    generationFailed = false;

    elements.copyButton.disabled = false;

    setAppStatus("");

    fitPasswordToDisplay();
    updateGenerationState();
  } catch (error) {
    console.error("Password generation failed:", error);

    generationFailed = true;

    /*
      Uma falha não deixa uma senha antiga parecendo
      pertencer à tentativa atual.
    */

    elements.passwordOutput.textContent = "";

    generatedPasswordOptions = null;

    elements.copyButton.disabled = true;

    setAppStatus("Unable to generate a secure password. Please try again.");

    updateGenerationState();
  }
}

/* =========================================================
   12. FEEDBACK DE CÓPIA
   ========================================================= */

function showCopyFeedback(message) {
  if (copyFeedbackTimeout !== null) {
    clearTimeout(copyFeedbackTimeout);
  }

  elements.copyButton.textContent = message;

  elements.copyButton.setAttribute("aria-label", message);

  copyFeedbackTimeout = window.setTimeout(() => {
    elements.copyButton.textContent = "Copy to clipboard";

    elements.copyButton.setAttribute(
      "aria-label",
      "Copy password to clipboard",
    );

    copyFeedbackTimeout = null;
  }, 1400);
}

/* =========================================================
   13. CÓPIA PARA A ÁREA DE TRANSFERÊNCIA
   ========================================================= */

async function copyPassword() {
  const password = elements.passwordOutput.textContent;

  if (!password) {
    setAppStatus("There is no password available to copy.");

    return;
  }

  try {
    await copyTextToClipboard(password);

    setAppStatus("");
    showCopyFeedback("Copied!");
  } catch (error) {
    console.error("Clipboard copy failed:", error);

    setAppStatus("Unable to copy automatically. Please try again.");

    showCopyFeedback("Copy failed");
  }
}

/* =========================================================
   14. OBSERVAÇÃO DO LAYOUT
   ========================================================= */

const passwordResizeObserver = new ResizeObserver(() => {
  fitPasswordToDisplay();
});

passwordResizeObserver.observe(elements.passwordDisplay);

/* =========================================================
   15. EVENTOS
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
   16. INICIALIZAÇÃO
   ========================================================= */

elements.copyButton.setAttribute("aria-label", "Copy password to clipboard");

elements.copyButton.disabled = true;

updateLength();
createPassword();

if (document.fonts?.ready) {
  document.fonts.ready.then(() => {
    fitPasswordToDisplay();
  });
}