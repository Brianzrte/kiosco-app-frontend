#!/usr/bin/env bash
# Sincroniza ai/skills/ (fuente canónica) hacia .claude/skills/.
#
# Uso:
#   scripts/ai/sync-skills.sh
#   scripts/ai/sync-skills.sh --dry-run
#
# Codex consume ai/skills/ directamente por AGENTS.md. Claude Code descubre las
# copias generadas. Las skills propias de Claude/OpenSpec no se pisan.
set -euo pipefail

if [[ ! -f package.json ]] || [[ ! -d ai/skills ]]; then
	echo "error: ejecutar desde la raíz del frontend" >&2
	exit 2
fi

src_dir="ai/skills"
dest_dir=".claude/skills"
marker=".ai-generated"
marker_line="<!-- GENERADO por scripts/ai/sync-skills.sh desde ai/skills/ — NO EDITAR. -->"
dry_run=0

if [[ "${1:-}" == "--dry-run" ]]; then
	dry_run=1
elif [[ $# -gt 0 ]]; then
	echo "uso: scripts/ai/sync-skills.sh [--dry-run]" >&2
	exit 2
fi

remove_generated_dir() {
	local dir="$1"
	case "${dir}" in
	"${dest_dir}"/*) ;;
	*)
		echo "error: destino fuera de ${dest_dir}: ${dir}" >&2
		return 1
		;;
	esac

	[[ -d "${dir}" ]] || return 0
	if [[ ! -f "${dir}/${marker}" ]]; then
		echo "  conservada (no generada): $(basename "${dir}")"
		return 0
	fi
	if [[ ${dry_run} -eq 1 ]]; then
		echo "  [dry-run] eliminaría ${dir}"
		return 0
	fi
	rm -rf -- "${dir}"
}

copy_with_marker() {
	local src="$1"
	local dest="$2"
	if [[ "$(basename "${src}")" != "SKILL.md" ]]; then
		cp -- "${src}" "${dest}"
		return
	fi

	awk -v marker="${marker_line}" '
		NR == 1 && $0 == "---" { print; in_frontmatter = 1; next }
		in_frontmatter && $0 == "---" {
			print
			print marker
			in_frontmatter = 0
			inserted = 1
			next
		}
		!inserted && NR == 1 {
			print marker
			print ""
			print
			inserted = 1
			next
		}
		{ print }
	' "${src}" >"${dest}"
}

declare -a source_skills=()
for dir in "${src_dir}"/*/; do
	[[ -d "${dir}" ]] || continue
	if [[ ! -f "${dir}SKILL.md" ]]; then
		echo "aviso: $(basename "${dir}") no tiene SKILL.md; se omite" >&2
		continue
	fi
	source_skills+=("$(basename "${dir}")")
done

if [[ ${#source_skills[@]} -eq 0 ]]; then
	echo "error: no hay skills en ${src_dir}" >&2
	exit 1
fi

echo "Fuente: ${src_dir}/"
echo "Destino: ${dest_dir}/"
[[ ${dry_run} -eq 1 ]] && echo "Modo: dry-run"

if [[ -d "${dest_dir}" ]]; then
	for dir in "${dest_dir}"/*/; do
		[[ -d "${dir}" ]] || continue
		name="$(basename "${dir}")"
		present=0
		for source_name in "${source_skills[@]}"; do
			if [[ "${source_name}" == "${name}" ]]; then
				present=1
				break
			fi
		done
		if [[ ${present} -eq 0 ]] && [[ -f "${dir}${marker}" ]]; then
			remove_generated_dir "${dir%/}"
		fi
	done
fi

for name in "${source_skills[@]}"; do
	src="${src_dir}/${name}"
	dest="${dest_dir}/${name}"

	if [[ -d "${dest}" ]] && [[ ! -f "${dest}/${marker}" ]]; then
		echo "OMITIDA ${name}: existe una skill no generada con ese nombre"
		continue
	fi
	if [[ ${dry_run} -eq 1 ]]; then
		echo "[dry-run] ${src}/ -> ${dest}/"
		continue
	fi

	remove_generated_dir "${dest}"
	mkdir -p -- "${dest}"

	count=0
	while IFS= read -r file; do
		relative="${file#"${src}/"}"
		target="${dest}/${relative}"
		mkdir -p -- "$(dirname "${target}")"
		copy_with_marker "${file}" "${target}"
		count=$((count + 1))
	done < <(find "${src}" -type f | sort)

	printf '%s\n' \
		"Copia generada por scripts/ai/sync-skills.sh" \
		"Fuente canónica: ${src}/" \
		"No editar: se reemplaza en la próxima sincronización." \
		>"${dest}/${marker}"
	echo "Sincronizada ${name} (${count} archivo(s))"
done

echo "Total: ${#source_skills[@]} skills compartidas"
