"use strict";

/* =========================================================
   PASSWORD GENERATOR — CLIPBOARD
   ---------------------------------------------------------
   Responsabilidade única:
   copiar texto para a área de transferência.

   Estratégia:
   - prioriza navigator.clipboard.writeText();
   - utiliza fallback com document.execCommand("copy");
   - lança erro caso ambas as estratégias falhem.

   Este módulo:
   - não conhece a interface;
   - não altera botões;
   - não mostra mensagens;
   - não armazena conteúdo.
   ========================================================= */

/* =========================================================
   01. FALLBACK DE CÓPIA
   ========================================================= */

function copyWithFallback(text) {
  if (
    typeof document === "undefined" ||
    !document.body ||
    typeof document.execCommand !== "function"
  ) {
    throw new Error("Fallback clipboard API is unavailable.");
  }

  const temporaryTextarea = document.createElement("textarea");

  temporaryTextarea.value = text;

  temporaryTextarea.setAttribute("readonly", "");

  temporaryTextarea.style.position = "fixed";
  temporaryTextarea.style.top = "0";
  temporaryTextarea.style.left = "0";
  temporaryTextarea.style.width = "1px";
  temporaryTextarea.style.height = "1px";
  temporaryTextarea.style.opacity = "0";
  temporaryTextarea.style.pointerEvents = "none";

  document.body.appendChild(temporaryTextarea);

  try {
    temporaryTextarea.focus();
    temporaryTextarea.select();
    temporaryTextarea.setSelectionRange(0, temporaryTextarea.value.length);

    const copied = document.execCommand("copy");

    if (!copied) {
      throw new Error("Fallback clipboard copy failed.");
    }
  } finally {
    temporaryTextarea.remove();
  }
}

/* =========================================================
   02. CÓPIA PRINCIPAL
   ========================================================= */

export async function copyTextToClipboard(text) {
  if (typeof text !== "string" || text.length === 0) {
    throw new TypeError("Clipboard text must be a non-empty string.");
  }

  const clipboard = globalThis.navigator?.clipboard;

  if (clipboard && typeof clipboard.writeText === "function") {
    try {
      await clipboard.writeText(text);
      return;
    } catch (modernClipboardError) {
      /*
        A API moderna pode falhar por:
        - permissão;
        - política do navegador;
        - contexto não seguro;
        - indisponibilidade temporária.

        Nesse caso tentamos o fallback.
      */

      try {
        copyWithFallback(text);
        return;
      } catch (fallbackError) {
        throw new AggregateError(
          [modernClipboardError, fallbackError],
          "Clipboard copy failed.",
        );
      }
    }
  }

  copyWithFallback(text);
}