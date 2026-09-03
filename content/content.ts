// ============================================================
// ALL site content lives in this one file.
// Everything below is placeholder scaffolding — the original
// author's projects, galleries, imagery and copy were removed.
// ============================================================

import { asset } from "@/lib/asset";

export type Pic = { src: string; w: number; h: number };

// ---------- site chrome (every visible string is editable here) ----------
export const site = {
  name: "Mark Andro",
  footer: "© Mark Andro 2026",
  nav: { work: "journey", play: "craft", inspiration: "inspiration" },
  labels: { projects: "Journey" },
};

// ---------- about ----------
export const about = {
  eyebrow: "SOFTWARE ARCHITECT / ARTIST / JACK OF ALL TRADES",
  // paragraph segments; segments with href render as bolded links
  // TODO: placeholder copy — write your own bio here
  bio: [
    { text: "Mark Andro is a software architect and artist. " },
    { text: "This paragraph is placeholder copy. Segments given an " },
    { text: "href", href: "#" },
    { text: " render as bolded links." },
  ] as { text: string; href?: string }[],
  // TODO: placeholder targets — swap in your own profiles and address
  socials: [
    { type: "instagram", label: "Instagram", href: "#" },
    { type: "x", label: "X", href: "#" },
    { type: "linkedin", label: "LinkedIn", href: "#" },
    { type: "email", label: "Email", href: "mailto:you@example.com" },
  ] as { type: "instagram" | "x" | "linkedin" | "email"; label: string; href: string }[],
};

// ---------- journey: studies, then work ----------
// Told in order, oldest first — it should read as a path walked, not a
// résumé. Each entry's `body` is one paragraph; CSS lifts its first letter
// into a drop cap, so the string here stays plain prose.
export type JourneyEntry = {
  title: string; // the degree, the certification, the role
  subtitle?: string; // what the work actually was, in one line
  place: string; // school, issuing body, or company
  span: string; // "2018–2022", "2021", "2022 — now"
  body: string; // one paragraph — the first letter becomes the drop cap
  note?: string; // optional aside: credential ID, honours, the stack
};

export type JourneyChapter = { label: string; lede?: string; entries: JourneyEntry[] };

// TODO: placeholder copy throughout — replace every entry below with your own.
export const journey = {
  lede: "I am the museum of the people I have loved, they expanded my soul and this is my journey.",
  chapters: [
    {
      label: "Studies & Certifications",
      lede: "Italy, Milan",
      entries: [
        {
          title: "Software architecture and design",
          place: "Higher Technical Education Institute - Angelo Rizzoli",
          span: "2024-2026",
          body: "Developed practical skills in front-end and back-end development, database design and data modeling, API, software testing. Gained experience with collaborative tools, and architectural patterns such as MVC and Client-Server.",
          note: "Working-student @ Jollibee",
        },
        {
          title: "International Relations and Marketing",
          place: "Technical Education Institute - Eugenio Montale",
          span: "2015-2020",
          body: "Studied business economics, marketing, international relations, law, geopolitics, and communication technologies, with a strong focus on foreign languages (English, French, and Spanish) and international business.",
        },
      ],
    },
    {
      label: "Work",
      lede: "Italy, Milan",
      entries: [
        {
          title: "Software developer",
          subtitle: "Development of internal management tools for online testing (TOL) system",
          place: "Selexi",
          span: "present",
          body: "Developed key features to streamline production workflows and accelerate testing. Engineered, tested, and documented system functionalities to ensure high reliability while enhancing WCAG compliance and platform accessibility.",
        },
        {
          title: "Web developer - internship",
          subtitle: "Development of responsive interfaces for websites ",
          place: "AGM Solutions",
          span: "2023 - 2024",
          body: "Developed responsive web applications and managed relational databases using HTML, CSS, JavaScript, and PHP. Built a full-stack CRUD photo album application using Laravel to master MVC architecture and modern backend design.",
        },
        {
          title: "Customer care",
          subtitle: "Customer support and assistance for clients",
          place: "Nespresso",
          span: "2022 - 2023",
          body: "Provided customer support and assistance for clients calling in, ensuring their needs were met and issues resolved promptly. Developed strong communication and problem-solving skills while maintaining a high level of customer satisfaction.",
        },
         {
          title: "Restaurant crew member",
          subtitle: "Customer service and food preparation",
          place: "Burger King Italy",
          span: "2021 - 2022",
          body: "Provided excellent customer service and assisted in food preparation, ensuring a positive dining experience for customers. Developed teamwork and time management skills while working in a fast-paced environment.",
        },
        {
          title: "Warehouse picker",
          subtitle: "Picking and packing orders for shipment",
          place: "MARB Srl",
          span: "2020 - 2021",
          body: "Picked and packed orders for shipment, ensuring accuracy and efficiency in the fulfillment process. Developed strong organizational and time management skills while working in a fast-paced environment.",
        },
      ],
    },
  ] as JourneyChapter[],
};

// ---------- hero flipbook ----------
// `home` marks the spread the opening riffle lands on; `start` marks the one
// it begins from. Each falls back to the first spread if neither is flagged.
export type SketchPage = Pic & { title: string; home?: boolean; start?: boolean };

type SketchFlags = { home?: boolean; start?: boolean };

// A photo of an open sketchbook, background cut out by scripts/sketchbook.mjs.
const sketch = (file: string, title: string, flags?: SketchFlags): SketchPage => ({
  src: asset(`/work/sketchbook/${file}.png`),
  w: 1280,
  h: 720,
  title,
  ...(flags?.home ? { home: true } : {}),
  ...(flags?.start ? { start: true } : {}),
});

// A page scanned flat and mounted into scripts/book-template.png by
// scripts/sketchbook.mjs. Renders at 1920x1080 rather than 1280x720 — a
// scanned page only gets ~397px of width at 1280, which is not enough for
// pencil. Mixing sizes is safe: .sb-book takes its aspect-ratio from pages[0]
// alone, both sizes are 16:9, and every image is width:100%.
const mounted = (file: string, title: string, flags?: SketchFlags): SketchPage => ({
  src: asset(`/work/sketchbook/${file}.png`),
  w: 1920,
  h: 1080,
  title,
  ...(flags?.home ? { home: true } : {}),
  ...(flags?.start ? { start: true } : {}),
});

export const sketchbook: SketchPage[] = [
  mounted("i want to live", " No one is born in this world to be alone!"),
  mounted("助けて", "\"助けて\""),
  mounted("eustass", " When you hit rock bottom, there is nowhere to go but up"),
  mounted("i am proud of you", "\n One day, I will make you proud \n"),
  mounted("sasuke", " This is the last time "),
  mounted("notes", "\" I will never forget you\""),
  mounted("kimono", " Sketches"),
  mounted("fly", "To pimp a caterpillar"),
  mounted("prisoner of the mind", "Prisoner Of The Mind"),
  // `start` isn't flagged, so the opening riffle begins at the first spread
  // above; it loops through every page once and lands here
  mounted("thinking of the blue sky", "Thinking Of The Blue Sky", { home: true }),
];

// ---------- play ----------
export type PlayCard = { title: string; href: string; note: string; thumb: Pic; reel?: string };
export const playSections: { label: string; cards: PlayCard[] }[] = [];
