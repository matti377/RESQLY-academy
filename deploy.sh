#!/usr/bin/env bash
#
# deploy.sh — Holt den aktuellen Stand und bringt ihn auf dem Ubuntu-Server
#             als systemd-Dienst zum Laufen.
#
#   ./deploy.sh              Stand holen, Dienst einrichten/neu starten, prüfen
#   ./deploy.sh --status     Nur nachsehen, was gerade läuft
#   ./deploy.sh --logs       Log mitlesen (Strg+C beendet)
#   ./deploy.sh --no-pull    Ohne git pull ausrollen (lokaler Stand)
#   ./deploy.sh --force      Auch neu starten, wenn gerade eine Challenge läuft
#
# Einstellungen: entweder als Umgebungsvariable oder in einer Datei
# `deploy.env` neben diesem Skript (wird nicht mitversioniert):
#
#   PORT=8000
#   HOST=127.0.0.1      # nur hinter nginx; ohne Proxy weglassen (0.0.0.0)
#   SERVICE=resqly-academy
#   RUN_USER=ekg
#
set -euo pipefail

# --------------------------------------------------------------- Grundlagen

HERE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"

[[ -f deploy.env ]] && { set -a; . ./deploy.env; set +a; }

PORT="${PORT:-8000}"
HOST="${HOST:-0.0.0.0}"
UNIT_DIR="${UNIT_DIR:-/etc/systemd/system}"
# Bestehende Installationen unter dem alten Dienstnamen behalten ihren Namen (und ihre Datenbank).
if [[ -z "${SERVICE:-}" ]]; then
  if [[ -f "${UNIT_DIR}/ekg-lernen.service" ]]; then SERVICE="ekg-lernen"; else SERVICE="resqly-academy"; fi
fi
RESQLY_DB_PATH="${RESQLY_DB_PATH:-/var/lib/${SERVICE}/academy.sqlite3}"
RUN_USER="${RUN_USER:-$(id -un)}"
UNIT="${UNIT_DIR}/${SERVICE}.service"

DO_PULL=1
FORCE=0
MODE="deploy"

for arg in "$@"; do
  case "$arg" in
    --status)  MODE="status" ;;
    --logs)    MODE="logs" ;;
    --no-pull) DO_PULL=0 ;;
    --force)   FORCE=1 ;;
    -h|--help) MODE="help" ;;
    *) echo "Unbekannte Option: $arg  (--help zeigt die Möglichkeiten)" >&2; exit 2 ;;
  esac
done

# Farben nur, wenn wirklich ein Terminal dranhängt.
if [[ -t 1 ]]; then
  B=$'\033[1m'; DIM=$'\033[2m'; GRN=$'\033[32m'; YEL=$'\033[33m'
  RED=$'\033[31m'; CYA=$'\033[36m'; N=$'\033[0m'
else
  B=""; DIM=""; GRN=""; YEL=""; RED=""; CYA=""; N=""
fi

step() { printf '\n%s==>%s %s%s%s\n' "$CYA" "$N" "$B" "$1" "$N"; }
ok()   { printf '    %s✓%s %s\n' "$GRN" "$N" "$1"; }
warn() { printf '    %s!%s %s\n' "$YEL" "$N" "$1"; }
info() { printf '    %s%s%s\n' "$DIM" "$1" "$N"; }
die()  { printf '\n%sFehler:%s %s\n\n' "$RED" "$N" "$1" >&2; exit 1; }

# sudo nur benutzen, wenn wir nicht ohnehin root sind.
if [[ $EUID -eq 0 ]]; then SUDO=""; elif command -v sudo >/dev/null 2>&1; then SUDO="sudo"; else SUDO=""; fi

need_root() {
  [[ -n "$SUDO" || $EUID -eq 0 ]] || die "Dafür werden Rechte via sudo gebraucht — bitte als Benutzer mit sudo ausführen."
}

lan_ip() {
  ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}' \
    || hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1"
}

show_help() {
  # Kopfkommentar ausgeben, bis die erste Nicht-Kommentarzeile kommt.
  awk 'NR>1 { if ($0 !~ /^#/) exit; sub(/^# ?/, ""); print }' "$0"
  exit 0
}

# ------------------------------------------------------------------ Zustand

print_status() {
  step "Zustand"
  if systemctl list-unit-files "${SERVICE}.service" >/dev/null 2>&1 && \
     [[ -f "$UNIT" ]]; then
    local act ena
    act="$(systemctl is-active "$SERVICE" 2>/dev/null || true)"
    ena="$(systemctl is-enabled "$SERVICE" 2>/dev/null || true)"
    info "Dienst:   ${SERVICE} (${act:-unbekannt}, ${ena:-unbekannt})"
  else
    info "Dienst:   noch nicht eingerichtet"
  fi
  info "Ordner:   $HERE"
  info "Port:     $PORT"
  if git rev-parse --git-dir >/dev/null 2>&1; then
    info "Stand:    $(git log -1 --format='%h %s' 2>/dev/null || echo '—')"
    info "Branch:   $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '—')"
  fi
  local reply
  if reply="$(curl -fsS --max-time 3 "http://127.0.0.1:${PORT}/api/ping" 2>/dev/null)"; then
    ok "Antwortet auf Port ${PORT} — ${reply}"
  else
    warn "Keine Antwort auf Port ${PORT}"
  fi
  printf '\n'
}

case "$MODE" in
  help)   show_help ;;
  status) print_status; exit 0 ;;
  logs)   exec journalctl -u "$SERVICE" -f -n 50 ;;
esac

# ------------------------------------------------------------------ Prüfen

step "Voraussetzungen"

command -v python3 >/dev/null 2>&1 || die "python3 fehlt.  sudo apt install -y python3"
ok "python3 $(python3 -c 'import platform;print(platform.python_version())')"

command -v systemctl >/dev/null 2>&1 || die "systemd nicht gefunden — dieses Skript ist für Ubuntu gedacht."
[[ -f server.py && -f index.html ]] || die "server.py oder index.html fehlt. Läuft das Skript im richtigen Ordner?"
ok "Projektdateien vollständig"

# server.py ist reine Standardbibliothek — es gibt nichts zu installieren.
python3 -c "import http.server, json, socket, threading" 2>/dev/null \
  || die "Die Python-Standardbibliothek ist unvollständig.  sudo apt install -y python3"
ok "Keine zusätzlichen Pakete nötig"

id -u "$RUN_USER" >/dev/null 2>&1 || die "Benutzer '$RUN_USER' gibt es nicht. RUN_USER in deploy.env anpassen."

# ------------------------------------------------------------------- Holen

if [[ $DO_PULL -eq 1 ]]; then
  step "Stand holen"
  git rev-parse --git-dir >/dev/null 2>&1 || die "Das hier ist kein Git-Repository."

  if [[ -n "$(git status --porcelain)" ]]; then
    printf '\n'
    git status --short
    die "Es gibt lokale Änderungen. Bitte committen, verwerfen (git checkout -- .) oder mit --no-pull ausrollen."
  fi

  branch="$(git rev-parse --abbrev-ref HEAD)"
  before="$(git rev-parse HEAD)"

  git fetch --quiet origin "$branch" || die "git fetch fehlgeschlagen. Zugriff auf das Repository prüfen (Deploy-Key oder SSH-Remote)."

  # --ff-only: lieber abbrechen als still einen Merge bauen.
  if ! git merge --ff-only "origin/${branch}" --quiet 2>/dev/null; then
    die "Kein schneller Vorlauf möglich — der Server ist vom Remote abgewichen. Von Hand klären."
  fi

  after="$(git rev-parse HEAD)"
  if [[ "$before" == "$after" ]]; then
    ok "Schon aktuell — $(git log -1 --format='%h %s')"
  else
    ok "Aktualisiert auf $(git log -1 --format='%h %s')"
    info "Geänderte Dateien:"
    git --no-pager diff --name-only "$before" "$after" | sed 's/^/      /'
  fi
else
  step "Stand holen"
  warn "Übersprungen (--no-pull) — es wird der lokale Stand ausgerollt."
fi

# Das PDF liegt fertig im Repository und wird hier bewusst *nicht* neu gebaut:
# ein neu erzeugtes PDF würde den Arbeitsbereich verändern und den nächsten
# `git pull --ff-only` blockieren. Gebaut wird lokal, eingecheckt wird das
# Ergebnis.
[[ -f EKG-Skript.pdf ]] && ok "Skript-PDF vorhanden ($(du -h EKG-Skript.pdf | cut -f1))"

# ----------------------------------------------------------------- Dienst

step "Dienst einrichten"

TMP_UNIT="$(mktemp)"
trap 'rm -f "$TMP_UNIT"' EXIT

cat > "$TMP_UNIT" <<UNIT
[Unit]
Description=Resqly Academy — Kursseiten und Challenge-Server
Documentation=https://github.com/matti377/Resqly-Academy
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${RUN_USER}
WorkingDirectory=${HERE}
Environment=PORT=${PORT}
Environment=HOST=${HOST}
Environment=PYTHONUNBUFFERED=1
Environment=RESQLY_DB_PATH=${RESQLY_DB_PATH}
StateDirectory=${SERVICE}
StateDirectoryMode=0700
ExecStart=$(command -v python3) ${HERE}/server.py
Restart=always
RestartSec=3

# Kursdateien bleiben geschützt; SQLite liegt im persistenten StateDirectory.
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=read-only
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictSUIDSGID=true
UNIT

# Ports unter 1024 darf ein Dienst ohne Root sonst nicht belegen.
if [[ "$PORT" -lt 1024 ]]; then
  cat >> "$TMP_UNIT" <<'CAPS'
AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
CAPS
fi

cat >> "$TMP_UNIT" <<'UNIT_TAIL'

[Install]
WantedBy=multi-user.target
UNIT_TAIL

if [[ -f "$UNIT" ]] && cmp -s "$TMP_UNIT" "$UNIT"; then
  ok "Dienstdefinition unverändert"
  RELOAD=0
else
  need_root
  $SUDO install -m 644 "$TMP_UNIT" "$UNIT"
  ok "Dienstdefinition geschrieben: $UNIT"
  RELOAD=1
fi

if [[ $RELOAD -eq 1 ]]; then
  need_root
  $SUDO systemctl daemon-reload
  ok "systemd neu eingelesen"
fi

if ! systemctl is-enabled --quiet "$SERVICE" 2>/dev/null; then
  need_root
  $SUDO systemctl enable --quiet "$SERVICE"
  ok "Dienst startet künftig automatisch mit"
fi

# ------------------------------------------------- Laufende Challenge schützen

if [[ $FORCE -eq 0 ]]; then
  # Antwort mit python3 auswerten statt mit sed — die Regex-Dialekte von
  # BSD und GNU unterscheiden sich, und python3 ist ohnehin Voraussetzung.
  running_lobbies="$(curl -fsS --max-time 3 "http://127.0.0.1:${PORT}/api/ping" 2>/dev/null \
    | python3 -c 'import sys,json; print(json.load(sys.stdin).get("lobbies",0))' 2>/dev/null || true)"
  if [[ "${running_lobbies:-0}" =~ ^[0-9]+$ && "$running_lobbies" -gt 0 ]]; then
    printf '\n'
    warn "Gerade ${running_lobbies} Challenge-Lobby(s) aktiv."
    warn "Ein Neustart wirft alle Mitspielenden heraus (die Lobbys liegen nur im Speicher)."
    if [[ -t 0 ]]; then
      read -r -p "    Trotzdem neu starten? [j/N] " answer
      [[ "$answer" =~ ^([jJ]|[yY])$ ]] || die "Abgebrochen. Später erneut ausführen oder --force verwenden."
    else
      die "Abgebrochen. Mit --force trotzdem neu starten."
    fi
  fi
fi

# ------------------------------------------------------------------ Starten

step "Dienst neu starten"
need_root
$SUDO systemctl restart "$SERVICE"

# Kurz warten, bis der Port antwortet — sonst meldet das Skript zu früh Erfolg.
health=""
for _ in $(seq 1 20); do
  if health="$(curl -fsS --max-time 2 "http://127.0.0.1:${PORT}/api/ping" 2>/dev/null)"; then
    break
  fi
  sleep 0.5
done

if [[ -z "$health" ]]; then
  printf '\n'
  $SUDO systemctl status "$SERVICE" --no-pager --lines 20 || true
  die "Der Dienst antwortet nicht auf Port ${PORT}. Log ansehen mit: ./deploy.sh --logs"
fi
ok "Antwortet auf Port ${PORT} — ${health}"

# Auch die eigentliche Seite kurz prüfen, nicht nur die API.
if curl -fsS --max-time 3 -o /dev/null "http://127.0.0.1:${PORT}/index.html"; then
  ok "Seite wird ausgeliefert"
else
  warn "Die API antwortet, index.html aber nicht — Dateirechte prüfen."
fi

# --------------------------------------------------------------- Abschluss

IP="$(lan_ip)"
printf '\n%s==>%s %sFertig%s\n' "$GRN" "$N" "$B" "$N"
if [[ "$HOST" == "127.0.0.1" ]]; then
  info "Nur lokal gebunden — von außen über den Reverse-Proxy (nginx)."
else
  info "Im Netz:      http://${IP}:${PORT}/"
fi
info "Auf dem Host: http://localhost:${PORT}/"
info "Stand:        $(git log -1 --format='%h %s' 2>/dev/null || echo '—')"
printf '\n'
info "Log mitlesen: ./deploy.sh --logs"
info "Nachsehen:    ./deploy.sh --status"

# Hinweis zur Firewall — bewusst nur ein Hinweis, keine stille Änderung.
if command -v ufw >/dev/null 2>&1 && $SUDO ufw status 2>/dev/null | grep -q "Status: active"; then
  if ! $SUDO ufw status 2>/dev/null | grep -qE "(^|[[:space:]])${PORT}(/tcp)?[[:space:]]"; then
    printf '\n'
    warn "ufw ist aktiv, Port ${PORT} scheint aber nicht freigegeben. Falls von außen nicht erreichbar:"
    info "  sudo ufw allow ${PORT}/tcp"
  fi
fi
printf '\n'
