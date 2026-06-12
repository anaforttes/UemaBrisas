def pode_gerenciar_equipe(user) -> bool:
    if not user or not user.is_authenticated:
        return False

    flags = user.access_flags or {}
    return bool(
        user.is_superuser
        or user.is_staff
        or user.role == 'Admin'
        or flags.get('superusuario')
        or flags.get('adminMunicipio')
    )
