"use strict";

/* =========================================================
   PASSWORD GENERATOR — CLASSIFICAÇÃO DE SEGURANÇA
   ---------------------------------------------------------
   Responsabilidade única:
   converter uma estimativa de entropia em uma classificação
   simples que possa ser apresentada pela interface.

   IMPORTANTE:
   os limites utilizados abaixo são uma heurística interna
   deste projeto.

   Eles não representam níveis oficiais do NIST nem devem
   ser interpretados como garantia absoluta de segurança.

   Este módulo:
   - não calcula entropia;
   - não gera senhas;
   - não acessa o DOM;
   - não conhece a interface visual;
   - não mantém estado mutável.
   ========================================================= */

/* =========================================================
   01. NÍVEIS DE SEGURANÇA
   ---------------------------------------------------------
   Cada nível define:

   minimum
     Quantidade mínima de bits de entropia necessária para
     entrar naquela classificação.

   label
     Texto semântico apresentado pela aplicação.

   bars
     Intensidade visual utilizada pela interface.

   Os níveis precisam permanecer ordenados do menor para o
   maior valor de minimum, pois a avaliação percorre a lista
   nessa ordem.
   ========================================================= */

const LEVELS = Object.freeze([
  Object.freeze({
    minimum: 0,
    label: "Weak",
    bars: 1,
  }),

  Object.freeze({
    minimum: 40,
    label: "Fair",
    bars: 2,
  }),

  Object.freeze({
    minimum: 60,
    label: "Strong",
    bars: 3,
  }),

  Object.freeze({
    minimum: 80,
    label: "Very Strong",
    bars: 4,
  }),

  Object.freeze({
    minimum: 120,
    label: "Exceptional",
    bars: 5,
  }),
]);

/* =========================================================
   02. AVALIAÇÃO
   ---------------------------------------------------------
   Recebe a entropia já calculada por outro módulo e encontra
   o nível mais alto cujo minimum foi atingido.

   Exemplos:

      39 bits  -> Weak
      40 bits  -> Fair
      60 bits  -> Strong
      80 bits  -> Very Strong
      120 bits -> Exceptional

   A função devolve apenas os dados necessários para quem
   consumir a classificação.
   ========================================================= */

export function evaluatePasswordStrength(entropy) {
  /*
    Entropia precisa ser:
    - Number;
    - finita;
    - maior ou igual a zero.

    Isso rejeita valores como:
    NaN, Infinity, strings e números negativos.
  */

  if (typeof entropy !== "number" || !Number.isFinite(entropy) || entropy < 0) {
    throw new TypeError("Entropy must be a non-negative finite number.");
  }

  /*
    Começamos no menor nível possível.

    Como LEVELS está ordenado por minimum crescente, cada
    threshold atingido substitui o anterior. Ao final,
    selectedLevel representa a classificação mais alta
    compatível com a entropia recebida.
  */

  let selectedLevel = LEVELS[0];

  for (const level of LEVELS) {
    if (entropy >= level.minimum) {
      selectedLevel = level;
    }
  }

  /*
    Retornamos um novo objeto em vez do objeto interno de
    LEVELS.

    Assim, detalhes da configuração permanecem encapsulados
    dentro deste módulo.
  */

  return {
    label: selectedLevel.label,
    bars: selectedLevel.bars,
  };
}