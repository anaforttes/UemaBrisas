def pode_editar_processo(user, processo) -> bool:
    if getattr(user, 'role', '') == 'Admin':
        return True
    return (
        processo.criado_por_id == user.pk or
        processo.technician_id == user.pk or
        processo.legal_id == user.pk
    )


def pode_deletar_processo(user, processo) -> bool:
    if getattr(user, 'role', '') == 'Admin':
        return True
    return processo.criado_por_id == user.pk
