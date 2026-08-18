"use strict";

import { getActiveCharacterSets } from "./password-character-sets.js";

/* =========================================================
   PASSWORD GENERATOR — ENTROPIA
   ---------------------------------------------------------
   Responsabilidade única:
   calcular o espaço exato de resultados válidos produzido
   pela configuração atual do gerador.

   Como o motor trabalha com distribuição uniforme entre
   todas as senhas válidas, a entropia é:

       H = log2(N)

   onde N representa a quantidade total de senhas válidas.

   Como cada categoria ativa precisa aparecer pelo menos uma
   vez, N não pode ser obtido apenas por:

       tamanhoDoPool ^ comprimento

   Em vez disso, utilizamos o princípio de
   inclusão-exclusão.

   Este módulo:
   - não acessa o DOM;
   - não gera senhas;
   - não altera configurações;
   - não mantém estado;
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
   ---------------------------------------------------------
   O princípio de inclusão-exclusão remove da contagem todas
   as strings que deixariam de conter alguma categoria
   obrigatória.

   Exemplo com uppercase + numbers:

       válidas =
         todas
         - sem uppercase
         - sem numbers
         + sem uppercase e sem numbers

   O último termo precisa ser adicionado novamente porque foi
   subtraído duas vezes.

   BigInt é utilizado porque o número de combinações cresce
   rapidamente e ultrapassa o limite de precisão de Number.
   ========================================================= */

export function countValidPasswords(options) {
  validateOptions(options);

  const activeSets = getActiveCharacterSets(options);

  /*
    Sem nenhuma categoria ativa não existe senha válida.
  */

  if (activeSets.length === 0) {
    return 0n;
  }

  /*
    Cada categoria ativa precisa aparecer pelo menos uma vez.

    Portanto, uma senha menor que a quantidade de categorias
    nunca consegue satisfazer a configuração.
  */

  if (options.length < activeSets.length) {
    return 0n;
  }

  /*
    Para inclusão-exclusão precisamos apenas do tamanho de
    cada conjunto, não dos caracteres individuais.
  */

  const setSizes = activeSets.map(({ characters }) => characters.length);

  const totalPoolSize = setSizes.reduce((total, size) => total + size, 0);

  /*
    Com n categorias existem 2^n subconjuntos possíveis.

    Cada subconjunto representa uma combinação de categorias
    que serão consideradas ausentes naquele termo da fórmula.
  */

  const subsetCount = 2 ** activeSets.length;

  let validCount = 0n;

  /*
    A máscara binária representa o subconjunto atual.

    Exemplo com quatro categorias:

      0000 -> nenhuma excluída
      0001 -> exclui categoria 0
      0010 -> exclui categoria 1
      0011 -> exclui categorias 0 e 1
      ...
  */

  for (let mask = 0; mask < subsetCount; mask += 1) {
    let excludedSize = 0;
    let excludedCategories = 0;

    for (let index = 0; index < setSizes.length; index += 1) {
      const categoryIsExcluded = (mask & (1 << index)) !== 0;

      if (!categoryIsExcluded) {
        continue;
      }

      excludedSize += setSizes[index];

      excludedCategories += 1;
    }

    const remainingPoolSize = totalPoolSize - excludedSize;

    /*
      Quando todas as categorias são excluídas,
      remainingPoolSize pode ser zero.

      0^length é corretamente tratado por BigInt como 0n
      porque length sempre é positivo após a validação.
    */

    const combinations = BigInt(remainingPoolSize) ** BigInt(options.length);

    /*
      Inclusão-exclusão alterna o sinal conforme o tamanho do
      subconjunto:

      quantidade par de exclusões -> soma
      quantidade ímpar de exclusões -> subtrai
    */

    if (excludedCategories % 2 === 0) {
      validCount += combinations;
    } else {
      validCount -= combinations;
    }
  }

  /*
    Matematicamente o resultado não deve ser negativo.

    Esta proteção deixa explícita uma invariável importante
    caso o algoritmo seja alterado no futuro.
  */

  if (validCount < 0n) {
    throw new Error("Valid password count cannot be negative.");
  }

  return validCount;
}

/* =========================================================
   03. LOG2 DE BIGINT
   ---------------------------------------------------------
   Number consegue representar inteiros exatamente apenas
   até 53 bits de precisão.

   Converter diretamente um BigInt muito grande para Number
   poderia perder informação antes do cálculo do logaritmo.

   Por isso utilizamos apenas os bits mais significativos
   quando o valor excede esse limite.
   ========================================================= */

function log2BigInt(value) {
  if (typeof value !== "bigint" || value <= 0n) {
    throw new RangeError("Value must be a positive BigInt.");
  }

  const binary = value.toString(2);

  const bitLength = binary.length;

  /*
    Valores com até 53 bits podem ser convertidos para Number
    sem perda de precisão inteira.
  */

  if (bitLength <= 53) {
    return Math.log2(Number(value));
  }

  /*
    Mantemos os 53 bits mais significativos.

    Se:

      value ≈ leading × 2^shift

    então:

      log2(value)
        ≈ log2(leading) + shift

    A aproximação é mais do que suficiente para a exibição
    da entropia em ponto flutuante.
  */

  const shift = bitLength - 53;

  const leading = Number(value >> BigInt(shift));

  return Math.log2(leading) + shift;
}

/* =========================================================
   04. ENTROPIA
   ---------------------------------------------------------
   Esta é a função de alto nível utilizada pela aplicação.

   Primeiro contamos o número exato de senhas válidas e,
   depois, aplicamos log2 para converter esse espaço em bits
   de entropia.
   ========================================================= */

export function calculateEntropy(options) {
  const validPasswordCount = countValidPasswords(options);

  if (validPasswordCount <= 0n) {
    return 0;
  }

  return log2BigInt(validPasswordCount);
}