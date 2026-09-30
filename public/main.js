const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

$("avatar").src = PROFILE.avatar;
$("name").textContent = PROFILE.name;
$("role").textContent = PROFILE.role;
$("bio").textContent = PROFILE.bio;
$("meta").textContent = [PROFILE.company, PROFILE.education, PROFILE.location].filter(Boolean).join(" · ");
$("year").textContent = new Date().getFullYear();

const contactLinks = [
  PROFILE.email && { label: "Email", href: `mailto:${PROFILE.email}`, text: PROFILE.email },
  { label: "LinkedIn", href: PROFILE.linkedin, text: "linkedin.com/in/arthemyo-rodrigues" },
  { label: "GitHub", href: PROFILE.github, text: "github.com/Arthemyo" },
].filter(Boolean).map((l) => `
  <li><span class="label">${l.label}</span>
  <a href="${esc(l.href)}"${l.href.startsWith("mailto:") ? "" : ' target="_blank" rel="noopener"'}>${esc(l.text)}</a></li>`).join("");
$("links").innerHTML = contactLinks;
$("contact-links").innerHTML = contactLinks;

$("project-grid").innerHTML = PROJECTS.map((p) => `
  <article class="card">
    <h3>${esc(p.name)}</h3>
    <p>${esc(p.description)}</p>
    <div class="chips small">${p.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>
    <div class="card-links">
      <a href="${esc(p.repo)}" target="_blank" rel="noopener">Code →</a>
      ${p.demo ? `<a href="${esc(p.demo)}" target="_blank" rel="noopener">Live demo →</a>` : ""}
    </div>
  </article>`).join("");

const siteCard = (s) => `
  <a class="card site" href="${esc(s.url)}" target="_blank" rel="noopener">
    ${s.image ? `<img src="${esc(s.image)}" alt="" loading="lazy" />` : ""}
    <h3>${esc(s.name)}</h3>
    <p>${esc(s.description)}</p>
    ${s.stack ? `<div class="chips small">${s.stack.map((t) => `<span>${esc(t)}</span>`).join("")}</div>` : ""}
    <span class="domain">${esc(new URL(s.url).hostname.replace(/^www\./, ""))} ↗</span>
  </a>`;
$("sites-built").innerHTML = SITES_BUILT.map(siteCard).join("");
$("sites-contributed").innerHTML = SITES_CONTRIBUTED.map(siteCard).join("");

$("ai-intro").textContent = AI_INTRO;
$("ai-capabilities").innerHTML = AI_CAPABILITIES.map((c) => `
  <article class="card ai-cap"><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p></article>`).join("");
$("ai-projects").innerHTML = AI_PROJECTS.map((p) => `
  <article class="card ai-project">
    <span class="badge">AI-powered</span>
    <h3>${esc(p.name)}</h3>
    <p>${esc(p.description)}</p>
    <div class="chips small">${p.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>
    ${p.repo ? `<div class="card-links"><a href="${esc(p.repo)}" target="_blank" rel="noopener">Code →</a></div>` : ""}
  </article>`).join("");

$("skill-list").innerHTML = SKILLS.map((s) => `<span>${esc(s)}</span>`).join("");

if (SHOW_ALL_REPOS) {
  const featured = new Set(PROJECTS.map((p) => p.repo.toLowerCase()));
  fetch("https://api.github.com/users/Arthemyo/repos?per_page=100&sort=updated")
    .then((r) => r.json())
    .then((repos) => {
      const rest = repos.filter((r) => !r.fork && !featured.has(r.html_url.toLowerCase()));
      if (!rest.length) return;
      $("repo-list").innerHTML = rest.map((r) => `
        <li><a href="${r.html_url}" target="_blank" rel="noopener">${esc(r.name)}</a>
        <span>${esc(r.language || "")}</span></li>`).join("");
      $("more").hidden = false;
    })
    .catch(() => {});
}

const formTemplate = $("contact-form-template");
document.querySelectorAll(".form-slot").forEach((slot) => {
  slot.replaceWith(formTemplate.content.cloneNode(true));
});

// Formats digits as a Brazilian phone: (00) 0000-0000 or (00) 00000-0000.
const formatBrPhone = (value) => {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

document.querySelectorAll(".contact-form").forEach((form) => {
  const status = form.querySelector(".form-status");
  const phone = form.querySelector('input[name="phone"]');
  phone.addEventListener("input", () => (phone.value = formatBrPhone(phone.value)));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const data = Object.fromEntries(new FormData(form));
    const button = form.querySelector("button");
    button.disabled = true;
    status.className = "form-status";
    status.textContent = "Sending…";
    try {
      const res = await fetch(CONTACT_FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok !== true) throw new Error(json.error || "Send failed");
      form.reset();
      status.classList.add("ok");
      status.textContent = "Thanks! Your message was sent. I'll get back to you soon.";
    } catch (err) {
      status.classList.add("error");
      const reason = err instanceof TypeError ? "Couldn't reach the server." : err.message;
      status.innerHTML = `${esc(reason)} <a href="mailto:${esc(PROFILE.email)}?subject=${encodeURIComponent(data.subject || "")}&body=${encodeURIComponent(data.message || "")}">Send by email instead</a>.`;
    } finally {
      button.disabled = false;
    }
  });
});
