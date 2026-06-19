import type { SkillLevel } from "@/lib/types";

// Illustrative sample content for the marketing landing page.
// Not real activity — no users, reviews, counts, or partnerships implied.

export type Fit = "Good fit" | "A step up" | "More casual";

export interface SampleGame {
  id: string;
  title: string;
  court: string;
  area: string;
  when: string;
  gameType: "3v3" | "4v4" | "5v5" | "Open Run";
  current: number;
  max: number;
  competitiveness: "Casual" | "Competitive" | "Highly Competitive";
  skillMin: SkillLevel;
  skillMax: SkillLevel;
  distanceMi: number;
  mapX: number;
  mapY: number;
  fit: Fit;
  notes: string;
}

export const sampleGames: SampleGame[] = [
  {
    id: "riverside-sunset",
    title: "Sunset Run",
    court: "Riverside Park Court",
    area: "Riverside",
    when: "Today · 6:30 PM",
    gameType: "Open Run",
    current: 8,
    max: 10,
    competitiveness: "Competitive",
    skillMin: "Intermediate",
    skillMax: "Advanced",
    distanceMi: 0.6,
    mapX: 32,
    mapY: 40,
    fit: "Good fit",
    notes: "Full-court fives, winners stay on. Steady regulars.",
  },
  {
    id: "eastside-weeknight",
    title: "Weeknight Fives",
    court: "Eastside Rec Center",
    area: "Eastside",
    when: "Tomorrow · 7:00 PM",
    gameType: "5v5",
    current: 6,
    max: 10,
    competitiveness: "Highly Competitive",
    skillMin: "Advanced",
    skillMax: "Elite",
    distanceMi: 1.4,
    mapX: 68,
    mapY: 28,
    fit: "A step up",
    notes: "Fast, physical, called lines. Bring your best.",
  },
  {
    id: "lincoln-morning",
    title: "Morning Shootaround",
    court: "Lincoln Schoolyard",
    area: "Midtown",
    when: "Sat · 9:00 AM",
    gameType: "3v3",
    current: 4,
    max: 6,
    competitiveness: "Casual",
    skillMin: "Beginner",
    skillMax: "Intermediate",
    distanceMi: 0.9,
    mapX: 50,
    mapY: 62,
    fit: "More casual",
    notes: "Relaxed half-court. Good for warming up the weekend.",
  },
  {
    id: "harbor-indoor",
    title: "Indoor Run",
    court: "Harbor Gym",
    area: "Harborfront",
    when: "Sun · 11:00 AM",
    gameType: "5v5",
    current: 9,
    max: 10,
    competitiveness: "Competitive",
    skillMin: "Intermediate",
    skillMax: "Advanced",
    distanceMi: 2.1,
    mapX: 22,
    mapY: 72,
    fit: "Good fit",
    notes: "Indoor hardwood, consistent group, two courts running.",
  },
  {
    id: "maple-afterwork",
    title: "After-Work Fours",
    court: "Maple Street Court",
    area: "Westgate",
    when: "Thu · 6:00 PM",
    gameType: "4v4",
    current: 5,
    max: 8,
    competitiveness: "Casual",
    skillMin: "Beginner",
    skillMax: "Intermediate",
    distanceMi: 1.1,
    mapX: 78,
    mapY: 58,
    fit: "More casual",
    notes: "Easy games to unwind. New players welcome.",
  },
  {
    id: "downtown-open",
    title: "Open Gym",
    court: "Downtown Community Center",
    area: "Downtown",
    when: "Fri · 7:30 PM",
    gameType: "Open Run",
    current: 7,
    max: 12,
    competitiveness: "Competitive",
    skillMin: "Intermediate",
    skillMax: "Elite",
    distanceMi: 1.8,
    mapX: 44,
    mapY: 20,
    fit: "Good fit",
    notes: "Rotating teams, mixed levels, long evening of runs.",
  },
];

export const steps = [
  {
    title: "Set your level",
    body: "Share your skill, position, and how competitive you want to play.",
  },
  {
    title: "See games that fit",
    body: "Browse runs nearby, each labeled for how well it matches you.",
  },
  {
    title: "Join and show up",
    body: "Save your spot, get the time and location, and see who else is in.",
  },
];

export const trust = [
  {
    title: "Skill range on every game",
    body: "Each run lists the levels it is meant for, so there are no surprises on the court.",
  },
  {
    title: "Competitiveness up front",
    body: "Casual, Competitive, or Highly Competitive — you know the speed before you arrive.",
  },
  {
    title: "Spots and player counts",
    body: "See how full a run is and how many spots are left.",
  },
  {
    title: "Attendance you can see",
    body: "Hosts track who is coming and who showed, so runs stay reliable.",
  },
];

export const skillLevels = [
  { name: "Beginner", note: "Learning the game, building fundamentals." },
  { name: "Intermediate", note: "Comfortable holding your own in a regular run." },
  { name: "Advanced", note: "Strong, consistent, competitive play." },
  { name: "Elite", note: "High-level, fast, physical basketball." },
];

export const competitivenessLevels = [
  { name: "Casual", note: "Relaxed and friendly, low pressure." },
  { name: "Competitive", note: "Real games, played to win." },
  { name: "Highly Competitive", note: "Fast, physical, serious runs." },
];
