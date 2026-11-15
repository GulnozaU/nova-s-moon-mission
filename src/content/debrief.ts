import type { GameState } from "../types";

export type CauseEffect = {
  day: number;
  cause: string;
  effect: string;
};

export type QuizItem = {
  id: string;
  question: string;
  choices: string[];
  answerIndex: number;
  source: string;
};

/** Build cause→effect lines from the player's own day log. */
export function causeEffectFromLog(state: GameState): CauseEffect[] {
  const lines: CauseEffect[] = [];
  const log = state.log;

  for (let i = 0; i < log.length; i++) {
    const day = log[i]!;
    if (!day.powerSpent.recycler) {
      const later = log.find((d) => d.day >= day.day + 3 && d.water < day.water);
      lines.push({
        day: day.day,
        cause: `On Day ${day.day} you left the water cleaner off.`,
        effect: later
          ? `By Day ${later.day} water was lower, so hard choices got harder.`
          : "Water fell faster that day.",
      });
    }
    if (day.sheltered) {
      lines.push({
        day: day.day,
        cause: `On Day ${day.day} you chose shelter.`,
        effect: "Crew safety risk rose less, but outdoor science paused.",
      });
    }
    if (day.eventId === "solar-storm" && !day.sheltered) {
      lines.push({
        day: day.day,
        cause: `On Day ${day.day} you stayed out in a storm.`,
        effect: "Crew safety risk jumped from storm energy.",
      });
    }
    if (day.powerSpent.greenhouse) {
      lines.push({
        day: day.day,
        cause: `On Day ${day.day} you ran the greenhouse.`,
        effect: "You spent water to gain a little oxygen and science.",
      });
    }
  }

  // Deduplicate by cause text; keep first 4
  const seen = new Set<string>();
  const unique: CauseEffect[] = [];
  for (const line of lines) {
    if (seen.has(line.cause)) continue;
    seen.add(line.cause);
    unique.push(line);
    if (unique.length >= 4) break;
  }

  if (unique.length === 0) {
    unique.push({
      day: 1,
      cause: "You kept the base running each day.",
      effect: "Power, water, and air choices stacked over time.",
    });
  }
  return unique;
}

/** 3-question check grounded in what just happened. */
export function quizFromState(state: GameState, won: boolean): QuizItem[] {
  const turnedOffRecycler = state.log.some((d) => !d.powerSpent.recycler);
  const sheltered = state.log.some((d) => d.sheltered);
  const stormDay = state.log.find((d) => d.eventId === "solar-storm");

  return [
    {
      id: "q-water",
      question: "What happens if the water cleaner stays off?",
      choices: [
        "Water lasts longer",
        "Water falls faster",
        "Oxygen doubles",
      ],
      answerIndex: 1,
      source: "Game rule (ASSUMPTION): cleaner on uses 1 water; off uses 4.",
    },
    {
      id: "q-shelter",
      question: "What does shelter do on a storm day?",
      choices: [
        "Lowers storm risk, pauses outdoor science",
        "Gives free power",
        "Fills the water tanks",
      ],
      answerIndex: 0,
      source: "SPEC storm choice: shelter cuts exposure and science that day.",
    },
    {
      id: "q-you",
      question: stormDay
        ? `On your storm day you chose ${stormDay.sheltered ? "shelter" : "to stay out"}. What is true?`
        : turnedOffRecycler
          ? "You turned the water cleaner off at least once. What is true?"
          : sheltered
            ? "You used shelter at least once. What is true?"
            : won
              ? "You finished 10 days. What helped most?"
              : "Your mission stopped early. What is a fair lesson?",
      choices: stormDay
        ? stormDay.sheltered
          ? [
              "You traded science for more safety",
              "You gained free materials",
              "Storms never matter inside",
            ]
          : [
              "You kept science and took more storm risk",
              "Shelter happened automatically",
              "Water tanks refilled",
            ]
        : turnedOffRecycler
          ? [
              "That choice can make later days tighter",
              "It adds free oxygen",
              "It stops all storms",
            ]
          : sheltered
            ? [
                "Shelter can protect people when storms arrive",
                "Shelter fills the battery",
                "Shelter is always free",
              ]
            : won
              ? [
                  "Balancing power, water, and safety day by day",
                  "Ignoring the weather card",
                  "Turning every machine off",
                ]
              : [
                  "Watch water, air, and storm days more closely",
                  "Never use the water cleaner",
                  "Storms are only story",
                ],
      answerIndex: 0,
      source: "Built from your mission log.",
    },
  ];
}
