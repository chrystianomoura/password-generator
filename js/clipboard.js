"use strict";

/* =========================================================
   PASSWORD GENERATOR — CLIPBOARD
   ---------------------------------------------------------
   Responsabilidade única:
   copiar texto para a área de transferência.

   Estratégia:
   1. prioriza navigator.clipboard.writeText();
   2. utiliza document.execCommand("copy") como fallback;
   3. lança erro quando nenhuma estratégia consegue copiar.

   Este módulo:
   - não conhece a interface;
   - não altera botões;
   - não exibe mensagens;
   - não armazena conteúdo;
   - não decide o que deve ser copiado.

   A camada que utiliza este módulo continua responsável
   por fornecer o texto e tratar sucesso ou falha.
   ========================================================= */

/* =========================================================
   01. FALLBACK DE CÓPIA
   ---------------------------------------------------------
   O fallback cria temporariamente um <textarea>, seleciona
   seu conteúdo e solicita a cópia através de execCommand().

   O elemento existe somente durante a operação e é removido
   mesmo quando ocorre uma exceção.
   ========================================================= */

function copyWithFallback(text) {
  /*
    Este módulo também é importado por testes executados fora
    do navegador.

    Por isso verificamos explicitamente a existência de
    document antes de acessar APIs do DOM.
  */

  if (
    typeof document === "undefined" ||
    !document.body ||
    typeof document.execCommand !== "function"
  ) {
    throw new Error("Fallback clipboard API is unavailable.");
  }

  /*
    Guardamos o elemento atualmente focado porque o textarea
    precisa receber foco para que seu conteúdo possa ser
    selecionado.

    Depois da operação tentamos devolver o foco ao elemento
    anterior, evitando uma mudança desnecessária na interface.
  */

  const previouslyFocusedElement = document.activeElement;

  const temporaryTextarea = document.createElement("textarea");

  temporaryTextarea.value = text;

  /*
    readonly evita qualquer edição acidental.

    aria-hidden impede que o elemento temporário seja tratado
    como conteúdo relevante por tecnologias assistivas.

    tabIndex = -1 o mantém fora da navegação por Tab, embora
    continue podendo receber foco programaticamente.
  */

  temporaryTextarea.setAttribute("readonly", "");

  temporaryTextarea.setAttribute("aria-hidden", "true");

  temporaryTextarea.tabIndex = -1;

  /*
    O textarea precisa permanecer no documento para que a
    seleção funcione, mas não deve interferir visualmente
    nem participar do layout.
  */

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

    /*
      setSelectionRange reforça explicitamente que todo o
      conteúdo deve participar da seleção.
    */

    temporaryTextarea.setSelectionRange(0, temporaryTextarea.value.length);

    const copied = document.execCommand("copy");

    if (!copied) {
      throw new Error("Fallback clipboard copy failed.");
    }
  } finally {
    /*
      finally garante a limpeza mesmo quando execCommand()
      falha ou lança uma exceção.
    */

    temporaryTextarea.remove();

    /*
      Restauramos o foco somente quando o elemento anterior
      ainda possui uma função focus() utilizável.

      Essa verificação também mantém o código amigável a
      ambientes de teste que implementem apenas parte do DOM.
    */

    if (
      previouslyFocusedElement &&
      typeof previouslyFocusedElement.focus === "function"
    ) {
      previouslyFocusedElement.focus();
    }
  }
}

/* =========================================================
   02. CÓPIA PRINCIPAL
   ---------------------------------------------------------
   Esta é a única função pública do módulo.

   Recebe uma string não vazia e tenta copiá-la utilizando
   primeiro a Clipboard API moderna.
   ========================================================= */

export async function copyTextToClipboard(text) {
  /*
    A validação acontece aqui, na fronteira pública do módulo.

    Isso impede que as estratégias internas precisem repetir
    a mesma verificação.
  */

  if (typeof text !== "string" || text.length === 0) {
    throw new TypeError("Clipboard text must be a non-empty string.");
  }

  /*
    globalThis funciona tanto no navegador quanto em outros
    ambientes JavaScript.

    Optional chaining permite consultar navigator.clipboard
    sem provocar erro quando navigator não existe.
  */

  const clipboard = globalThis.navigator?.clipboard;

  /* ==========================
     CLIPBOARD API MODERNA
     ========================== */

  if (clipboard && typeof clipboard.writeText === "function") {
    try {
      await clipboard.writeText(text);

      return;
    } catch (modernClipboardError) {
      /*
        A API moderna ainda pode falhar mesmo quando existe,
        por exemplo por permissões ou políticas do ambiente.

        Nessa situação fazemos uma tentativa final utilizando
        o fallback baseado no DOM.
      */

      try {
        copyWithFallback(text);

        return;
      } catch (fallbackError) {
        /*
          AggregateError preserva as duas causas da falha.

          Isso é útil para debugging: quem consumir o módulo
          consegue saber que tanto a estratégia moderna quanto
          o fallback falharam.
        */

        throw new AggregateError(
          [modernClipboardError, fallbackError],
          "Clipboard copy failed.",
        );
      }
    }
  }

  /* ==========================
     FALLBACK DIRETO
     ========================== */

  /*
    Se navigator.clipboard não estiver disponível, tentamos
    diretamente a estratégia compatível com DOM.
  */

  copyWithFallback(text);
}