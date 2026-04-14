# Padroes do Backend

- Cada modulo deve manter `views.py` focado em HTTP.
- Validacoes de entrada devem ficar em `serializadores.py`.
- Regras de negocio devem ficar em `servicos.py`.
- Regras de acesso devem ficar em `permissoes.py`.
- Alteracoes de banco devem passar por `models.py` e migrations.
