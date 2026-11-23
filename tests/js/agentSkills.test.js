import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  LLMS_TXT_PATH,
  SKILL_PATH,
  bindAgentSkillsSection,
  buildAgentPrompt,
  renderAgentSkillsSection
} from '../../src/main/resources/META-INF/resources/app/components/agentSkills.js';

const STATIC_ROOT = resolve(__dirname, '../../src/main/resources/META-INF/resources');
const readStatic = (path) => readFileSync(resolve(STATIC_ROOT, `.${path}`), 'utf8');

afterEach(() => {
  document.body.innerHTML = '';
});

describe('agent skills prompt', () => {
  it('points the agent at the llms.txt of the current origin', () => {
    const prompt = buildAgentPrompt('https://dev.dicekeeper.net');
    expect(prompt).toContain('https://dev.dicekeeper.net/llms.txt');
    expect(prompt).toMatch(/D&D-Story/);
  });

  it('renders the section with prompt, copy button and skill download', () => {
    document.body.innerHTML = renderAgentSkillsSection('https://dicekeeper.net');

    expect(document.getElementById('lpAgentHeading').textContent).toBe('Prompt for Agent Skills');
    expect(document.getElementById('lpAgentPrompt').value).toBe(buildAgentPrompt('https://dicekeeper.net'));

    const download = document.getElementById('lpAgentDownload');
    expect(download.getAttribute('href')).toBe(SKILL_PATH);
    expect(download.hasAttribute('download')).toBe(true);
    expect(download.textContent).toBe('Skill herunterladen');

    expect(document.getElementById('lpAgentLlms').getAttribute('href')).toBe(LLMS_TXT_PATH);
  });

  it('escapes the origin before putting it into markup', () => {
    document.body.innerHTML = renderAgentSkillsSection('https://x"><img src=x onerror=alert(1)>');
    expect(document.querySelector('img')).toBeNull();
  });

  it('copies the prompt to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    document.body.innerHTML = renderAgentSkillsSection('https://dicekeeper.net');
    const cleanup = bindAgentSkillsSection(document, { origin: 'https://dicekeeper.net' });
    document.getElementById('lpAgentCopy').click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));

    expect(writeText).toHaveBeenCalledWith(buildAgentPrompt('https://dicekeeper.net'));
    expect(document.querySelector('.app-toast')?.textContent).toMatch(/Prompt kopiert/);

    cleanup();
    vi.unstubAllGlobals();
  });
});

describe('served agent files', () => {
  const llms = readStatic(LLMS_TXT_PATH);
  const skill = readStatic(SKILL_PATH);

  it('llms.txt follows the llms.txt layout and links the skill', () => {
    expect(llms.startsWith('# Dicekeeper\n')).toBe(true);
    expect(llms).toMatch(/^> /m);
    expect(llms).toContain(`https://dicekeeper.net${SKILL_PATH}`);
    expect(llms).toContain('.claude/skills/dicekeeper-stories/SKILL.md');
  });

  it('SKILL.md has the frontmatter agents need', () => {
    const frontmatter = skill.match(/^---\n([\s\S]*?)\n---\n/);
    expect(frontmatter).not.toBeNull();
    expect(frontmatter[1]).toMatch(/^name: dicekeeper-stories$/m);
    expect(frontmatter[1]).toMatch(/^description: .{40,1024}$/m);
    expect(skill).toContain(`Source: https://dicekeeper.net${SKILL_PATH}`);
    expect(skill).toMatch(/^Version: \d{4}-\d{2}-\d{2}$/m);
  });

  it('SKILL.md keeps the Dicekeeper field limits in sync with the campaign form', () => {
    expect(skill).toContain('Beschreibung (für Spieler sichtbar, max. 1000 Zeichen)');
    expect(skill).toContain('Story (nur für den DM sichtbar, max. 5000 Zeichen)');
  });
});
