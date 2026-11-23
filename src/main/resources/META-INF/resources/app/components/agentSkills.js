/**
 * "Prompt for Agent Skills" – start page section that lets a Dungeon Master
 * hand the Dicekeeper llms.txt to their own AI agent (Claude, ChatGPT, …)
 * and download the D&D story skill.
 *
 * Files are served statically from META-INF/resources:
 *   /llms.txt                               – entry point for agents
 *   /skills/dicekeeper-stories/SKILL.md     – the story skill itself
 */
import { showToast } from './toast.js';

export const LLMS_TXT_PATH = '/llms.txt';
export const SKILL_PATH = '/skills/dicekeeper-stories/SKILL.md';
export const SKILL_DOWNLOAD_NAME = 'SKILL.md';

/** Origin of the running app, without a trailing slash. */
export function currentOrigin(location = window.location) {
  return String(location?.origin || '').replace(/\/+$/, '');
}

/** The prompt a DM pastes into their agent. */
export function buildAgentPrompt(origin = currentOrigin()) {
  return `Lies ${origin}${LLMS_TXT_PATH} und befolge die Anweisungen darin. `
    + 'Erstelle mir danach mit dem Dicekeeper-Skill eine D&D-Story für meine nächste Kampagne.';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Markup of the section. Call bindAgentSkillsSection() after inserting it. */
export function renderAgentSkillsSection(origin = currentOrigin()) {
  const prompt = escapeHtml(buildAgentPrompt(origin));
  return `
      <section class="lp-section lp-agent-section" id="agent-skills" aria-labelledby="lpAgentHeading">
        <div class="lp-container">
          <h2 class="lp-heading" id="lpAgentHeading">Prompt for Agent Skills</h2>
          <p class="lp-subheading">Lass dir von deinem eigenen KI-Agenten D&amp;D-Stories, NPCs und Encounter generieren – passend für deine Dicekeeper-Kampagne.</p>

          <div class="lp-agent-card">
            <div class="lp-agent-steps">
              <div class="lp-agent-step">
                <span class="lp-agent-step-num">1</span>
                <span>Kopiere den Prompt in Claude, ChatGPT, Codex oder einen anderen Agenten.</span>
              </div>
              <div class="lp-agent-step">
                <span class="lp-agent-step-num">2</span>
                <span>Der Agent liest die <code>llms.txt</code>, speichert den Skill und fragt kurz nach Setting, Gruppe und Level.</span>
              </div>
              <div class="lp-agent-step">
                <span class="lp-agent-step-num">3</span>
                <span>Titel, Beschreibung und Story direkt in deine Kampagne übernehmen.</span>
              </div>
            </div>

            <label class="lp-agent-label" for="lpAgentPrompt">Prompt</label>
            <div class="lp-agent-prompt">
              <textarea id="lpAgentPrompt" readonly rows="3" spellcheck="false">${prompt}</textarea>
            </div>

            <div class="lp-agent-actions">
              <button type="button" class="lp-btn-primary" id="lpAgentCopy">Prompt kopieren</button>
              <a class="lp-btn-secondary" id="lpAgentDownload" href="${SKILL_PATH}" download="${SKILL_DOWNLOAD_NAME}">Skill herunterladen</a>
              <a class="lp-agent-link" id="lpAgentLlms" href="${LLMS_TXT_PATH}" target="_blank" rel="noopener">llms.txt ansehen ↗</a>
            </div>
            <p class="lp-agent-hint">Den heruntergeladenen Skill unter <code>.claude/skills/dicekeeper-stories/SKILL.md</code> speichern oder in deinem KI-Chat hochladen.</p>
          </div>
        </div>
      </section>`;
}

async function copyText(text, nav = navigator, doc = document) {
  if (nav?.clipboard?.writeText) {
    try {
      await nav.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the legacy path (e.g. insecure context, denied permission)
    }
  }
  const field = doc.getElementById('lpAgentPrompt');
  if (!field) return false;
  field.focus();
  field.select();
  try {
    return Boolean(doc.execCommand && doc.execCommand('copy'));
  } catch {
    return false;
  }
}

/** Wires up the copy button. Returns a cleanup function. */
export function bindAgentSkillsSection(root = document, { origin = currentOrigin() } = {}) {
  const copyBtn = root.querySelector('#lpAgentCopy');
  if (!copyBtn) return () => {};

  const onCopy = async () => {
    const ok = await copyText(buildAgentPrompt(origin));
    if (ok) {
      showToast('Prompt kopiert – jetzt in deinen Agenten einfügen');
    } else {
      showToast('Kopieren nicht möglich – bitte den Prompt markieren und manuell kopieren', 'warning');
    }
  };

  copyBtn.addEventListener('click', onCopy);
  return () => copyBtn.removeEventListener('click', onCopy);
}
