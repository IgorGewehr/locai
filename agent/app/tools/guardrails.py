"""Pydantic-backed guardrails for tool arguments.

Defense in depth on top of registry validation:
  1. Role gating for operator-mode (viewer can't reach destructive tools).
  2. Semantic checks (date plausibility, appointmentType whitelist, etc).
  3. The HARD rule: appointments_create.appointmentType must be one of
     {visit, key_pickup, support}. The system never books reservations.
"""

from __future__ import annotations

import re
from datetime import date
from typing import Any

ROLE_RANK = {"founder": 100, "admin": 80, "manager": 60, "operator": 40, "viewer": 20}

TOOL_MIN_ROLE: dict[str, str] = {
    # Lead pipeline writes — manager+
    "crm_update_lead_stage": "manager",
    # Memory writes — manager+
    "memory_remember": "manager",
}


class GuardrailViolation(Exception):
    pass


_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_TIME_RE = re.compile(r"^\d{2}:\d{2}$")


# Whitelisted appointment types — enforced even if the registry would also
# reject. This is the system's most important business invariant: the agent
# may NEVER schedule a property reservation. Reservations live on Airbnb.
ALLOWED_APPOINTMENT_TYPES = {"visit", "key_pickup", "support"}


def check_role_allowed(tool_name: str, role: str | None) -> None:
    if not role:
        return
    min_role = TOOL_MIN_ROLE.get(tool_name)
    if not min_role:
        return
    if ROLE_RANK.get(role, 0) < ROLE_RANK.get(min_role, 40):
        raise GuardrailViolation(
            f"Sua role '{role}' não tem permissão para executar '{tool_name}' "
            f"(requer '{min_role}' ou superior)."
        )


def _check_plausible_date(value: str | None, *, past_ok: bool = True, future_years: int = 2) -> None:
    if not value:
        return
    if not _DATE_RE.match(value):
        raise GuardrailViolation(f"Data inválida (esperado YYYY-MM-DD): {value!r}")
    try:
        d = date.fromisoformat(value)
    except Exception as err:
        raise GuardrailViolation(f"Data não parseável: {value!r}") from err
    today = date.today()
    if not past_ok and d < today:
        raise GuardrailViolation(f"Data não pode ser no passado: {value}")
    if (d - today).days > future_years * 365:
        raise GuardrailViolation(f"Data muito distante no futuro ({value}); confirme antes.")


def _check_appointments_create(args: dict[str, Any]) -> None:
    apt_type = args.get("appointmentType")
    if apt_type not in ALLOWED_APPOINTMENT_TYPES:
        raise GuardrailViolation(
            f"appointmentType inválido: {apt_type!r}. Apenas {sorted(ALLOWED_APPOINTMENT_TYPES)} "
            "são permitidos. O sistema NÃO agenda reservas de imóvel — para reservar, "
            "use share_airbnb_link."
        )
    _check_plausible_date(args.get("scheduledDate"), past_ok=False, future_years=1)
    t = args.get("scheduledTime")
    if t is not None and not _TIME_RE.match(str(t)):
        raise GuardrailViolation(f"scheduledTime inválido (HH:MM): {t!r}")
    dur = args.get("duration")
    if dur is not None and (not isinstance(dur, int) or dur < 15 or dur > 240):
        raise GuardrailViolation(f"duration fora do range 15..240: {dur}")


def _check_ical_check_availability(args: dict[str, Any]) -> None:
    _check_plausible_date(args.get("checkIn"))
    _check_plausible_date(args.get("checkOut"))
    if args.get("checkIn") and args.get("checkOut") and args["checkIn"] >= args["checkOut"]:
        raise GuardrailViolation("checkOut deve ser depois de checkIn (Airbnb é exclusivo).")


def _check_share_airbnb_link(args: dict[str, Any]) -> None:
    msg = args.get("message")
    if msg is not None and len(msg) > 500:
        raise GuardrailViolation(f"message excede 500 chars ({len(msg)})")


def _check_memory_remember(args: dict[str, Any]) -> None:
    text = (args.get("text") or "").strip()
    if len(text) < 3:
        raise GuardrailViolation("text muito curto para ser um fato utilizável")
    if len(text) > 500:
        raise GuardrailViolation(f"text excede 500 chars ({len(text)})")
    conf = args.get("confidence")
    if conf is not None and (not isinstance(conf, (int, float)) or conf < 0 or conf > 1):
        raise GuardrailViolation(f"confidence fora do range 0..1: {conf}")


def _check_conversations_send_media(args: dict[str, Any]) -> None:
    urls = args.get("mediaUrls") or []
    if not urls:
        raise GuardrailViolation("mediaUrls vazio")
    if len(urls) > 10:
        raise GuardrailViolation(f"máximo 10 URLs, recebido {len(urls)}")
    for i, u in enumerate(urls):
        if not isinstance(u, str) or not u.startswith("http"):
            raise GuardrailViolation(f"mediaUrls[{i}] inválido — URL absoluta esperada")


SEMANTIC_CHECKS: dict[str, Any] = {
    "appointments_create": _check_appointments_create,
    "appointments_update": _check_appointments_create,
    "ical_check_availability": _check_ical_check_availability,
    "share_airbnb_link": _check_share_airbnb_link,
    "memory_remember": _check_memory_remember,
    "conversations_send_media": _check_conversations_send_media,
}


def check_tool_call(
    tool_name: str,
    args: dict[str, Any],
    *,
    operator_role: str | None = None,
) -> list[str]:
    """Returns a list of human-readable violation messages. Empty = ok."""
    errors: list[str] = []
    try:
        check_role_allowed(tool_name, operator_role)
    except GuardrailViolation as ex:
        errors.append(str(ex))
    check = SEMANTIC_CHECKS.get(tool_name)
    if check:
        try:
            check(args)
        except GuardrailViolation as ex:
            errors.append(str(ex))
    return errors
