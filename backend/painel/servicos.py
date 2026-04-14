# Regras de negocio do app painel.
def obter_dashboard():
    return {
        "cards": {
            "ativos": 1,
            "em_revisao": 0,
            "concluidos": 0
        },
        "recentes": [
            {
                "id": 1,
                "nome": "Núcleo Habitacional Esperança",
                "modalidade": "REURB-S",
                "status": "LEVANTAMENTO TÉCNICO",
                "progresso": 35
            }
        ]
    }