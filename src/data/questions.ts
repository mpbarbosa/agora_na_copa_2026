import type { TriviaQuestion } from "../types";

export const triviaQuestions: TriviaQuestion[] = [
  {
    id: "host-countries",
    category: "Sedes",
    question: "Quantos países sediam juntos a Copa do Mundo de 2026?",
    options: ["2", "3", "4", "5"],
    correctOptionIndex: 1,
    explanation:
      "A edição de 2026 será dividida entre Estados Unidos, México e Canadá.",
  },
  {
    id: "metlife-final",
    category: "Estádios",
    question: "Qual estádio recebe a grande final no chaveamento do app?",
    options: [
      "BC Place de Vancouver",
      "Estádio da Cidade do México",
      "MetLife Stadium",
      "Arrowhead Stadium",
    ],
    correctOptionIndex: 2,
    explanation:
      "O mata-mata termina no MetLife Stadium, em East Rutherford, palco da final.",
  },
  {
    id: "group-format",
    category: "Formato",
    question: "Quantos grupos de quatro seleções aparecem na fase inicial desta edição?",
    options: ["8", "10", "12", "16"],
    correctOptionIndex: 2,
    explanation:
      "O modelo adotado no app usa 12 grupos de quatro seleções para a Copa de 2026.",
  },
  {
    id: "broadcast-core",
    category: "Transmissão",
    question: "Qual aba do app concentra o guia de onde assistir e o feed de lances?",
    options: ["Notícias", "Ao Vivo", "Fan Zone", "Estádios"],
    correctOptionIndex: 1,
    explanation:
      "A aba Ao Vivo reúne o cronômetro, as emissoras e os lances oficiais da FIFA.",
  },
];
