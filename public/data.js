// ✏️ Edit this file to change the content of your portfolio.
const PROFILE = {
  name: "Arthemyo Rodrigues",
  role: "Full Stack Developer",
  company: "dentsu international",
  education: "UNAMA",
  location: "Brazil",
  avatar: "https://avatars.githubusercontent.com/u/121312852?v=4",
  bio: "I wrote my first line of code at 10 years old, scripting games in Unity. Today I build web apps with TypeScript and Next.js, and explore low-level graphics programming with C, Vulkan, OpenGL and Java.",
  github: "https://github.com/Arthemyo?tab=repositories",
  linkedin: "https://www.linkedin.com/in/arthemyo-rodrigues-b5591520a/",
  email: "arthemyo.rodriguez@gmail.com", // leave empty to hide
};

const SKILLS = ["TypeScript", "Next.js", "React", "Vite", "Tailwind CSS", "shadcn/ui", "Vue", "Python", "FastAPI", "Redis", "Docker", "Java", "Spring", "SQL / JDBC", "Salesforce B2C Commerce", "Firebase", "Vercel", "C", "Vulkan", "OpenGL", "SDL"];

// Featured projects (shown as cards). "demo" is optional.
const PROJECTS = [
  { name: "app-claude", description: "Free automotive parts search engine for mechanics, with AI-powered search.", tags: ["TypeScript", "Next.js", "AI"], repo: "https://github.com/Arthemyo/app-claude" },
  { name: "nextjs-dashboard", description: "Financial dashboard built with Next.js App Router, deployed on Vercel.", tags: ["TypeScript", "Next.js"], repo: "https://github.com/Arthemyo/nextjs-dashboard", demo: "https://nextjs-dashboard-peach-six-58.vercel.app" },
  { name: "document-delight-web", description: "Web application for working with documents.", tags: ["TypeScript"], repo: "https://github.com/Arthemyo/document-delight-web" },
  { name: "voxel-engine", description: "A voxel rendering engine written in Java.", tags: ["Java", "OpenGL"], repo: "https://github.com/Arthemyo/voxel-engine" },
  { name: "vulkan-c-first-triangle", description: "Rendering the classic first triangle with the Vulkan API in C.", tags: ["C", "Vulkan"], repo: "https://github.com/Arthemyo/vulkan-c-firts-triangle" },
  { name: "simple-sdl-program", description: "A small program exploring SDL in C.", tags: ["C", "SDL"], repo: "https://github.com/Arthemyo/simple-sdl-program" },
  { name: "learn-computation-graphics-java", description: "Studies in computer graphics fundamentals using Java.", tags: ["Java"], repo: "https://github.com/Arthemyo/learn-computation-graphics-java" },
  { name: "mudi-spring-mvc", description: "Web application built with Spring MVC.", tags: ["Java", "Spring"], repo: "https://github.com/Arthemyo/mudi-spring-mvc" },
];

// AI section: what you do with AI + AI-powered projects.
const AI_INTRO = "I bring LLMs into real products: parsing what users type, returning structured data and keeping the AI honest with validation and guardrails. I also use AI agents in my daily development workflow.";

const AI_CAPABILITIES = [
  { title: "LLM integration", text: "Server-side calls to models like Gemini through OpenRouter, with timeouts and fallbacks so the product keeps working if the AI is slow or down." },
  { title: "Structured output", text: "Prompts that return strict JSON, validated on the server before use, so the model's output can be trusted by the rest of the app." },
  { title: "Guardrails & security", text: "Protection against prompt injection and hallucination: AI only interprets the request, while real data comes from trusted APIs. Keys never reach the browser." },
  { title: "AI-assisted development", text: "Multi-agent workflows with Claude Code (architect, frontend, backend, security, tester and DevOps agents), plus AI builders like Lovable for fast prototyping." },
];

const AI_PROJECTS = [
  {
    name: "Automotive parts search (app-claude)",
    description: "Free search engine for Brazilian mechanics. Gemini turns free-text searches in Portuguese, including shop slang like \"bengala\" or \"coxim\", into structured vehicle and part data. Compatibility comes only from the FIPE, NHTSA and CarQuery APIs, so the AI never invents parts.",
    tags: ["Next.js", "TypeScript", "OpenRouter", "Gemini 2.5 Flash Lite", "Vercel"],
    repo: "https://github.com/Arthemyo/app-claude",
  },
  {
    name: "B3 stock analysis platform",
    description: "Free fundamental-analysis platform for Brazilian stocks, with valuation models such as Graham's method and visual dashboards. Built with a multi-agent Claude Code workflow (data, analysis, UI and test agents).",
    tags: ["Next.js", "FastAPI", "Redis", "Docker", "Claude Code"],
  },
];

// Websites you built. "image" is optional (path or URL to a screenshot).
const SITES_BUILT = [
  { name: "Cicomal", url: "https://cicomal.com/", description: "Corporate website for a premium wood and engineered-lumber company with 30+ years in the industry. Prototyped with AI (Lovable) and hosted on Firebase.", stack: ["React", "TypeScript", "Vite", "Tailwind", "shadcn/ui", "Framer Motion", "Firebase"] },
  { name: "Planejei Cyrela", url: "https://planejei-cyrela.com/", description: "Planejei display experience for Cyrela, one of Brazil's largest real estate developers." },
];

// Websites you contributed to (e.g. at dentsu). Just add more lines.
const SITES_CONTRIBUTED = [
  { name: "Kérastase Brasil", url: "https://www.kerastase.com.br/", description: "E-commerce for the L'Oréal luxury hair care brand." },
  { name: "Natura", url: "https://www.natura.com.br/", description: "E-commerce for one of Brazil's largest cosmetics brands." },
];

// Set to true to also list every other public repo fetched live from GitHub.
const SHOW_ALL_REPOS = true;


// Contact form: messages are POSTed to the small backend in /server, which emails them to you.
const CONTACT_FORM_ENDPOINT = "/api/contact";
