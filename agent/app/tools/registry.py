"""Tool schemas exposed to the LLM planner."""

from __future__ import annotations

# Tools that only read/query and never mutate system state. Used to restrict
# the operator console "analista" (read-only) mode.
READ_ONLY_TOOL_NAMES: frozenset[str] = frozenset(
    {
        "read_system",
        "search_available_properties",
        "get_property_media",
        "get_airbnb_link",
    }
)

TOOLS: list[dict] = [
    {
        "type": "function",
        "function": {
            "name": "search_available_properties",
            "description": (
                "Busca imóveis disponíveis para o período e critérios informados. "
                "Retorna até 3 imóveis com título, quartos, hóspedes máximos, preço base, "
                "taxa de limpeza, comodidades principais, foto principal e link do Airbnb. "
                "Use apenas quando tiver data de check-in, check-out e pelo menos um critério (quartos ou hóspedes)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "checkin": {
                        "type": "string",
                        "description": "Data de chegada no formato YYYY-MM-DD",
                    },
                    "checkout": {
                        "type": "string",
                        "description": "Data de saída no formato YYYY-MM-DD",
                    },
                    "bedrooms": {
                        "type": "integer",
                        "description": "Número mínimo de quartos desejado",
                    },
                    "guests": {
                        "type": "integer",
                        "description": "Número de hóspedes",
                    },
                    "max_results": {
                        "type": "integer",
                        "description": "Máximo de imóveis para retornar (padrão 3)",
                        "default": 3,
                    },
                },
                "required": ["checkin", "checkout"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_property_media",
            "description": (
                "Retorna fotos e vídeos adicionais de um imóvel específico. "
                "Use quando o cliente pedir para ver mais fotos, vídeos ou detalhes visuais de um imóvel."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "property_id": {
                        "type": "string",
                        "description": "ID do imóvel",
                    },
                    "media_type": {
                        "type": "string",
                        "enum": ["photos", "videos", "all"],
                        "description": "Tipo de mídia desejada",
                        "default": "all",
                    },
                },
                "required": ["property_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_airbnb_link",
            "description": (
                "Retorna o link do Airbnb para um imóvel específico. "
                "Use quando o cliente quiser fazer a reserva ou saber onde reservar."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "property_id": {
                        "type": "string",
                        "description": "ID do imóvel",
                    },
                },
                "required": ["property_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "notify_owner",
            "description": (
                "Notifica o proprietário da imobiliária que um cliente está interessado em fechar negócio. "
                "Use quando o cliente demonstrar intenção de reservar mas não houver link do Airbnb disponível, "
                "ou quando o cliente preferir ser atendido diretamente."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "property_id": {
                        "type": "string",
                        "description": "ID do imóvel de interesse",
                    },
                    "client_summary": {
                        "type": "string",
                        "description": "Resumo do interesse do cliente (datas, hóspedes, intenção)",
                    },
                },
                "required": ["property_id", "client_summary"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_system",
            "description": (
                "Consulta (somente leitura) dados de qualquer parte do sistema do tenant. "
                "Use para responder perguntas do operador/analista no console do dashboard ou "
                "para se informar antes de agir. NÃO altera nada. "
                "Recursos disponíveis: "
                "'leads' (lista de leads com status, temperatura, score, escalonamento), "
                "'conversations' (conversas ativas/recentes com canal, status, estágio), "
                "'properties' (imóveis com cidade, quartos, preço, status), "
                "'reservations' (reservas com datas, hóspedes, valores, pagamento), "
                "'transactions' (transações financeiras de receita/despesa), "
                "'clients' (clientes cadastrados), "
                "'dashboard' (resumo compacto: totais de leads por temperatura + escalonamentos, "
                "conversas ativas, imóveis ativos, reservas, e receita/despesa do mês atual). "
                "Para visão geral, prefira 'dashboard'. Retorna JSON compacto."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "resource": {
                        "type": "string",
                        "enum": [
                            "leads",
                            "conversations",
                            "properties",
                            "reservations",
                            "transactions",
                            "clients",
                            "dashboard",
                        ],
                        "description": "Qual recurso do sistema consultar",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Máximo de registros a retornar (padrão 50, máx 200). Ignorado para 'dashboard'.",
                        "default": 50,
                    },
                },
                "required": ["resource"],
            },
        },
    },
]
