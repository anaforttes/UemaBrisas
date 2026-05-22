from processos.models import Processo


def obter_dashboard(status_filtro=None):
    processos_base = Processo.objects.all().order_by("-created_at")
    processos = processos_base

    if status_filtro:
        mapa_status = {
            "em_edicao": ["Em Edição"],
            "em_revisao": [
                "Em Revisão",
                "Em Análise",
                "Análise Jurídica",
                "Diligência",
            ],
            "pendente": ["Pendente"],
            "assinado": ["Assinado"],
            "arquivado": ["Arquivado"],
            "concluido": ["Concluído", "Finalizado"],
            "ativo": ["Em Andamento"],
        }

        status_validos = mapa_status.get(status_filtro)

        if status_validos:
            processos = processos.filter(status__in=status_validos)

    cards = {
        "ativos": processos_base.filter(status="Em Andamento").count(),
        "em_revisao": processos_base.filter(
            status__in=["Em Revisão", "Em Análise", "Análise Jurídica", "Diligência"]
        ).count(),
        "concluidos": processos_base.filter(
            status__in=["Concluído", "Finalizado"]
        ).count(),
    }

    status_resumo = {
        "em_edicao": processos_base.filter(status="Em Edição").count(),
        "em_revisao": processos_base.filter(
            status__in=["Em Revisão", "Em Análise", "Análise Jurídica", "Diligência"]
        ).count(),
        "pendente": processos_base.filter(status="Pendente").count(),
        "assinado": processos_base.filter(status="Assinado").count(),
        "arquivado": processos_base.filter(status="Arquivado").count(),
    }

    recentes = []
    for processo in processos[:5]:
        status = processo.get_status_display()

        recentes.append({
            "id": processo.id,
            "nome": processo.title,
            "title": processo.title,
            "applicant": processo.applicant,
            "requerente": processo.applicant,
            "modalidade": processo.modality,
            "modality": processo.modality,
            "status": status,
            "progresso": processo.progress,
            "progress": processo.progress,
            "responsavel": processo.responsible_name,
            "responsibleName": processo.responsible_name,
        })

    return {
        "cards": cards,
        "status": status_resumo,
        "recentes": recentes,
    }
