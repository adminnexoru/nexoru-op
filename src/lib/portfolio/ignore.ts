// T010: folders of PROJECTS_ROOT that are not projects (standard 1.1, project-standard.md §8).
// One exact folder name per line; empty lines and lines starting with # are ignored; a name with
// a path separator, a wildcard or a leading dot is not valid and is ignored.

const INVALID = /[/\\*?]|^\./;

export function parseNexoruIgnore(text: string | null): Set<string> {
  const names = new Set<string>();
  for (const raw of (text ?? "").split("\n")) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#") || INVALID.test(line)) continue;
    names.add(line);
  }
  return names;
}
