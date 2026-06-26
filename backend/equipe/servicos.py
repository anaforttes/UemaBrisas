# Regras de negocio do app equipe.
from autenticacao.models import CustomUser


def listar_usuarios_ativos() -> list[dict]:
    qs = CustomUser.objects.filter(is_active=True).values('id', 'name', 'email', 'role')
    return list(qs)
