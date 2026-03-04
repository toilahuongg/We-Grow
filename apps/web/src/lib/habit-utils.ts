const habitIcons: Record<string, string> = {
  meditation: "🧘",
  exercise: "💪",
  reading: "📚",
  water: "💧",
  "social-media": "📵",
  journaling: "✍️",
  sleep: "😴",
  learning: "🎓",
  default: "🌟",
};

export function getHabitIcon(title: string): string {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes("meditation") || lowerTitle.includes("mindful")) return habitIcons.meditation!;
  if (lowerTitle.includes("exercise") || lowerTitle.includes("workout")) return habitIcons.exercise!;
  if (lowerTitle.includes("read") || lowerTitle.includes("book")) return habitIcons.reading!;
  if (lowerTitle.includes("water") || lowerTitle.includes("hydrate")) return habitIcons.water!;
  if (lowerTitle.includes("social") || lowerTitle.includes("phone")) return habitIcons["social-media"]!;
  if (lowerTitle.includes("journal") || lowerTitle.includes("write")) return habitIcons.journaling!;
  if (lowerTitle.includes("sleep") || lowerTitle.includes("bed")) return habitIcons.sleep!;
  if (lowerTitle.includes("learn") || lowerTitle.includes("study")) return habitIcons.learning!;
  return habitIcons.default!;
}
