"""Brasileirão 2026 teams — names, keys and Transfermarkt logo IDs."""

from __future__ import annotations

BRASILEIRAO_TEAMS: tuple[dict[str, str | int], ...] = (
    {"key": "athletico", "label": "Athletico", "name": "Athletico", "tm_id": 679, "accent": "#c8102e"},
    {"key": "atletico_mineiro", "label": "Atlético Mineiro", "name": "Atlético Mineiro", "tm_id": 330, "accent": "#1a1a1a"},
    {"key": "bahia", "label": "Bahia", "name": "Bahia", "tm_id": 1005, "accent": "#005ca9"},
    {"key": "botafogo", "label": "Botafogo", "name": "Botafogo", "tm_id": 537, "accent": "#1f1f1f"},
    {"key": "chapecoense", "label": "Chapecoense", "name": "Chapecoense", "tm_id": 6790, "accent": "#006633"},
    {"key": "corinthians", "label": "Corinthians", "name": "Corinthians", "tm_id": 199, "accent": "#1a1a1a"},
    {"key": "coritiba", "label": "Coritiba", "name": "Coritiba", "tm_id": 776, "accent": "#006633"},
    {"key": "cruzeiro", "label": "Cruzeiro", "name": "Cruzeiro", "tm_id": 2036, "accent": "#0033a0"},
    {"key": "flamengo", "label": "Flamengo", "name": "Flamengo", "tm_id": 614, "accent": "#c8102e"},
    {"key": "fluminense", "label": "Fluminense", "name": "Fluminense", "tm_id": 2462, "accent": "#7a263a"},
    {"key": "gremio", "label": "Grêmio", "name": "Grêmio", "tm_id": 144, "accent": "#0099d8"},
    {"key": "internacional", "label": "Internacional", "name": "Internacional", "tm_id": 6600, "accent": "#c8102e"},
    {"key": "mirassol", "label": "Mirassol", "name": "Mirassol", "tm_id": 10997, "accent": "#f4c430"},
    {"key": "palmeiras", "label": "Palmeiras", "name": "Palmeiras", "tm_id": 1023, "accent": "#006437"},
    {"key": "red_bull_bragantino", "label": "Red Bull Bragantino", "name": "Red Bull Bragantino", "tm_id": 8793, "accent": "#c8102e"},
    {"key": "remo", "label": "Remo", "name": "Remo", "tm_id": 10870, "accent": "#0033a0"},
    {"key": "santos", "label": "Santos", "name": "Santos", "tm_id": 221, "accent": "#1a1a1a"},
    {"key": "sao_paulo", "label": "São Paulo", "name": "São Paulo", "tm_id": 585, "accent": "#c8102e"},
    {"key": "vasco_da_gama", "label": "Vasco da Gama", "name": "Vasco da Gama", "tm_id": 5370, "accent": "#1a1a1a"},
    {"key": "vitoria", "label": "Vitória", "name": "Vitória", "tm_id": 2125, "accent": "#c8102e"},
)

TEAM_NAME_TO_KEY: dict[str, str] = {str(t["name"]): str(t["key"]) for t in BRASILEIRAO_TEAMS}
TEAM_KEY_TO_NAME: dict[str, str] = {str(t["key"]): str(t["name"]) for t in BRASILEIRAO_TEAMS}


def team_logo_url(tm_id: int) -> str:
    return f"https://tmssl.akamaized.net/images/wappen/head/{tm_id}.png"
