"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import { copyTextToClipboard } from "../js/clipboard.js";

/* =========================================================
   PASSWORD GENERATOR — TESTES DO CLIPBOARD
   ========================================================= */

/* =========================================================
   01. VALIDAÇÃO
   ========================================================= */

test("rejeita texto vazio", async () => {
  await assert.rejects(() => copyTextToClipboard(""), TypeError);
});

test("rejeita valor que não seja string", async () => {
  await assert.rejects(() => copyTextToClipboard(null), TypeError);

  await assert.rejects(() => copyTextToClipboard(123), TypeError);
});

/* =========================================================
   02. API MODERNA
   ========================================================= */

test("usa navigator.clipboard.writeText quando disponível", async () => {
  const originalNavigator = globalThis.navigator;

  let receivedText = null;

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      clipboard: {
        async writeText(text) {
          receivedText = text;
        },
      },
    },
  });

  try {
    await copyTextToClipboard("SecurePassword123!");

    assert.equal(receivedText, "SecurePassword123!");
  } finally {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: originalNavigator,
    });
  }
});

/* =========================================================
   03. FALHA TOTAL
   ========================================================= */

test("rejeita quando nenhuma estratégia de clipboard está disponível", async () => {
  const originalNavigator = globalThis.navigator;

  const originalDocument = globalThis.document;

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {},
  });

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: undefined,
  });

  try {
    await assert.rejects(
      () => copyTextToClipboard("SecurePassword123!"),
      /Fallback clipboard API is unavailable/,
    );
  } finally {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: originalNavigator,
    });

    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: originalDocument,
    });
  }
});