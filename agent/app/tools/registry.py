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
                        "description": "Máximo de imóveis para retornar (padrão 3, máximo 5)",
                        "default": 3,
                        "minimum": 1,
                        "maximum": 5,
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
                "Use SOMENTE quando o cliente demonstrar interesse claro em um imóvel e quiser "
                "ver mais fotos, vídeos ou como é por dentro. Nunca envie mídia sem o cliente pedir "
                "ou demonstrar interesse. Requer o property_id retornado por search_available_properties."
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
                "Aciona o time humano / proprietário e escala o atendimento. "
                "Use quando: (1) o cliente quer fechar ou agendar uma visita e NÃO há link do Airbnb, "
                "(2) o cliente pede explicitamente para falar com uma pessoa/atendente, ou "
                "(3) a conversa precisa de um humano (caso fora do seu alcance). "
                "Envie um resumo curto do interesse (nome, datas, hóspedes, o que o cliente quer)."
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
    {
        "type": "function",
        "function": {
            "name": "schedule_visit",
            "description": (
                "Agenda uma visita presencial a um imóvel para o cliente. "
                "Use quando o cliente quiser visitar e já tiverem combinado dia e horário. "
                "Confirme a data e o horário com o cliente ANTES de agendar. "
                "A visita aparece na Agenda da imobiliária. "
                "Datas no formato YYYY-MM-DD e horário no formato HH:MM."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "property_id": {
                        "type": "string",
                        "description": "ID do imóvel a visitar (se houver)",
                    },
                    "scheduled_date": {
                        "type": "string",
                        "description": "Data da visita no formato YYYY-MM-DD",
                    },
                    "scheduled_time": {
                        "type": "string",
                        "description": "Horário da visita no formato HH:MM",
                    },
                    "notes": {
                        "type": "string",
                        "description": "Observações do cliente sobre a visita (opcional)",
                    },
                },
                "required": ["scheduled_date", "scheduled_time"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "report_issue",
            "description": (
                "Abre um chamado de suporte/manutenção quando um cliente que JÁ está hospedado/alugando "
                "relata um problema no imóvel (ex.: algo quebrado, vazamento, ar-condicionado com defeito). "
                "Registra o chamado e avisa a equipe/proprietário. "
                "Descreva o problema com clareza e marque a urgência."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "issue": {
                        "type": "string",
                        "description": "Descrição do problema relatado pelo cliente",
                    },
                    "property_id": {
                        "type": "string",
                        "description": "ID do imóvel com o problema (se souber)",
                    },
                    "urgency": {
                        "type": "string",
                        "enum": ["baixa", "media", "alta"],
                        "description": "Urgência do chamado",
                        "default": "media",
                    },
                },
                "required": ["issue"],
            },
        },
    },
]
