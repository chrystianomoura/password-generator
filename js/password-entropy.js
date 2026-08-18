"use strict";

import { getActiveCharacterSets } from "./password-character-sets.js";

/* =========================================================
   PASSWORD GENERATOR — ENTROPIA
   ---------------------------------------------------------
   Responsabilidade única:
   calcular o espaço exato de resultados válidos
   produzido pela configuração do gerador.

   Como o motor utiliza amostragem uniforme entre todas
   as senhas válidas, podemos calcular:

       H = log2(total de senhas válidas)

   O número de senhas válidas é obtido através do
   princípio de inclusão-exclusão.

   Este módulo:
   - não acessa o DOM;
   - não gera senhas;
   - não armazena dados;
   - não realiza requisições.
   ========================================================= */

/* =========================================================
   01. VALIDAÇÃO
   ========================================================= */

function validateOptions(options) {
  if (!options || typeof options !== "object") {
    throw new TypeError("Password options must be provided.");
  }

  if (!Number.isSafeInteger(options.length) || options.length <= 0) {
    throw new RangeError("Password length must be a positive integer.");
  }
}

/* =========================================================
   02. CONTAGEM EXATA DO ESPAÇO VÁLIDO
   ========================================================= */

/*
  Inclusão-exclusão.

  Para cada subconjunto de categorias, contamos quantas
  strings seriam possíveis se aquelas categorias estivessem
  completamente ausentes.

  Exemplo simplificado:

      válidas =
        todas
        - sem uppercase
        - sem numbers
        + sem uppercase e numbers

  BigInt evita perda de precisão durante a contagem.
*/

export function countValidPasswords(options) {
  validateOptions(options);

  const activeSets = getActiveCharacterSets(options);

  if (activeSets.length === 0) {
    return 0n;
  }

  if (options.length < activeSets.length) {
    return 0n;
  }

  const setSizes = activeSets.map(({ characters }) => characters.length);

  const totalPoolSize = setSizes.reduce((total, size) => total + size, 0);

  const subsetCount = 2 ** activeSets.length;

  let validCount = 0n;

  /*
    Cada bit da máscara indica uma categoria
    que será considerada ausente.
  */

  for (let mask = 0; mask < subsetCount; mask += 1) {
    let excludedSize = 0;
    let excludedCategories = 0;

    for (let index = 0; index < setSizes.length; index += 1) {
      if (mask & (1 << index)) {
        excludedSize += setSizes[index];

        excludedCategories += 1;
      }
    }

    const remainingPoolSize = totalPoolSize - excludedSize;

    const combinations = BigInt(remainingPoolSize) ** BigInt(options.length);

    /*
      Subconjunto de tamanho par:
      soma.

      Subconjunto de tamanho ímpar:
      subtrai.
    */

    if (excludedCategories % 2 === 0) {
      validCount += combinations;
    } else {
      validCount -= combinations;
    }
  }

  return validCount;
}

/* =========================================================
   03. LOG2 DE BIGINT
   ========================================================= */

/*
  Não convertemos o BigInt inteiro diretamente para Number.

  Extraímos apenas os bits mais significativos quando
  necessário, mantendo precisão suficiente para a
  apresentação da entropia em ponto flutuante.
*/

function log2BigInt(value) {
  if (typeof value !== "bigint" || value <= 0n) {
    throw new RangeError("Value must be a positive BigInt.");
  }

  const binary = value.toString(2);

  const bitLength = binary.length;

  /*
    Valores pequenos podem ser convertidos diretamente.
  */

  if (bitLength <= 53) {
    return Math.log2(Number(value));
  }

  /*
    Conservamos os 53 bits mais significativos.

    Se:

      value ≈ leading × 2^shift

    então:

      log2(value)
        = log2(leading) + shift
  */

  const shift = bitLength - 53;

  const leading = Number(value >> BigInt(shift));

  return Math.log2(leading) + shift;
}

/* =========================================================
   04. ENTROPIA
   ========================================================= */

export function calculateEntropy(options) {
  const validPasswordCount = countValidPasswords(options);

  if (validPasswordCount <= 0n) {
    return 0;
  }

  return log2BigInt(validPasswordCount);
}