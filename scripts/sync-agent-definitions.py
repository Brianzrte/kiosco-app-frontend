#!/usr/bin/env python3
"""Sync canonical agent definitions to the Claude Code and Codex adapters.

Source of truth: agent-definitions/<agent>/AGENT.md
Generated:        .claude/agents/<agent>.md   (Claude Code)
                   .codex/agents/<agent>.toml (Codex)

AGENT.md must not contain platform-specific YAML/TOML: it starts with a small
neutral metadata header (``Agent:``, ``Description:``, optional ``Skills:``),
a blank line, and then the canonical Markdown body. This script parses that
header, then renders each platform's adapter around the same body.

Usage:
    python scripts/sync-agent-definitions.py --sync [agent]
    python scripts/sync-agent-definitions.py --check [agent]

Without an agent name, both modes apply to every agent under
agent-definitions/. --check never writes; it exits non-zero if any generated
file would differ from what is on disk (including missing files).

Standard library only. No third-party YAML/TOML writers: the handful of
fields needed (name, description, a short skills list, one long text block)
are escaped by hand, which is simpler and more auditable than a dependency.
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFINITIONS_DIR = REPO_ROOT / "agent-definitions"
CLAUDE_AGENTS_DIR = REPO_ROOT / ".claude" / "agents"
CODEX_AGENTS_DIR = REPO_ROOT / ".codex" / "agents"

SOURCE_FILENAME = "AGENT.md"
HEADER_KEY_RE = re.compile(r"^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$")


class DefinitionError(Exception):
    """Raised when an AGENT.md source file cannot be parsed or is invalid."""


@dataclass
class AgentDefinition:
    name: str
    description: str
    model: str = "inherit"
    skills: list[str] = field(default_factory=list)
    body: str = ""  # canonical Markdown, starting at the "# Title" heading
    source_path: Path = None


def parse_agent_definition(agent_dir: Path) -> AgentDefinition:
    """Parse agent-definitions/<agent>/AGENT.md into name/description/skills/body."""
    source_path = agent_dir / SOURCE_FILENAME
    if not source_path.is_file():
        raise DefinitionError(f"missing {SOURCE_FILENAME} in {agent_dir}")

    text = source_path.read_text(encoding="utf-8")
    lines = text.splitlines()

    header: dict[str, str] = {}
    body_start = None
    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("#"):
            body_start = i
            break
        match = HEADER_KEY_RE.match(stripped)
        if not match:
            raise DefinitionError(
                f"{source_path}: expected 'Key: value' header lines before the "
                f"first '#' heading, found: {line!r}"
            )
        header[match.group(1).lower()] = match.group(2).strip()

    if body_start is None:
        raise DefinitionError(f"{source_path}: no top-level '# Title' heading found")

    if "agent" not in header:
        raise DefinitionError(f"{source_path}: missing required 'Agent:' header line")
    if "description" not in header or not header["description"]:
        raise DefinitionError(f"{source_path}: missing required 'Description:' header line")

    declared_name = header["agent"]
    dir_name = agent_dir.name
    if declared_name != dir_name:
        raise DefinitionError(
            f"{source_path}: 'Agent: {declared_name}' does not match its "
            f"directory name '{dir_name}'"
        )

    skills_raw = header.get("skills", "")
    skills = [s.strip() for s in skills_raw.split(",") if s.strip()]
    model = header.get("model", "inherit")

    body = "\n".join(lines[body_start:]).rstrip("\n") + "\n"

    return AgentDefinition(
        name=dir_name,
        description=header["description"],
        model=model,
        skills=skills,
        body=body,
        source_path=source_path,
    )


# --------------------------------------------------------------------------
# Escaping helpers (hand-rolled: no PyYAML / tomllib-write in the stdlib)
# --------------------------------------------------------------------------


def yaml_double_quoted(value: str) -> str:
    """Render `value` as a YAML double-quoted scalar (safe for one-line fields)."""
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    escaped = escaped.replace("\n", "\\n").replace("\t", "\\t")
    return f'"{escaped}"'


def toml_basic_string(value: str) -> str:
    """Render `value` as a single-line TOML basic string."""
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    escaped = escaped.replace("\n", "\\n").replace("\t", "\\t")
    return f'"{escaped}"'


def toml_multiline_basic_string(value: str) -> str:
    """Render `value` as a TOML multi-line basic string (\"\"\" ... \"\"\")."""
    escaped = value.replace("\\", "\\\\")
    # Escape any run of the delimiter so it can't prematurely close the string.
    escaped = escaped.replace('"""', '\\"\\"\\"')
    if escaped.endswith('"'):
        # A trailing unescaped quote would merge with the closing delimiter.
        escaped = escaped[:-1] + '\\"'
    return f'"""\n{escaped}\n"""'


# --------------------------------------------------------------------------
# Renderers
# --------------------------------------------------------------------------

GENERATED_NOTICE_CLAUDE = """<!--
Generated from agent-definitions/{name}/AGENT.md.
Do not edit this file directly.
Run scripts/sync-agent-definitions.py --sync {name}.
-->"""

GENERATED_NOTICE_CODEX = """# Generated from agent-definitions/{name}/AGENT.md.
# Do not edit this file directly.
# Run scripts/sync-agent-definitions.py --sync {name}."""

CODEX_SKILL_PREAMBLE = """Before doing any work, locate and load the following skill(s) from this
repository. Paths are relative to the repository root and may have moved;
search the repository for the skill name if it is not at the path below
before concluding it is missing.

{skill_lines}

If a required skill cannot be found or loaded, stop and report the missing
dependency explicitly. Do not improvise its rules, checklists or severity
model from memory."""


def render_claude(agent: AgentDefinition) -> str:
    notice = GENERATED_NOTICE_CLAUDE.format(name=agent.name)
    lines = [
        "---",
        f"name: {agent.name}",
        f"description: {yaml_double_quoted(agent.description)}",
        f"model: {agent.model}",
    ]
    if agent.skills:
        lines.append("skills:")
        lines.extend(f"  - {skill}" for skill in agent.skills)
    lines.append("---")
    frontmatter = "\n".join(lines)
    return f"{frontmatter}\n\n{notice}\n\n{agent.body}"


def render_codex(agent: AgentDefinition) -> str:
    notice = GENERATED_NOTICE_CODEX.format(name=agent.name)
    codex_name = agent.name.replace("-", "_")

    if agent.skills:
        skill_lines = "\n".join(
            f"- `ai/skills/{skill}/SKILL.md` (skill: `{skill}`)" for skill in agent.skills
        )
        preamble = CODEX_SKILL_PREAMBLE.format(skill_lines=skill_lines)
        instructions = f"{preamble}\n\n{agent.body}"
    else:
        instructions = agent.body

    lines = [
        notice,
        "",
        f'name = {toml_basic_string(codex_name)}',
        f'description = {toml_basic_string(agent.description)}',
        f"developer_instructions = {toml_multiline_basic_string(instructions)}",
        "",
    ]
    return "\n".join(lines)


# --------------------------------------------------------------------------
# Sync / check
# --------------------------------------------------------------------------


def discover_agents() -> list[str]:
    if not DEFINITIONS_DIR.is_dir():
        return []
    names = []
    for entry in sorted(DEFINITIONS_DIR.iterdir()):
        if entry.is_dir() and (entry / SOURCE_FILENAME).is_file():
            names.append(entry.name)
    return names


def resolve_agent_names(requested: str | None) -> list[str]:
    available = discover_agents()
    if requested is None:
        return available
    if requested not in available:
        raise DefinitionError(
            f"unknown agent '{requested}'. Available: {', '.join(available) or '(none)'}"
        )
    return [requested]


def sync_agent(name: str) -> None:
    agent = parse_agent_definition(DEFINITIONS_DIR / name)

    CLAUDE_AGENTS_DIR.mkdir(parents=True, exist_ok=True)
    CODEX_AGENTS_DIR.mkdir(parents=True, exist_ok=True)

    claude_path = CLAUDE_AGENTS_DIR / f"{name}.md"
    codex_path = CODEX_AGENTS_DIR / f"{name}.toml"

    claude_content = render_claude(agent)
    codex_content = render_codex(agent)

    claude_changed = not claude_path.is_file() or claude_path.read_text(encoding="utf-8") != claude_content
    codex_changed = not codex_path.is_file() or codex_path.read_text(encoding="utf-8") != codex_content

    claude_path.write_text(claude_content, encoding="utf-8")
    codex_path.write_text(codex_content, encoding="utf-8")

    claude_rel = claude_path.relative_to(REPO_ROOT)
    codex_rel = codex_path.relative_to(REPO_ROOT)
    print(f"synced {name}:")
    print(f"  {claude_rel} ({'updated' if claude_changed else 'unchanged'})")
    print(f"  {codex_rel} ({'updated' if codex_changed else 'unchanged'})")


def check_agent(name: str) -> bool:
    """Return True if the generated adapters match the canonical source."""
    agent = parse_agent_definition(DEFINITIONS_DIR / name)

    ok = True
    for path, expected, label in (
        (CLAUDE_AGENTS_DIR / f"{name}.md", render_claude(agent), "Claude"),
        (CODEX_AGENTS_DIR / f"{name}.toml", render_codex(agent), "Codex"),
    ):
        rel = path.relative_to(REPO_ROOT)
        if not path.is_file():
            print(f"MISSING {rel} ({label} adapter not generated yet)")
            ok = False
            continue
        actual = path.read_text(encoding="utf-8")
        if actual != expected:
            print(f"STALE   {rel} ({label} adapter out of date with {agent.source_path.relative_to(REPO_ROOT)})")
            ok = False
        else:
            print(f"OK      {rel}")
    return ok


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(
        description="Sync agent-definitions/<agent>/AGENT.md to .claude/agents and .codex/agents.",
    )
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--sync", action="store_true", help="generate/update the adapters")
    mode.add_argument("--check", action="store_true", help="verify adapters are up to date; no writes")
    parser.add_argument(
        "agent",
        nargs="?",
        default=None,
        help="agent name under agent-definitions/ (default: all managed agents)",
    )
    args = parser.parse_args(argv)

    try:
        names = resolve_agent_names(args.agent)
    except DefinitionError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    if not names:
        print(f"error: no agents found under {DEFINITIONS_DIR.relative_to(REPO_ROOT)}", file=sys.stderr)
        return 2

    if args.sync:
        try:
            for name in names:
                sync_agent(name)
        except DefinitionError as exc:
            print(f"error: {exc}", file=sys.stderr)
            return 2
        return 0

    # --check
    all_ok = True
    try:
        for name in names:
            if not check_agent(name):
                all_ok = False
    except DefinitionError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    if all_ok:
        print("All agent adapters are up to date.")
        return 0
    print("Some agent adapters are missing or stale. Run with --sync to regenerate.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
