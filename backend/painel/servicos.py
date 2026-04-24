from processos.models import Processo


def obter_dashboard():
    processos = Processo.objects.all().order_by('-created_at')

    cards = {
        "ativos": processos.exclude(
            status__in=["Concluído", "Finalizado", "Cancelado", "Arquivado"]
        ).count(),
        "em_revisao": processos.filter(
            status__in=["Em Análise", "Análise Jurídica", "Diligência"]
        ).count(),
        "concluidos": processos.filter(
            status__in=["Concluído", "Finalizado"]
        ).count(),
    }

    recentes = []
    for processo in processos[:5]:
        recentes.append({
            "id": processo.id,
            "nome": processo.title,
            "applicant": processo.applicant,
            "requerente": processo.applicant,
            "modalidade": processo.modality,
            "status": processo.get_status_display(),
            "progresso": processo.progress,
            "responsavel": processo.responsible_name,
        })

    return {
        "cards": cards,
        "recentes": recentes
    }