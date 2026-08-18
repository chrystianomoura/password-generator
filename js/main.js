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

   Este arquivo coordena:
   - leitura dos controles;
   - atualização da interface;
   - geração da senha;
   - análise de entropia e força;
   - feedback de cópia;
   - adaptação visual da senha ao espaço disponível.

   Regras de domínio permanecem nos módulos especializados.
   ========================================================= */

/* =========================================================
   01. CONSTANTES DA INTERFACE
   ---------------------------------------------------------
   Valores compartilhados ficam centralizados para evitar
   strings e listas repetidas ao longo do controlador.
   ========================================================= */

const CHARACTER_OPTIONS = Object.freeze([
  "uppercase",
  "lowercase",
  "numbers",
  "symbols",
]);

const PASSWORD_FONT = Object.freeze({
  singleLineMinimum: 16,
  singleLineMaximum: 80,
  wrappedMinimum: 12,
  wrappedMaximum: 40,
  precision: 0.25,
});

const COPY_FEEDBACK_DURATION = 1400;

const COPY_LABELS = Object.freeze({
  default: "Copy to clipboard",
  copied: "Copied!",
  failed: "Copy failed",
});

/* =========================================================
   02. ELEMENTOS DA INTERFACE
   ---------------------------------------------------------
   As referências ao DOM são obtidas uma única vez.

   Isso deixa claro quais elementos o controlador espera
   encontrar e evita repetir querySelector durante o uso.
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

/*
  Os botões de configuração também são indexados pelo nome
  da opção.

  Assim, consultar "uppercase", "symbols" etc. não exige
  uma nova busca no documento.
*/

const configButtonsByOption = new Map(
  [...elements.configButtons].map((button) => [button.dataset.option, button]),
);

/* =========================================================
   03. VALIDAÇÃO DA INTERFACE
   ---------------------------------------------------------
   Como o HTML e o JavaScript evoluem separadamente, falhar
   cedo com uma mensagem clara torna erros de integração
   muito mais fáceis de diagnosticar.
   ========================================================= */

function assertRequiredElements() {
  const requiredElements = {
    lengthInput: elements.lengthInput,
    lengthValue: elements.lengthValue,
    analysisLength: elements.analysisLength,
    lengthTrack: elements.lengthTrack,
    passwordDisplay: elements.passwordDisplay,
    passwordOutput: elements.passwordOutput,
    generateButton: elements.generateButton,
    copyButton: elements.copyButton,
    appStatus: elements.appStatus,
    entropyValue: elements.entropyValue,
    securityLevel: elements.securityLevel,
  };

  const missingElements = Object.entries(requiredElements)
    .filter(([, element]) => !element)
    .map(([name]) => name);

  if (elements.configButtons.length === 0) {
    missingElements.push("configButtons");
  }

  if (elements.strengthBars.length === 0) {
    missingElements.push("strengthBars");
  }

  if (missingElements.length > 0) {
    throw new Error(
      `Password Generator initialization failed. Missing elements: ${missingElements.join(
        ", ",
      )}.`,
    );
  }
}

/* =========================================================
   04. ESTADO LOCAL DA INTERFACE
   ---------------------------------------------------------
   Este estado pertence apenas à camada de apresentação.

   A senha original é mantida separada do DOM porque sua
   representação visual pode ser dividida em duas linhas.
   ========================================================= */

let copyFeedbackTimeout = null;
let generatedPasswordOptions = null;
let generatedPassword = "";
let generationFailed = false;

/* =========================================================
   05. STATUS DA APLICAÇÃO
   ========================================================= */

function setAppStatus(message = "") {
  elements.appStatus.textContent = message;
}

/* =========================================================
   06. LEITURA DAS CONFIGURAÇÕES
   ========================================================= */

function isOptionEnabled(optionName) {
  const button = configButtonsByOption.get(optionName);

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
   07. COMPARAÇÃO DAS CONFIGURAÇÕES
   ---------------------------------------------------------
   A interface precisa saber se a senha exibida foi criada
   com as mesmas opções atualmente selecionadas.
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
   08. ESTADO DA GERAÇÃO
   ========================================================= */

function updateGenerationState() {
  const currentOptions = getPasswordOptions();

  const isStale =
    generatedPasswordOptions !== null &&
    !passwordOptionsAreEqual(currentOptions, generatedPasswordOptions);

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
   09. ANÁLISE
   ---------------------------------------------------------
   Entropia e classificação são calculadas pelos módulos de
   domínio. Este controlador apenas apresenta o resultado.
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

    elements.securityLevel.setAttribute(
      "aria-label",
      "Security level unavailable",
    );

    setAppStatus("Password analysis is temporarily unavailable.");
  }
}

/* =========================================================
   10. CONTROLE DE COMPRIMENTO
   ---------------------------------------------------------
   O input range é a fonte do valor.

   Além dos números visíveis, atualizamos:
   - a variável CSS que desenha o progresso;
   - aria-valuetext para uma leitura mais natural.
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
   11. CONTROLES ON / OFF
   ---------------------------------------------------------
   aria-pressed é a fonte do estado dos botões toggle.

   O texto On/Off é apenas a representação visual desse
   mesmo estado.
   ========================================================= */

function countActiveCharacterSets() {
  return CHARACTER_OPTIONS.filter(isOptionEnabled).length;
}

function updateConfigButtonLabel(button, isActive) {
  const label = button.querySelector("span");

  if (label) {
    label.textContent = isActive ? "On" : "Off";
  }
}

function toggleConfigButton(button) {
  const optionName = button.dataset.option;

  const isActive = button.getAttribute("aria-pressed") === "true";

  const isCharacterOption = CHARACTER_OPTIONS.includes(optionName);

  /*
    O gerador precisa de pelo menos um conjunto de
    caracteres ativo.

    Por isso o último conjunto disponível não pode ser
    desativado pela interface.
  */

  if (isCharacterOption && isActive && countActiveCharacterSets() === 1) {
    return;
  }

  const newState = !isActive;

  button.setAttribute("aria-pressed", String(newState));

  updateConfigButtonLabel(button, newState);

  updateAnalysis();
  updateGenerationState();
}

/* =========================================================
   12. AJUSTE RESPONSIVO DA SENHA
   ---------------------------------------------------------
   Objetivo:
   exibir a maior fonte possível sem cortar caracteres.

   Estratégia:
   1. tenta uma única linha;
   2. se nem 16px couber, divide a representação em duas;
   3. usa busca binária para encontrar o maior font-size;
   4. ao ganhar espaço novamente, volta para uma linha.

   A divisão é exclusivamente visual:
   a senha original permanece intacta em generatedPassword
   e é essa versão que vai para o clipboard.
   ========================================================= */

function resetPasswordDisplayMode() {
  const output = elements.passwordOutput;
  const display = elements.passwordDisplay;

  output.classList.remove("password-display__text--wrapped");

  display.classList.remove("password-display--wrapped");

  output.style.fontSize = "";

  /*
    textContent seria suficiente aqui, mas replaceChildren()
    deixa explícito que qualquer estrutura visual criada para
    o modo de duas linhas deve ser completamente substituída.
  */

  output.replaceChildren(document.createTextNode(generatedPassword));
}

function renderWrappedPassword() {
  const output = elements.passwordOutput;
  const display = elements.passwordDisplay;

  /*
    Math.ceil mantém as linhas equilibradas.

    Exemplos:
    44 -> 22 + 22
    64 -> 32 + 32
    63 -> 32 + 31
  */

  const midpoint = Math.ceil(generatedPassword.length / 2);

  const firstHalf = generatedPassword.slice(0, midpoint);

  const secondHalf = generatedPassword.slice(midpoint);

  const firstLine = document.createElement("span");

  const secondLine = document.createElement("span");

  firstLine.className = "password-display__line";

  secondLine.className = "password-display__line";

  firstLine.textContent = firstHalf;
  secondLine.textContent = secondHalf;

  output.replaceChildren(firstLine, secondLine);

  output.classList.add("password-display__text--wrapped");

  display.classList.add("password-display--wrapped");

  return [firstLine, secondLine];
}

/*
  Busca binária evita testar cada tamanho possível um por um.

  O callback fits(candidate) define o que significa "caber"
  para cada modo de exibição.
*/

function findLargestFontSizeThatFits(minimum, maximum, fits) {
  let lower = minimum;
  let upper = maximum;
  let bestSize = minimum;

  while (upper - lower > PASSWORD_FONT.precision) {
    const candidate = (lower + upper) / 2;

    if (fits(candidate)) {
      bestSize = candidate;
      lower = candidate;
    } else {
      upper = candidate;
    }
  }

  return bestSize;
}

function fitPasswordToDisplay() {
  const output = elements.passwordOutput;
  const display = elements.passwordDisplay;

  if (!generatedPassword) {
    return;
  }

  const availableWidth = display.clientWidth;

  if (availableWidth <= 0) {
    return;
  }

  /*
    Sempre reiniciamos pelo modo de linha única.

    Isso é o que permite responder corretamente a resize,
    rotação de tela e mudanças de breakpoint.
  */

  resetPasswordDisplayMode();

  output.style.fontSize = `${PASSWORD_FONT.singleLineMinimum}px`;

  const fitsOnSingleLine = output.scrollWidth <= availableWidth;

  if (fitsOnSingleLine) {
    const bestSingleLineSize = findLargestFontSizeThatFits(
      PASSWORD_FONT.singleLineMinimum,
      PASSWORD_FONT.singleLineMaximum,
      (candidate) => {
        output.style.fontSize = `${candidate}px`;

        return output.scrollWidth <= availableWidth;
      },
    );

    output.style.fontSize = `${bestSingleLineSize}px`;

    return;
  }

  /*
    Uma única linha deixou de ser viável.

    A senha é renderizada em duas metades e o mesmo processo
    procura o maior tamanho que permita às duas linhas caber.
  */

  const wrappedLines = renderWrappedPassword();

  const bestWrappedSize = findLargestFontSizeThatFits(
    PASSWORD_FONT.wrappedMinimum,
    PASSWORD_FONT.wrappedMaximum,
    (candidate) => {
      output.style.fontSize = `${candidate}px`;

      return wrappedLines.every((line) => line.scrollWidth <= availableWidth);
    },
  );

  output.style.fontSize = `${bestWrappedSize}px`;
}

/* =========================================================
   13. GERAÇÃO DA SENHA
   ========================================================= */

function createPassword() {
  try {
    const options = getPasswordOptions();
    const password = generatePassword(options);

    /*
      generatedPassword é a fonte verdadeira da senha.

      O conteúdo do DOM pode assumir outra estrutura apenas
      para fins de apresentação responsiva.
    */

    generatedPassword = password;

    elements.passwordOutput.textContent = generatedPassword;

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
    generatedPassword = "";
    generatedPasswordOptions = null;

    elements.passwordOutput.textContent = "";
    elements.copyButton.disabled = true;

    setAppStatus("Unable to generate a secure password. Please try again.");

    updateGenerationState();
  }
}

/* =========================================================
   14. FEEDBACK DE CÓPIA
   ========================================================= */

function setCopyButtonLabel(label) {
  elements.copyButton.textContent = label;

  elements.copyButton.setAttribute("aria-label", label);
}

function showCopyFeedback(message) {
  if (copyFeedbackTimeout !== null) {
    clearTimeout(copyFeedbackTimeout);
  }

  setCopyButtonLabel(message);

  copyFeedbackTimeout = window.setTimeout(() => {
    setCopyButtonLabel(COPY_LABELS.default);

    copyFeedbackTimeout = null;
  }, COPY_FEEDBACK_DURATION);
}

/* =========================================================
   15. CÓPIA PARA A ÁREA DE TRANSFERÊNCIA
   ---------------------------------------------------------
   Copiamos generatedPassword, não textContent.

   Isso evita qualquer dependência da representação visual
   em uma ou duas linhas.
   ========================================================= */

async function copyPassword() {
  if (!generatedPassword) {
    setAppStatus("There is no password available to copy.");

    return;
  }

  try {
    await copyTextToClipboard(generatedPassword);

    setAppStatus("");

    showCopyFeedback(COPY_LABELS.copied);
  } catch (error) {
    console.error("Clipboard copy failed:", error);

    setAppStatus("Unable to copy automatically. Please try again.");

    showCopyFeedback(COPY_LABELS.failed);
  }
}

/* =========================================================
   16. OBSERVAÇÃO DO LAYOUT
   ---------------------------------------------------------
   ResizeObserver acompanha mudanças reais no espaço do
   componente, não apenas eventos de resize da janela.

   Isso cobre:
   - alteração da viewport;
   - rotação do dispositivo;
   - mudanças provocadas por breakpoints;
   - outras alterações de layout que mudem a largura.
   ========================================================= */

function observePasswordDisplay() {
  if (typeof ResizeObserver !== "function") {
    /*
      Navegadores modernos suportam ResizeObserver.

      O fallback mantém a adaptação funcionando em ambientes
      que ofereçam apenas o evento resize da janela.
    */

    window.addEventListener("resize", fitPasswordToDisplay);

    return;
  }

  const passwordResizeObserver = new ResizeObserver(() => {
    fitPasswordToDisplay();
  });

  passwordResizeObserver.observe(elements.passwordDisplay);
}

/* =========================================================
   17. EVENTOS
   ========================================================= */

function bindEvents() {
  elements.lengthInput.addEventListener("input", updateLength);

  elements.configButtons.forEach((button) => {
    button.addEventListener("click", () => {
      toggleConfigButton(button);
    });
  });

  elements.generateButton.addEventListener("click", createPassword);

  elements.copyButton.addEventListener("click", copyPassword);
}

/* =========================================================
   18. INICIALIZAÇÃO
   ---------------------------------------------------------
   Centralizar o bootstrap torna a ordem de inicialização
   explícita e evita efeitos colaterais espalhados no arquivo.
   ========================================================= */

function initializeApp() {
  assertRequiredElements();

  setCopyButtonLabel(COPY_LABELS.default);

  /*
    O HTML já contém disabled como estado inicial seguro.

    Reforçamos o estado aqui porque o JavaScript é a camada
    que passa a controlar o botão depois da inicialização.
  */

  elements.copyButton.disabled = true;

  bindEvents();
  observePasswordDisplay();

  updateLength();
  createPassword();

  /*
    A fonte web pode terminar de carregar depois da primeira
    medição. Quando isso acontece, as métricas do texto mudam.

    Recalculamos uma vez com as métricas tipográficas finais.
  */

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      fitPasswordToDisplay();
    });
  }
}

initializeApp();