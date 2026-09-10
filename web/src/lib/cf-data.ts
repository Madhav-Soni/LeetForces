export type Rank =
  | "newbie"
  | "pupil"
  | "specialist"
  | "expert"
  | "candidate"
  | "master"
  | "grandmaster";

export function rankForRating(rating: number): Rank {
  if (rating < 1200) return "newbie";
  if (rating < 1400) return "pupil";
  if (rating < 1600) return "specialist";
  if (rating < 1900) return "expert";
  if (rating < 2100) return "candidate";
  if (rating < 2400) return "master";
  return "grandmaster";
}

export const rankTextClass: Record<Rank, string> = {
  newbie: "text-rank-newbie",
  pupil: "text-rank-pupil",
  specialist: "text-rank-specialist",
  expert: "text-rank-expert",
  candidate: "text-rank-candidate",
  master: "text-rank-master",
  grandmaster: "text-rank-grandmaster",
};

export const rankLabel: Record<Rank, string> = {
  newbie: "Newbie",
  pupil: "Pupil",
  specialist: "Specialist",
  expert: "Expert",
  candidate: "Candidate Master",
  master: "Master",
  grandmaster: "Grandmaster",
};

export type Problem = {
  id: string;
  name: string;
  tags: string[];
  rating: number;
  solved: number;
  status: "solved" | "attempted" | "none";
};

export const allTags = [
  "implementation",
  "greedy",
  "math",
  "dp",
  "graphs",
  "data structures",
  "binary search",
  "strings",
  "trees",
  "number theory",
  "constructive algorithms",
  "sortings",
  "brute force",
  "geometry",
  "flows",
];

const names = [
  "Balanced Brackets",
  "Toy Train",
  "Sum of Divisors",
  "Palindrome Split",
  "Maximum Subarray Queries",
  "Grid Painting",
  "Tree Diameter Game",
  "Prefix Xor",
  "Sorting Stations",
  "Coin Rows",
  "Two Pointers Again",
  "Segment Merge",
  "Lexicographic Walk",
  "Bitwise Sequences",
  "Minimum Spanning Cost",
  "Modular Inverse Hunt",
  "Stone Piles",
  "Convex Fence",
  "Network Throughput",
  "Digit DP Warmup",
  "Knight Distances",
  "String Periods",
  "Interval Scheduling",
  "Matrix Rotation",
  "Rare Primes",
  "Bracket Repair",
  "Path Compression",
  "Sparse Queries",
  "Chess Tournament",
  "Array Reduction",
  "Hamming Pairs",
  "Sock Matching",
  "Robot Cleaner",
  "Subset Sums",
  "Cycle Detection",
  "Rectangle Union",
  "Card Shuffle",
  "Divisible Pairs",
  "Painting Fence",
  "Tree Coloring",
  "Water Containers",
  "Binary Ladder",
  "Range Assign",
  "Greedy Tickets",
  "Sequence Repair",
  "Median Queries",
  "Alternating Path",
  "Prime Factory",
  "Bus Routes",
  "Final Standings",
  "Odd Even Swap",
  "Hidden Permutation",
  "Weighted Bracket",
  "Cave Exploration",
  "Fast Convolution",
];

const ratings = [800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1900, 2000, 2100, 2300, 2500, 2700];

export const problems: Problem[] = names.map((name, i) => {
  const contest = 1720 + Math.floor(i / 5);
  const letter = String.fromCharCode(65 + (i % 5));
  const rating = ratings[(i * 7) % ratings.length];
  return {
    id: `${contest}${letter}`,
    name,
    tags: [allTags[i % allTags.length], allTags[(i * 3 + 5) % allTags.length]],
    rating,
    solved: 1200 + ((i * 3571) % 42000),
    status: i % 7 === 0 ? "solved" : i % 5 === 0 ? "attempted" : "none",
  };
});

export function ratingBandClass(rating: number): string {
  return rankTextClass[rankForRating(rating)];
}

export type Post = {
  id: number;
  title: string;
  author: string;
  rating: number;
  time: string;
  comments: number;
  votes: number;
  excerpt: string;
};

export const posts: Post[] = [
  {
    id: 1,
    title: "Codeforces Round 1024 (Div. 2) — Editorial",
    author: "nor_editorial",
    rating: 2650,
    time: "3 hours ago",
    comments: 184,
    votes: 312,
    excerpt:
      "Thanks for participating. Below are solutions for all six problems, with an alternative O(n log n) approach for problem D.",
  },
  {
    id: 2,
    title: "Educational Codeforces Round 187 — announcement",
    author: "awoo",
    rating: 2200,
    time: "9 hours ago",
    comments: 96,
    votes: 421,
    excerpt:
      "The round will be rated for Div. 2 participants. Duration 2 hours, 7 problems, extended 12-hour hacking phase afterwards.",
  },
  {
    id: 3,
    title: "On teaching flows without the max-flow min-cut proof",
    author: "adamant",
    rating: 3100,
    time: "yesterday",
    comments: 57,
    votes: 508,
    excerpt:
      "A short note on how I introduce flow problems to beginners using only augmenting-path intuition and small hand-drawn examples.",
  },
  {
    id: 4,
    title: "ICPC 2026 regional mirror — invitation",
    author: "MikeMirzayanov",
    rating: 2900,
    time: "2 days ago",
    comments: 233,
    votes: 764,
    excerpt:
      "The unofficial mirror opens Saturday. Teams of up to three, 5 hours, standings will be published separately from the official scoreboard.",
  },
  {
    id: 5,
    title: "Why your segment tree is slower than it should be",
    author: "pashka",
    rating: 2750,
    time: "3 days ago",
    comments: 141,
    votes: 690,
    excerpt:
      "Cache locality, iterative bottom-up layouts and avoiding recursion overhead — with benchmarks on 2·10^6 queries.",
  },
];

export type Contest = {
  name: string;
  type: string;
  startsAt: string;
  duration: string;
  registered?: number;
};

export const upcomingContests: Contest[] = [
  { name: "Codeforces Round 1026 (Div. 2)", type: "Div. 2", startsAt: "2026-09-12T14:35:00Z", duration: "2:00", registered: 18422 },
  { name: "Educational Codeforces Round 188", type: "Educational", startsAt: "2026-09-15T17:35:00Z", duration: "2:00", registered: 7310 },
  { name: "Codeforces Round 1027 (Div. 1)", type: "Div. 1", startsAt: "2026-09-19T14:05:00Z", duration: "2:15", registered: 3980 },
  { name: "Codeforces Round 1028 (Div. 3)", type: "Div. 3", startsAt: "2026-09-22T14:35:00Z", duration: "2:15", registered: 12045 },
];

export const pastContests = [
  { name: "Codeforces Round 1025 (Div. 2)", type: "Div. 2", date: "Sep 8, 2026", duration: "2:00", participants: 24310 },
  { name: "Educational Codeforces Round 187", type: "Educational", date: "Sep 5, 2026", duration: "2:00", participants: 19882 },
  { name: "Codeforces Round 1024 (Div. 1 + Div. 2)", type: "Div. 1", date: "Sep 2, 2026", duration: "2:30", participants: 31204 },
  { name: "Codeforces Round 1023 (Div. 3)", type: "Div. 3", date: "Aug 28, 2026", duration: "2:15", participants: 27650 },
  { name: "Codeforces Global Round 31", type: "Global", date: "Aug 24, 2026", duration: "3:00", participants: 34990 },
  { name: "Codeforces Round 1022 (Div. 2)", type: "Div. 2", date: "Aug 20, 2026", duration: "2:00", participants: 22118 },
  { name: "April Fools Day Contest 2026", type: "Global", date: "Apr 1, 2026", duration: "2:00", participants: 9820 },
];

export type RatedUser = {
  rank: number;
  handle: string;
  rating: number;
  maxRating: number;
  country: string;
  flag: string;
};

const handles = [
  ["jiangly", "China", "🇨🇳"], ["tourist", "Belarus", "🇧🇾"], ["Benq", "United States", "🇺🇸"],
  ["orzdevinwang", "China", "🇨🇳"], ["Radewoosh", "Poland", "🇵🇱"], ["ecnerwala", "United States", "🇺🇸"],
  ["maroonrk", "Japan", "🇯🇵"], ["ksun48", "Canada", "🇨🇦"], ["Um_nik", "Russia", "🇷🇺"],
  ["cnnfls_csy", "China", "🇨🇳"], ["potato167", "Japan", "🇯🇵"], ["Petr", "Switzerland", "🇨🇭"],
  ["sunset", "China", "🇨🇳"], ["Kevin114514", "China", "🇨🇳"], ["gamegame", "Vietnam", "🇻🇳"],
  ["noimi", "Japan", "🇯🇵"], ["hos.lyric", "Japan", "🇯🇵"], ["fantasy", "China", "🇨🇳"],
  ["Geothermal", "United States", "🇺🇸"], ["antontrygubO_o", "Ukraine", "🇺🇦"],
  ["neal", "United States", "🇺🇸"], ["dario2994", "Italy", "🇮🇹"], ["Errichto", "Poland", "🇵🇱"],
  ["kotatsugame", "Japan", "🇯🇵"], ["SSRS_", "Japan", "🇯🇵"], ["Nyaan", "Japan", "🇯🇵"],
  ["heno239", "Japan", "🇯🇵"], ["Vercingetorix", "France", "🇫🇷"], ["pashka", "Russia", "🇷🇺"],
  ["ITMO_no_sleep", "Russia", "🇷🇺"], ["nor", "India", "🇮🇳"], ["Dominater069", "India", "🇮🇳"],
  ["TheScrasse", "Italy", "🇮🇹"], ["awoo", "Russia", "🇷🇺"], ["Igorjan94", "Russia", "🇷🇺"],
  ["mtsd", "Turkey", "🇹🇷"], ["kaiboy", "Taiwan", "🇹🇼"], ["bicsi", "Romania", "🇷🇴"],
  ["hank55663", "Taiwan", "🇹🇼"], ["arvindf232", "New Zealand", "🇳🇿"],
] as const as [string, string, string][];

export const ratedUsers: RatedUser[] = handles.map(([handle, country, flag], i) => {
  const rating = 3820 - i * 47 - ((i * 13) % 21);
  return {
    rank: i + 1,
    handle,
    rating,
    maxRating: rating + 40 + ((i * 29) % 180),
    country,
    flag,
  };
});

export const recentActions = [
  { handle: "Dominater069", rating: 2600, action: "commented on", target: "Round 1024 Editorial", time: "4 min" },
  { handle: "nor", rating: 2650, action: "posted", target: "Segment tree benchmarks", time: "22 min" },
  { handle: "awoo", rating: 2200, action: "updated", target: "Educational Round 188", time: "1 hr" },
  { handle: "TheScrasse", rating: 2500, action: "commented on", target: "Flows without proofs", time: "2 hr" },
  { handle: "Igorjan94", rating: 2300, action: "commented on", target: "ICPC mirror invitation", time: "3 hr" },
];
