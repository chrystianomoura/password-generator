"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import { copyTextToClipboard } from "../js/clipboard.js";

/* =========================================================
   PASSWORD GENERATOR — TESTES DO CLIPBOARD
   ---------------------------------------------------------
   Este arquivo verifica o contrato público do módulo de
   clipboard.

   Cenários cobertos:
   - validação da entrada;
   - Clipboard API moderna;
   - fallback baseado no DOM;
   - recuperação quando a API moderna falha;
   - limpeza do elemento temporário;
   - restauração de foco;
   - falha total das estratégias.

   Como alguns testes substituem propriedades globais do
   ambiente, cada alteração é restaurada em finally.
   ========================================================= */

/* =========================================================
   01. UTILITÁRIOS DE TESTE
   ========================================================= */

/*
  Substitui temporariamente uma propriedade de globalThis.

  Guardamos o descritor completo, e não apenas o valor,
  porque propriedades como navigator podem ser implementadas
  pelo ambiente através de getters ou flags específicas.
*/

function replaceGlobalProperty(propertyName, value) {
  const originalDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    propertyName,
  );

  Object.defineProperty(globalThis, propertyName, {
    configurable: true,
    writable: true,
    value,
  });

  return () => {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, propertyName, originalDescriptor);

      return;
    }

    delete globalThis[propertyName];
  };
}

/*
  Cria apenas a parte do DOM necessária para testar o
  fallback.

  Não precisamos simular um navegador completo: o objetivo
  é fornecer exatamente as APIs utilizadas por clipboard.js.
*/

function createFallbackDocument({ copyResult = true } = {}) {
  const state = {
    appended: false,
    removed: false,

    textareaFocused: false,
    textareaSelected: false,

    selectionStart: null,
    selectionEnd: null,

    executedCommand: null,

    previousFocusRestored: false,

    textarea: null,
  };

  const previouslyFocusedElement = {
    focus() {
      state.previousFocusRestored = true;
    },
  };

  const documentMock = {
    activeElement: previouslyFocusedElement,

    body: {
      appendChild(element) {
        state.appended = true;
        state.textarea = element;
      },
    },

    createElement(tagName) {
      if (tagName !== "textarea") {
        throw new Error(`Unexpected element requested: ${tagName}`);
      }

      const attributes = new Map();

      return {
        value: "",

        style: {},

        tabIndex: 0,

        setAttribute(name, value) {
          attributes.set(name, value);
        },

        getAttribute(name) {
          return attributes.get(name);
        },

        focus() {
          state.textareaFocused = true;
        },

        select() {
          state.textareaSelected = true;
        },

        setSelectionRange(start, end) {
          state.selectionStart = start;
          state.selectionEnd = end;
        },

        remove() {
          state.removed = true;
        },
      };
    },

    execCommand(command) {
      state.executedCommand = command;

      return copyResult;
    },
  };

  return {
    documentMock,
    state,
  };
}

/* =========================================================
   02. VALIDAÇÃO
   ========================================================= */

test("rejeita texto vazio", async () => {
  await assert.rejects(() => copyTextToClipboard(""), TypeError);
});

test("rejeita valores que não sejam strings", async () => {
  const invalidValues = [null, undefined, 123, true, {}, []];

  for (const value of invalidValues) {
    await assert.rejects(() => copyTextToClipboard(value), TypeError);
  }
});

/* =========================================================
   03. CLIPBOARD API MODERNA
   ========================================================= */

test("usa navigator.clipboard.writeText quando disponível", async () => {
  let receivedText = null;

  const restoreNavigator = replaceGlobalProperty("navigator", {
    clipboard: {
      async writeText(text) {
        receivedText = text;
      },
    },
  });

  /*
      Se a estratégia moderna funcionar, document nem
      precisa existir.
    */

  const restoreDocument = replaceGlobalProperty("document", undefined);

  try {
    await copyTextToClipboard("SecurePassword123!");

    assert.equal(receivedText, "SecurePassword123!");
  } finally {
    restoreNavigator();
    restoreDocument();
  }
});

/* =========================================================
   04. FALLBACK DIRETO
   ========================================================= */

test("usa o fallback quando navigator.clipboard não está disponível", async () => {
  const { documentMock, state } = createFallbackDocument();

  const restoreNavigator = replaceGlobalProperty("navigator", {});

  const restoreDocument = replaceGlobalProperty("document", documentMock);

  try {
    const password = "FallbackPassword123!";

    await copyTextToClipboard(password);

    assert.equal(state.executedCommand, "copy");

    assert.equal(state.textarea.value, password);

    assert.equal(state.appended, true);

    assert.equal(state.textareaFocused, true);

    assert.equal(state.textareaSelected, true);

    assert.equal(state.selectionStart, 0);

    assert.equal(state.selectionEnd, password.length);

    assert.equal(state.removed, true);

    assert.equal(state.previousFocusRestored, true);
  } finally {
    restoreNavigator();
    restoreDocument();
  }
});

/* =========================================================
   05. RECUPERAÇÃO DA API MODERNA
   ========================================================= */

test("usa o fallback quando navigator.clipboard.writeText falha", async () => {
  const { documentMock, state } = createFallbackDocument();

  const restoreNavigator = replaceGlobalProperty("navigator", {
    clipboard: {
      async writeText() {
        throw new Error("Modern clipboard failed.");
      },
    },
  });

  const restoreDocument = replaceGlobalProperty("document", documentMock);

  try {
    await copyTextToClipboard("RecoveryPassword123!");

    assert.equal(state.executedCommand, "copy");

    assert.equal(state.removed, true);

    assert.equal(state.previousFocusRestored, true);
  } finally {
    restoreNavigator();
    restoreDocument();
  }
});

/* =========================================================
   06. FALHA DO FALLBACK
   ========================================================= */

test("rejeita quando document.execCommand informa falha", async () => {
  const { documentMock, state } = createFallbackDocument({
    copyResult: false,
  });

  const restoreNavigator = replaceGlobalProperty("navigator", {});

  const restoreDocument = replaceGlobalProperty("document", documentMock);

  try {
    await assert.rejects(
      () => copyTextToClipboard("SecurePassword123!"),
      /Fallback clipboard copy failed/,
    );

    /*
        Mesmo em caso de erro, finally precisa remover o
        textarea temporário e restaurar o foco.
      */

    assert.equal(state.removed, true);

    assert.equal(state.previousFocusRestored, true);
  } finally {
    restoreNavigator();
    restoreDocument();
  }
});

/* =========================================================
   07. NENHUMA ESTRATÉGIA DISPONÍVEL
   ========================================================= */

test("rejeita quando nenhuma estratégia de clipboard está disponível", async () => {
  const restoreNavigator = replaceGlobalProperty("navigator", {});

  const restoreDocument = replaceGlobalProperty("document", undefined);

  try {
    await assert.rejects(
      () => copyTextToClipboard("SecurePassword123!"),
      /Fallback clipboard API is unavailable/,
    );
  } finally {
    restoreNavigator();
    restoreDocument();
  }
});

/* =========================================================
   08. FALHA TOTAL APÓS API MODERNA
   ========================================================= */

test("preserva as duas causas quando API moderna e fallback falham", async () => {
  const modernError = new Error("Modern clipboard failed.");

  const restoreNavigator = replaceGlobalProperty("navigator", {
    clipboard: {
      async writeText() {
        throw modernError;
      },
    },
  });

  const restoreDocument = replaceGlobalProperty("document", undefined);

  try {
    await assert.rejects(
      () => copyTextToClipboard("SecurePassword123!"),
      (error) => {
        assert.ok(error instanceof AggregateError);

        assert.equal(error.message, "Clipboard copy failed.");

        assert.equal(error.errors.length, 2);

        assert.equal(error.errors[0], modernError);

        assert.match(
          error.errors[1].message,
          /Fallback clipboard API is unavailable/,
        );

        return true;
      },
    );
  } finally {
    restoreNavigator();
    restoreDocument();
  }
});