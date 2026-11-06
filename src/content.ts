/* ============================================================================
 * content.ts: the ONLY file you need to edit to change what the site says.
 *
 *  - Text, links, projects, skills, achievements, hobbies and the hero media
 *    all live here. Components read from this file and never hard-code copy.
 *  - Keep it honest: no invented metrics. Anything missing is marked TODO.
 *  - Phone number and home address are intentionally NOT on the site.
 * ========================================================================== */

export type Link = { label: string; href: string };

export const site = {
  name: 'Ayush Raj',
  shortName: 'AR',
  role: 'B.Tech CSE (AI/ML)',
  school: 'Lovely Professional University',
  schoolShort: 'LPU',
  graduation: 'Expected 2030',
  tagline: 'Building with code and AI.',
  status: 'Open to internships',
  email: 'araj27471@gmail.com',
  resume: '/Ayush_Raj_CV.pdf', // drop the file into /public with this exact name
  socials: {
    github: { label: 'GitHub', href: 'https://github.com/ayux-git' },
    linkedin: { label: 'LinkedIn', href: 'https://in.linkedin.com/in/ayux-in' },
  },
};

/* ---------------------------------------------------------------------------
 * HERO: the live wallpaper.
 * The site switches automatically:
 *   1. If /public/hero-loop.webm or /public/hero-loop.mp4 exists it plays that
 *      clip through the WebGL scene (video mode).
 *   2. Otherwise it brings `image` to life with the depth map (living image).
 * focal: where the face sits in the media, as 0..1 of width/height. Keeps the
 *        face in frame on every screen. Re-measure if you swap the media.
 * ------------------------------------------------------------------------- */
export const hero = {
  image: '/avatar.webp',
  imageMobile: '/avatar-mobile.webp',
  depth: '/hero-depth.png', // regenerate with: npm run depth -- <frame.png>
  // Character scene (used when there is no video): the avatar cut out of its background, lit low-key,
  // with the red thread glowing and giving off energy. Rebuild: npm run cutout && python scripts/merge-alpha.py
  // && npm run assets && python scripts/make-fx.py (it prints the emitter positions below).
  character: {
    figure: '/hero-figure.webp',
    figureMobile: '/hero-figure-mobile.webp',
    fx: {
      src: '/hero-fx.png',
      threads: [
        [0.789, 0.542], // red thread, raised hand
        [0.381, 0.916], // red thread, lower wrist
      ] as [number, number][],
      phone: [0.714, 0.41] as [number, number],
    },
  },
  poster: '/hero-poster.webp', // still of the scene (npm run poster, with npm run dev running)
  posterMobile: '/hero-poster-mobile.webp',
  focal: { x: 0.54, y: 0.255 },
  video: {
    enabled: true, // set false to force the code-driven living image
    webm: '/hero-loop.webm',
    mp4: '/hero-loop.mp4',
    mobileMp4: '/hero-loop-mobile.mp4', // optional 720p / portrait crop
    largeWebm: '/hero-loop-1440.webm', // optional, only loaded on big, fast screens
    largeMp4: '/hero-loop-1440.mp4',
    focal: { x: 0.54, y: 0.3 }, // TODO: re-measure once your clip exists
    // Scroll-scrubbed mode: scroll position drives the clip's currentTime instead of looping.
    // Only turn on with an all-intra clip (every frame a keyframe, see README), otherwise seeking is choppy.
    scrub: false,
  },
  overlayIntensity: 1, // 0..1.5. Fog, rain, particles and grain strength.
  eyebrow: 'B.Tech CSE (AI/ML) · LPU · Class of 2030',
  headline: ['Ayush', 'Raj'],
  sub: ['building with', 'code', 'and', 'AI.'], // words 2 and 4 are set in italic serif
  intro:
    "I'm a first-year CSE student who learns by shipping. Three web projects so far, from a Flask API to a full-stack platform with an AI assistant. Now I'm going deeper into machine learning, and I'm looking for an internship where I can learn fast and pull my weight.",
  latest: { label: 'Latest build', title: 'Campus Care, an AI healthcare platform for LPU', href: '#work' },
};

/* ---------------------------------------------------------------------------
 * PROJECTS: newest / most relevant first.
 * To add one, copy an object below and fill it in.
 *   preview.kind: 'assistant', 'weather' or 'matrix' (built-in diagram previews), or 'none'.
 * ------------------------------------------------------------------------- */
export type Project = {
  slug: string;
  title: string;
  subtitle: string;
  context: string;
  summary: string;
  points: string[];
  stack: string[];
  links: Link[];
  preview: { kind: 'assistant' } | { kind: 'weather' } | { kind: 'matrix' } | { kind: 'none' };
};

export const projects: Project[] = [
  {
    slug: 'campus-care',
    title: 'Campus Care',
    subtitle: 'LPU healthcare platform',
    context: 'Full-stack · AI assistant',
    summary:
      'A full-stack health platform for LPU students and staff: tracking, doctor and counselor appointments, video teleconsults, pharmacy ordering with hostel delivery and an interactive campus map.',
    points: [
      'AI health assistant using RAG through a Supabase Edge Function that calls the Anthropic API, with a rule-based fallback and English, Hindi and Punjabi support.',
      'Supabase backend with Row Level Security, email auth, file storage and realtime updates.',
      'Role-based access for students, staff, doctors and counselors.',
    ],
    stack: ['React', 'Vite', 'Tailwind CSS', 'Supabase', 'PostgreSQL', 'Anthropic API', 'RAG'],
    links: [
      { label: 'Live site', href: 'https://campus-care-theta.vercel.app' },
      { label: 'GitHub', href: 'https://github.com/ayux-git/Campus-Care' },
    ],
    preview: { kind: 'assistant' },
  },
  {
    slug: 'atmosfit',
    title: 'AtmosFit',
    subtitle: 'Weather-based outfit recommender',
    context: 'Flask API · 3D avatar',
    summary:
      'Tells you what to wear from the actual weather outside, adjusted for age and gender, including children and seniors, and shows it on a rotatable 3D avatar.',
    points: [
      'Recommendation logic built on feels-like temperature, rain chance, wind, UV, snow and air quality.',
      'Flask REST API with SQLite, Google OAuth sign-in and salted password hashing.',
      'Hyperlocal weather from the Open-Meteo API with a 10-day forecast.',
    ],
    stack: ['Python', 'Flask', 'SQLite', 'JavaScript', 'Three.js', 'Open-Meteo API'],
    links: [{ label: 'GitHub', href: 'https://github.com/ayux-git/AtmosFit' }],
    preview: { kind: 'weather' },
  },
  {
    slug: 'railmatrix',
    title: 'RailMatrix',
    subtitle: 'Railway berth and PNR status simulator',
    context: 'No frameworks',
    summary:
      'Train search across 40 stations with class-wise availability, quota-based fares and PNR tracking, written in plain HTML, CSS and JavaScript.',
    points: [
      'A statistical model that predicts waitlist and RAC confirmation probability, checked with Node-based logic tests and headless Edge runs.',
      'Seeded random generator, so every result is repeatable.',
      'Keyboard-navigable tabs, ARIA labels, inline validation and a mobile-first layout tested at 360 px.',
    ],
    stack: ['HTML', 'CSS', 'JavaScript'],
    links: [{ label: 'GitHub', href: 'https://github.com/ayux-git/RailMatrix' }],
    preview: { kind: 'matrix' },
  },
];

/* ---------------------------------------------------------------------------
 * EXPERIENCE / OPEN SOURCE: hidden until it has at least one entry.
 * Example:
 *   { org: 'Org name', role: 'GSoC contributor', period: 'May–Aug 2027',
 *     detail: 'What you shipped, in one line.', href: 'https://…' },
 * ------------------------------------------------------------------------- */
export const experience: { org: string; role: string; period: string; detail: string; href?: string }[] = [];

/* ---------------------------------------------------------------------------
 * ABOUT
 * ------------------------------------------------------------------------- */
export const about = {
  heading: ['Learns by', 'shipping.'],
  paragraphs: [
    "I'm Ayush. I study computer science with a focus on AI and ML at Lovely Professional University. I got into this because I wanted to know how things work under the screen, and I stayed because building something real is the fastest way I learn.",
    'Most of what I know came from projects: a weather app that dresses you, a healthcare platform with an AI assistant, and a railway simulator with zero frameworks. I like problems that sit between clean logic and the people using it.',
  ],
  portraitAlt: 'Illustrated portrait of Ayush Raj smiling on a rooftop at dusk, holding a phone, with a red thread on his wrist',
  portraitRatio: 1100 / 1601, // width / height of public/portrait.webp
  // where the red thread is (0..1 boxes): only those pixels stay red in the 1-bit version
  portraitAccent: [
    [0.38, 0.86, 0.62, 1.0], // wrist
    [0.36, 0.38, 0.62, 0.6], // neck cord
  ] as [number, number, number, number][],
  learningNote: 'I love to learn new skills, so this list keeps changing.',
  learning: [
    { topic: 'Machine learning', note: 'Going past the fundamentals: models, evaluation, real datasets.' },
    { topic: 'UI/UX design', note: 'Learning to design the thing before I build it.' },
    { topic: 'Cybersecurity', note: 'Kali Linux and the fundamentals, one lab at a time.' },
  ],
};

/* ---------------------------------------------------------------------------
 * SKILLS: grouped. `learning: true` shows a small "learning" tag. No fake %.
 * ------------------------------------------------------------------------- */
export type SkillGroup = { id: string; label: string; items: { name: string; learning?: boolean }[] };

export const skills: SkillGroup[] = [
  { id: 'lang', label: 'Languages', items: [{ name: 'Python' }, { name: 'JavaScript' }, { name: 'HTML5' }, { name: 'CSS3' }, { name: 'SQL' }] },
  { id: 'fw', label: 'Frameworks', items: [{ name: 'React' }, { name: 'Flask' }, { name: 'Tailwind CSS' }, { name: 'Three.js' }] },
  { id: 'data', label: 'Backend & data', items: [{ name: 'Supabase' }, { name: 'PostgreSQL' }, { name: 'SQLite' }, { name: 'REST APIs' }, { name: 'OAuth 2.0' }] },
  {
    id: 'ai',
    label: 'AI & automation',
    items: [{ name: 'ML fundamentals' }, { name: 'RAG' }, { name: 'LLM API integration' }, { name: 'Claude Code' }, { name: 'OpenCode' }, { name: 'n8n' }],
  },
  { id: 'tools', label: 'Tools', items: [{ name: 'Git' }, { name: 'GitHub' }, { name: 'Docker' }, { name: 'VS Code' }, { name: 'Vercel' }, { name: 'Linux' }] },
  { id: 'design', label: 'Design', items: [{ name: 'UI/UX', learning: true }, { name: 'Responsive design' }] },
  { id: 'sec', label: 'Security', items: [{ name: 'Kali Linux', learning: true }, { name: 'Cybersecurity fundamentals', learning: true }] },
];

/* ---------------------------------------------------------------------------
 * ACHIEVEMENTS & CERTIFICATES
 * To add one: { kind: 'Certificate' | 'Achievement' | 'Course', title, detail, year?, href? }
 * ------------------------------------------------------------------------- */
export const achievements: { kind: string; title: string; detail: string; year?: string; href?: string }[] = [
  { kind: 'Hackathons', title: 'Two hackathons', detail: 'Took part in two hackathons.' },
  { kind: 'Sport', title: 'State-level Wushu player', detail: 'Gold medal at the district-level competition, Sitamarhi, Bihar.', year: '2019' },
  { kind: 'Certificate', title: 'AI Classroom', detail: 'JioPC.' },
  { kind: 'Course', title: 'Fundamentals of Machine Learning and AI', detail: 'Completed on Coursera.' },
];

/* ---------------------------------------------------------------------------
 * BEYOND CODE
 * ------------------------------------------------------------------------- */
export const beyond: { title: string; line: string; glyph: 'wushu' | 'sketch' | 'trading' | 'game' | 'book' }[] = [
  { title: 'Wushu', line: 'Where I learned discipline before I learned to code.', glyph: 'wushu' },
  { title: 'Portrait sketching', line: 'Pencil, paper, and patience with faces.', glyph: 'sketch' },
  { title: 'Trading', line: 'Trading and following the markets.', glyph: 'trading' },
  { title: 'Esports', line: 'Fast decisions, team calls, one more round.', glyph: 'game' },
  { title: 'Reading', line: 'Zoology, and whatever book everyone is arguing about.', glyph: 'book' },
];

/* ---------------------------------------------------------------------------
 * CONTACT
 * ------------------------------------------------------------------------- */
export const contact = {
  heading: ['Open to', 'internships.'],
  body: 'AI/ML internships (summer or winter), open-source programs like GSoC, or a project that needs one more builder. Email is the fastest way to reach me.',
};

export const nav: Link[] = [
  { label: 'Work', href: '#work' },
  { label: 'About', href: '#about' },
  { label: 'Skills', href: '#skills' },
  { label: 'Contact', href: '#contact' },
];
