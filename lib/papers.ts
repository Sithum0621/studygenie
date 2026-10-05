import { localStore } from "./local-store";
import type { PaperItem, PaperKind, QuizQuestion } from "./types";

function q(
  id: string,
  subject: string,
  prompt: string,
  options: string[],
  answerIndex: number,
  explanation: string,
): QuizQuestion {
  return { id, subject, prompt, options, answerIndex, explanation };
}

function paper(
  id: string,
  kind: PaperKind,
  title: string,
  subject: string,
  year: string,
  questions: QuizQuestion[],
): PaperItem {
  return {
    id,
    kind,
    title,
    subject,
    year,
    questions,
    createdAt: "2024-01-01T00:00:00.000Z",
  };
}

export function seedPapers(): PaperItem[] {
  return [
    paper("past-maths-2024", "past", "Maths 2024", "Maths", "2024", [
      q(
        "pm1",
        "Maths",
        "1/2 + 1/4 = ?",
        ["1/6", "2/6", "3/4", "1/4"],
        2,
        "1/2 = 2/4. 2/4 + 1/4 = 3/4.",
      ),
      q(
        "pm2",
        "Maths",
        "12 × 0.5 = ?",
        ["6", "12", "24", "0.5"],
        0,
        "12 × 1/2 = 6.",
      ),
      q(
        "pm3",
        "Maths",
        "Angle sum of a triangle?",
        ["90°", "180°", "270°", "360°"],
        1,
        "Triangle එකේ angles 180°.",
      ),
    ]),
    paper("past-science-2023", "past", "Science 2023", "Science", "2023", [
      q(
        "ps1",
        "Science",
        "Cell එකේ energy එක හදන්නේ?",
        ["Nucleus", "Mitochondria", "Ribosome", "Vacuole"],
        1,
        "Mitochondria තමයි power house එක.",
      ),
      q(
        "ps2",
        "Science",
        "Photosynthesis එකට ඕන වායුව?",
        ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"],
        2,
        "CO2 ගෙන oxygen පිට කරනවා.",
      ),
      q(
        "ps3",
        "Science",
        "Water එකේ formula එක?",
        ["CO2", "H2O", "NaCl", "O2"],
        1,
        "H2O.",
      ),
    ]),
    paper("past-english-2022", "past", "English 2022", "English", "2022", [
      q(
        "pe1",
        "English",
        "She ___ to school every day.",
        ["go", "goes", "going", "gone"],
        1,
        "She + goes.",
      ),
      q(
        "pe2",
        "English",
        "Opposite of 'hot'?",
        ["warm", "cold", "heat", "fire"],
        1,
        "hot ↔ cold.",
      ),
      q(
        "pe3",
        "English",
        "A ___ of books.",
        ["flock", "pack", "library", "pile"],
        3,
        "pile of books.",
      ),
    ]),
    paper("past-maths-2023", "past", "Maths 2023", "Maths", "2023", [
      q(
        "pm23-1",
        "Maths",
        "x + 5 = 12 නම් x = ?",
        ["7", "5", "17", "12"],
        0,
        "12 − 5 = 7.",
      ),
      q(
        "pm23-2",
        "Maths",
        "Prime number එකක්?",
        ["4", "9", "11", "15"],
        2,
        "11 divide වෙන්නේ 1 සහ 11 විතරයි.",
      ),
      q(
        "pm23-3",
        "Maths",
        "Rectangle එකේ length 6, width 3. Area එක?",
        ["9", "18", "12", "36"],
        1,
        "6 × 3 = 18.",
      ),
    ]),
    paper("past-science-2024", "past", "Science 2024", "Science", "2024", [
      q(
        "ps24-1",
        "Science",
        "Newton ගේ පළමු නියමය කියන්නේ?",
        ["F = ma", "Inertia", "Action-reaction", "Gravity"],
        1,
        "Force නැත්නම් motion එක වෙනස් වෙන්නේ නැහැ — inertia.",
      ),
      q(
        "ps24-2",
        "Science",
        "Light එකේ speed වැඩිම medium එක?",
        ["Water", "Glass", "Air", "Vacuum"],
        3,
        "Vacuum එකේ light වේගය වැඩියි.",
      ),
      q(
        "ps24-3",
        "Science",
        "Acid එකක් pH අගය?",
        ["7", "14", "3", "10"],
        2,
        "Acid නම් pH 7ට අඩුයි.",
      ),
    ]),
    paper("past-english-2024", "past", "English 2024", "English", "2024", [
      q(
        "pe24-1",
        "English",
        "They ___ playing cricket now.",
        ["is", "are", "was", "be"],
        1,
        "They + are + -ing.",
      ),
      q(
        "pe24-2",
        "English",
        "Past tense of 'write'?",
        ["writed", "wrote", "written", "writes"],
        1,
        "write → wrote.",
      ),
      q(
        "pe24-3",
        "English",
        "A person who teaches is a ___.",
        ["teacher", "teach", "taught", "teaching"],
        0,
        "person who teaches = teacher.",
      ),
    ]),
    paper("model-maths-01", "model", "Maths 2025", "Maths", "2025", [
      q(
        "mm1",
        "Maths",
        "Simplify 8/12.",
        ["2/3", "3/4", "4/8", "1/2"],
        0,
        "÷4 → 2/3.",
      ),
      q(
        "mm2",
        "Maths",
        "Perimeter of a square side 5?",
        ["10", "15", "20", "25"],
        2,
        "4 × 5 = 20.",
      ),
      q(
        "mm3",
        "Maths",
        "10% of 50?",
        ["5", "10", "15", "20"],
        0,
        "10/100 × 50 = 5.",
      ),
    ]),
    paper("model-maths-2024", "model", "Maths 2024", "Maths", "2024", [
      q(
        "mm24-1",
        "Maths",
        "3² = ?",
        ["6", "9", "12", "8"],
        1,
        "3 × 3 = 9.",
      ),
      q(
        "mm24-2",
        "Maths",
        "Mean of 2, 4, 6?",
        ["3", "4", "6", "12"],
        1,
        "(2+4+6)/3 = 4.",
      ),
      q(
        "mm24-3",
        "Maths",
        "0.25 as a fraction?",
        ["1/2", "1/4", "1/5", "2/5"],
        1,
        "0.25 = 25/100 = 1/4.",
      ),
    ]),
    paper("model-science-01", "model", "Science 2024", "Science", "2024", [
      q(
        "ms1",
        "Science",
        "Planet nearest to Sun?",
        ["Earth", "Venus", "Mercury", "Mars"],
        2,
        "Mercury.",
      ),
      q(
        "ms2",
        "Science",
        "Solid → liquid?",
        ["Melting", "Freezing", "Condensation", "Evaporation"],
        0,
        "Melting.",
      ),
      q(
        "ms3",
        "Science",
        "Human body pump?",
        ["Lungs", "Heart", "Liver", "Kidney"],
        1,
        "Heart.",
      ),
    ]),
    paper("model-science-2025", "model", "Science 2025", "Science", "2025", [
      q(
        "ms25-1",
        "Science",
        "Sound travel කරන්නේ?",
        ["Vacuum", "Waves in a medium", "Light only", "Magnet"],
        1,
        "Sound එකට medium එකක් ඕන.",
      ),
      q(
        "ms25-2",
        "Science",
        "Blood එකේ oxygen ගේන cells?",
        ["WBC", "Platelets", "RBC", "Plasma"],
        2,
        "Red blood cells.",
      ),
      q(
        "ms25-3",
        "Science",
        "Boiling point of water (1 atm)?",
        ["0°C", "50°C", "100°C", "212°C"],
        2,
        "100°C.",
      ),
    ]),
    paper("model-english-01", "model", "English 2023", "English", "2023", [
      q(
        "me1",
        "English",
        "Plural of 'child'?",
        ["childs", "children", "childes", "child"],
        1,
        "children.",
      ),
      q(
        "me2",
        "English",
        "We ___ football yesterday.",
        ["play", "plays", "played", "playing"],
        2,
        "yesterday → played.",
      ),
      q(
        "me3",
        "English",
        "'Big' comparative?",
        ["bigger", "biggest", "more big", "biger"],
        0,
        "bigger.",
      ),
    ]),
    paper("model-english-2025", "model", "English 2025", "English", "2025", [
      q(
        "me25-1",
        "English",
        "She has ___ her homework.",
        ["do", "did", "done", "doing"],
        2,
        "has + past participle → done.",
      ),
      q(
        "me25-2",
        "English",
        "Opposite of 'early'?",
        ["soon", "late", "fast", "quick"],
        1,
        "early ↔ late.",
      ),
      q(
        "me25-3",
        "English",
        "A ___ of lions.",
        ["flock", "herd", "pride", "pack"],
        2,
        "pride of lions.",
      ),
    ]),
  ];
}

function sortYears(years: string[]) {
  return [...new Set(years)].sort(
    (a, b) => Number(b) - Number(a) || b.localeCompare(a),
  );
}

export function loadPapers() {
  const stored = localStore.getPapers();
  const seeds = seedPapers();
  const seedIds = new Set(seeds.map((seed) => seed.id));
  return [...seeds, ...stored.filter((item) => !seedIds.has(item.id))];
}

export function saveCustomPaper(paperItem: PaperItem) {
  const stored = localStore.getPapers().filter((item) => item.id !== paperItem.id);
  localStore.savePapers([paperItem, ...stored]);
}

export function papersByKind(kind: PaperKind) {
  return loadPapers().filter((item) => item.kind === kind);
}

export function paperSubjects(kind: PaperKind) {
  return [...new Set(papersByKind(kind).map((item) => item.subject))].sort();
}

export function paperYears(kind: PaperKind, subject: string) {
  return sortYears(
    papersByKind(kind)
      .filter((item) => item.subject === subject && item.year)
      .map((item) => item.year as string),
  );
}

export function papersMatching(kind: PaperKind, subject: string, year: string) {
  return papersByKind(kind).filter(
    (item) => item.subject === subject && item.year === year,
  );
}

export function latestAttemptFor(paperId: string) {
  return (
    localStore
      .getPaperAttempts()
      .filter((item) => item.paperId === paperId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
  );
}
