from django.utils import timezone
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from autenticacao.models import CustomUser
from autenticacao.sse import sse_broadcast
from .models import (
    Documento, ColaboradorDocumento, ComentarioDocumento,
    VersaoDocumento, ConviteDocumento, AuditoriaDocumento,
    PresencaDocumento, ModeloDocumento, AssinaturaDocumento,
)
from .serializadores import (
    DocumentoListSerializer, DocumentoDetalheSerializer,
    ColaboradorSerializer, ComentarioSerializer,
    VersaoSerializer, VersaoComConteudoSerializer,
    AssinaturaSerializer, ModeloDocumentoSerializer,
)
from .servicos import (
    criar_documento, salvar_versao, adicionar_colaborador,
    iniciar_assinaturas, registrar_assinatura,
    gerar_convite, aceitar_convite, registrar_auditoria, atualizar_presenca,
)
from notificacoes.servicos import criar_notificacao


def _sse_doc(doc_id, doc_ref, tipo, autor_nome):
    try:
        sse_broadcast('doc_update', {
            'doc_id':  str(doc_id),
            'doc_ref': doc_ref,
            'tipo':    tipo,
            'autor':   autor_nome,
        })
    except Exception:
        pass


def _pode_editar(request, doc):
    if doc.criado_por == request.user:
        return True
    collab = doc.colaboradores.filter(usuario=request.user).first()
    return collab is not None and collab.papel == 'editor'


def _pode_ver(request, doc):
    if doc.criado_por == request.user:
        return True
    return doc.colaboradores.filter(usuario=request.user).exists()


# ─── Documentos ───────────────────────────────────────────────────────────────

class DocumentoListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        doc_ref    = request.query_params.get('doc_ref', '')
        processo_id = request.query_params.get('processo_id', '')
        if doc_ref:
            docs = Documento.objects.filter(doc_ref=doc_ref)
            docs = [d for d in docs if _pode_ver(request, d)]
        elif processo_id:
            docs = Documento.objects.filter(processo_id=processo_id)
            docs = [d for d in docs if _pode_ver(request, d)]
        else:
            from django.db.models import Q
            docs = Documento.objects.filter(
                Q(criado_por=request.user) | Q(colaboradores__usuario=request.user)
            ).distinct()
        return Response(DocumentoListSerializer(docs, many=True).data)

    def post(self, request):
        doc = criar_documento(request.user, request.data)
        return Response(DocumentoDetalheSerializer(doc).data, status=status.HTTP_201_CREATED)


class DocumentoDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_doc(self, pk, request, exige_edicao=False):
        try:
            doc = Documento.objects.get(pk=pk)
        except Documento.DoesNotExist:
            return None, Response({'erro': 'Documento não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if exige_edicao and not _pode_editar(request, doc):
            return None, Response({'erro': 'Sem permissão para editar.'}, status=status.HTTP_403_FORBIDDEN)
        if not exige_edicao and not _pode_ver(request, doc):
            return None, Response({'erro': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)
        return doc, None

    def get(self, request, pk):
        doc, err = self._get_doc(pk, request)
        if err:
            return err
        return Response(DocumentoDetalheSerializer(doc).data)

    def patch(self, request, pk):
        doc, err = self._get_doc(pk, request, exige_edicao=True)
        if err:
            return err
        data = request.data
        if 'titulo' in data:
            doc.titulo = data['titulo']
        if 'status' in data:
            doc.status = data['status']
        if 'cabecalho' in data:
            doc.cabecalho = data['cabecalho']
        if 'rodape' in data:
            doc.rodape = data['rodape']
        doc.save()
        return Response(DocumentoDetalheSerializer(doc).data)

    def delete(self, request, pk):
        doc, err = self._get_doc(pk, request, exige_edicao=True)
        if err:
            return err
        if doc.criado_por != request.user:
            return Response({'erro': 'Apenas o criador pode excluir.'}, status=status.HTTP_403_FORBIDDEN)
        doc.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Salvar versão ────────────────────────────────────────────────────────────

class SalvarVersaoView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, doc_id):
        try:
            doc = Documento.objects.get(pk=doc_id)
        except Documento.DoesNotExist:
            return Response({'erro': 'Não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if not _pode_editar(request, doc):
            return Response({'erro': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)

        # Locking otimista: detecta conflito se versão esperada não bate
        versao_esperada = request.data.get('versao_esperada')
        if versao_esperada is not None:
            try:
                versao_esperada = int(versao_esperada)
            except (TypeError, ValueError):
                versao_esperada = None
        if versao_esperada is not None and doc.versao_atual > versao_esperada:
            ultima = doc.versoes.select_related('autor').first()
            autor_conflito = ultima.autor.name if ultima and ultima.autor else 'outro usuário'
            return Response({
                'conflito': True,
                'versao_atual': doc.versao_atual,
                'conteudo_atual': doc.conteudo,
                'titulo_atual': doc.titulo,
                'autor_ultima_versao': autor_conflito,
            }, status=status.HTTP_409_CONFLICT)

        versao, doc = salvar_versao(
            doc, request.user,
            conteudo=request.data.get('conteudo', doc.conteudo),
            titulo=request.data.get('titulo', doc.titulo),
            descricao=request.data.get('descricao', ''),
            status_novo=request.data.get('status'),
        )
        _sse_doc(doc.id, doc.doc_ref, 'conteudo', request.user.name)

        return Response({
            'versao': VersaoSerializer(versao).data,
            'documento': DocumentoDetalheSerializer(doc).data,
        }, status=status.HTTP_201_CREATED)


# ─── Histórico de versões ─────────────────────────────────────────────────────

class VersaoListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, doc_id):
        try:
            doc = Documento.objects.get(pk=doc_id)
        except Documento.DoesNotExist:
            return Response({'erro': 'Não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if not _pode_ver(request, doc):
            return Response({'erro': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)
        versoes = doc.versoes.all()[:50]
        return Response(VersaoSerializer(versoes, many=True).data)


class VersaoConteudoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, doc_id, versao_num):
        try:
            doc = Documento.objects.get(pk=doc_id)
        except Documento.DoesNotExist:
            return Response({'erro': 'Não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if not _pode_ver(request, doc):
            return Response({'erro': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            versao = doc.versoes.get(numero=versao_num)
        except VersaoDocumento.DoesNotExist:
            return Response({'erro': 'Versão não encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(VersaoComConteudoSerializer(versao).data)


# ─── Colaboradores ────────────────────────────────────────────────────────────

class ColaboradorView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, doc_id):
        try:
            doc = Documento.objects.get(pk=doc_id)
        except Documento.DoesNotExist:
            return Response({'erro': 'Não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if not _pode_ver(request, doc):
            return Response({'erro': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(ColaboradorSerializer(doc.colaboradores.all(), many=True).data)

    def post(self, request, doc_id):
        try:
            doc = Documento.objects.get(pk=doc_id)
        except Documento.DoesNotExist:
            return Response({'erro': 'Não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if not _pode_editar(request, doc):
            return Response({'erro': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)

        usuario_id = request.data.get('usuario_id')
        papel      = request.data.get('papel', 'editor')
        try:
            usuario = CustomUser.objects.get(pk=usuario_id)
        except CustomUser.DoesNotExist:
            return Response({'erro': 'Usuário não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if usuario == doc.criado_por:
            return Response({'erro': 'O criador já tem acesso.'}, status=status.HTTP_400_BAD_REQUEST)

        colab, _ = adicionar_colaborador(doc, usuario, papel)
        _sse_doc(doc.id, doc.doc_ref, 'colaborador_adicionado', request.user.name)

        criar_notificacao(
            usuario, 'colaborador',
            f'Você foi adicionado ao documento "{doc.titulo}"',
            f'{request.user.name} concedeu acesso como {papel}.',
            link=f'/editor/{doc.id}',
        )

        return Response(ColaboradorSerializer(colab).data, status=status.HTTP_201_CREATED)


class ColaboradorDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, doc_id, user_id):
        try:
            doc = Documento.objects.get(pk=doc_id)
        except Documento.DoesNotExist:
            return Response({'erro': 'Não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if not _pode_editar(request, doc):
            return Response({'erro': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)
        ColaboradorDocumento.objects.filter(documento=doc, usuario_id=user_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Comentários ──────────────────────────────────────────────────────────────

class ComentarioListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, doc_id):
        try:
            doc = Documento.objects.get(pk=doc_id)
        except Documento.DoesNotExist:
            return Response({'erro': 'Não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if not _pode_ver(request, doc):
            return Response({'erro': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(ComentarioSerializer(doc.comentarios.all(), many=True).data)

    def post(self, request, doc_id):
        try:
            doc = Documento.objects.get(pk=doc_id)
        except Documento.DoesNotExist:
            return Response({'erro': 'Não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if not _pode_ver(request, doc):
            return Response({'erro': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)

        pos_inicio = request.data.get('pos_inicio')
        pos_fim    = request.data.get('pos_fim')
        comentario = ComentarioDocumento.objects.create(
            documento=doc,
            autor=request.user,
            texto=request.data.get('texto', ''),
            tipo=request.data.get('tipo', 'comentario'),
            texto_selecionado=request.data.get('texto_selecionado', ''),
            pos_inicio=int(pos_inicio) if pos_inicio is not None else None,
            pos_fim=int(pos_fim) if pos_fim is not None else None,
        )
        _sse_doc(doc.id, doc.doc_ref, 'comentario', request.user.name)

        # Notifica o dono e colaboradores (exceto o próprio autor do comentário)
        destinatarios = set()
        if doc.criado_por and doc.criado_por != request.user:
            destinatarios.add(doc.criado_por)
        for colab in doc.colaboradores.select_related('usuario').all():
            if colab.usuario != request.user:
                destinatarios.add(colab.usuario)
        for dest in destinatarios:
            criar_notificacao(
                dest, 'comentario',
                f'Novo comentário em "{doc.titulo}"',
                f'{request.user.name}: {comentario.texto[:120]}',
                link=f'/editor/{doc.id}',
            )

        return Response(ComentarioSerializer(comentario).data, status=status.HTTP_201_CREATED)


class ComentarioUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, doc_id, comentario_id):
        try:
            doc = Documento.objects.get(pk=doc_id)
            comentario = doc.comentarios.get(pk=comentario_id)
        except (Documento.DoesNotExist, ComentarioDocumento.DoesNotExist):
            return Response({'erro': 'Não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if not _pode_editar(request, doc):
            return Response({'erro': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)

        novo_status = request.data.get('status')
        if novo_status in ('aceito', 'rejeitado', 'pendente'):
            comentario.status = novo_status
            comentario.save()
        return Response(ComentarioSerializer(comentario).data)


# ─── Assinaturas ──────────────────────────────────────────────────────────────

class AssinaturaListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, doc_id):
        try:
            doc = Documento.objects.get(pk=doc_id)
        except Documento.DoesNotExist:
            return Response({'erro': 'Não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if not _pode_ver(request, doc):
            return Response({'erro': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(AssinaturaSerializer(doc.assinaturas.all(), many=True).data)

    def post(self, request, doc_id):
        """Registra ou atualiza a assinatura do usuário atual."""
        try:
            doc = Documento.objects.get(pk=doc_id)
        except Documento.DoesNotExist:
            return Response({'erro': 'Não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if not _pode_ver(request, doc):
            return Response({'erro': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            ass = registrar_assinatura(doc, request.user, request.data)
        except ValidationError as exc:
            mensagem = exc.messages[0] if hasattr(exc, 'messages') else str(exc)
            return Response({'erro': mensagem}, status=status.HTTP_400_BAD_REQUEST)

        _sse_doc(doc.id, doc.doc_ref, 'assinatura', request.user.name)
        return Response(AssinaturaSerializer(ass).data, status=status.HTTP_201_CREATED)


class IniciarAssinaturasView(APIView):
    """Define a lista de signatários necessários para um documento."""
    permission_classes = [IsAuthenticated]

    def post(self, request, doc_id):
        try:
            doc = Documento.objects.get(pk=doc_id)
        except Documento.DoesNotExist:
            return Response({'erro': 'Não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if not _pode_editar(request, doc):
            return Response({'erro': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)

        signatarios = request.data.get('signatarios', [])
        criados = iniciar_assinaturas(doc, request.user, signatarios)
        _sse_doc(doc.id, doc.doc_ref, 'assinaturas_iniciadas', request.user.name)
        return Response(AssinaturaSerializer(criados, many=True).data, status=status.HTTP_201_CREATED)


# ─── Convites (link/código) ───────────────────────────────────────────────────


class VerificarAssinaturaPublicaView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, protocolo):
        assinatura = (
            AssinaturaDocumento.objects
            .select_related('documento', 'usuario')
            .filter(protocolo=protocolo)
            .first()
        )
        if not assinatura:
            return Response({'erro': 'Protocolo nao encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        documento = assinatura.documento
        assinaturas = documento.assinaturas.select_related('usuario').order_by('ordem')
        return Response({
            'protocolo': assinatura.protocolo,
            'documento': {
                'id': str(documento.id),
                'titulo': documento.titulo,
                'status': documento.status,
                'hash': assinatura.hash_assinatura,
                'criado_em': documento.criado_em.isoformat(),
                'atualizado_em': documento.atualizado_em.isoformat(),
            },
            'assinaturas': [{
                'ordem': item.ordem,
                'status': item.status,
                'nome': item.usuario.name if item.usuario else item.nome_certificado,
                'email': item.usuario.email if item.usuario else '',
                'nome_certificado': item.nome_certificado,
                'cpf_certificado': item.cpf_certificado,
                'ac_emissora': item.ac_emissora,
                'hash_assinatura': item.hash_assinatura,
                'assinado_em': item.assinado_em.isoformat() if item.assinado_em else None,
            } for item in assinaturas],
        })

class GerarConviteView(APIView):
    """Gera (ou retorna ativo) um código de convite para o documento."""
    permission_classes = [IsAuthenticated]

    def post(self, request, doc_id):
        try:
            doc = Documento.objects.get(pk=doc_id)
        except Documento.DoesNotExist:
            return Response({'erro': 'Não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if not _pode_editar(request, doc):
            return Response({'erro': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)

        papel   = request.data.get('papel', 'editor')
        dias    = int(request.data.get('dias', 7))
        convite = gerar_convite(doc, request.user, papel, dias)

        return Response({
            'codigo':    str(convite.codigo),
            'papel':     convite.papel,
            'expira_em': convite.expira_em.isoformat(),
            'usos':      convite.usos,
        })

    def delete(self, request, doc_id):
        """Invalida todos os convites ativos do documento."""
        try:
            doc = Documento.objects.get(pk=doc_id)
        except Documento.DoesNotExist:
            return Response({'erro': 'Não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if not _pode_editar(request, doc):
            return Response({'erro': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)
        doc.convites.filter(ativo=True).update(ativo=False)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AceitarConviteView(APIView):
    """Usuário logado usa o código para entrar no documento."""
    permission_classes = [IsAuthenticated]

    def get(self, request, codigo):
        """Retorna info do convite sem aceitar."""
        try:
            convite = ConviteDocumento.objects.select_related('documento', 'documento__criado_por').get(
                codigo=codigo, ativo=True
            )
        except ConviteDocumento.DoesNotExist:
            return Response({'erro': 'Convite inválido ou expirado.'}, status=status.HTTP_404_NOT_FOUND)

        if convite.expira_em < timezone.now():
            return Response({'erro': 'Este convite expirou.'}, status=status.HTTP_410_GONE)

        doc = convite.documento
        return Response({
            'documento_titulo': doc.titulo,
            'documento_id':     str(doc.id),
            'criado_por':       doc.criado_por.name if doc.criado_por else '',
            'papel':            convite.papel,
            'expira_em':        convite.expira_em.isoformat(),
            'ja_membro':        _pode_ver(request, doc),
        })

    def post(self, request, codigo):
        """Aceita o convite — adiciona o usuário como colaborador."""
        convite, erro = aceitar_convite(codigo, request.user)

        if erro == 'Convite inválido ou expirado.':
            return Response({'erro': erro}, status=status.HTTP_404_NOT_FOUND)
        if erro in ('Este convite expirou.', 'Limite de usos atingido.'):
            return Response({'erro': erro}, status=status.HTTP_410_GONE)
        if erro == 'ja_criador':
            return Response({'mensagem': 'Você já é o criador deste documento.', 'documento_id': str(convite.documento_id)})

        doc = convite.documento
        _sse_doc(doc.id, doc.doc_ref, 'colaborador_adicionado', request.user.name)
        return Response({
            'mensagem':     f'Você entrou como {convite.papel} no documento.',
            'documento_id': str(doc.id),
            'doc_ref':      doc.doc_ref,
            'papel':        convite.papel,
        }, status=status.HTTP_200_OK)


# ─── Auditoria ────────────────────────────────────────────────────────────────

class AuditoriaListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, doc_id):
        try:
            doc = Documento.objects.get(pk=doc_id)
        except Documento.DoesNotExist:
            return Response({'erro': 'Não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if not _pode_ver(request, doc):
            return Response({'erro': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)

        registros = AuditoriaDocumento.objects.filter(documento=doc).select_related('usuario')[:100]
        return Response([{
            'id': str(r.id),
            'tipo': r.tipo,
            'usuario': r.usuario.name if r.usuario else 'Sistema',
            'descricao': r.descricao,
            'versao': r.versao,
            'criado_em': r.criado_em.isoformat(),
        } for r in registros])


# ─── Presença em tempo real ───────────────────────────────────────────────────

class PresencaListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, doc_id):
        try:
            doc = Documento.objects.get(pk=doc_id)
        except Documento.DoesNotExist:
            return Response({'erro': 'Não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if not _pode_ver(request, doc):
            return Response({'erro': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)

        # Remove presença com mais de 5 minutos (offline)
        PresencaDocumento.objects.filter(
            documento=doc,
            ultimo_acesso__lt=timezone.now() - timezone.timedelta(minutes=5)
        ).delete()

        presencas = PresencaDocumento.objects.filter(documento=doc).select_related('usuario')
        return Response([{
            'usuario_id': p.usuario.id,
            'usuario_name': p.usuario.name,
            'ultimo_acesso': p.ultimo_acesso.isoformat(),
            'cursor_pos': p.cursor_pos,
        } for p in presencas])

    def post(self, request, doc_id):
        """Atualiza presença do usuário (heartbeat)."""
        try:
            doc = Documento.objects.get(pk=doc_id)
        except Documento.DoesNotExist:
            return Response({'erro': 'Não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if not _pode_ver(request, doc):
            return Response({'erro': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)

        cursor_pos = request.data.get('cursor_pos')
        atualizar_presenca(doc, request.user,
                           cursor_pos=int(cursor_pos) if cursor_pos is not None else None)
        _sse_doc(doc.id, doc.doc_ref, 'presenca', request.user.name)
        return Response({'status': 'ok'})


class ModeloListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Q
        modelos = ModeloDocumento.objects.filter(
            Q(is_sistema=True) | Q(criado_por=request.user)
        )
        return Response(ModeloDocumentoSerializer(modelos, many=True).data)

    def post(self, request):
        serializer = ModeloDocumentoSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(criado_por=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ModeloDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_modelo(self, pk):
        try:
            return ModeloDocumento.objects.get(pk=pk)
        except ModeloDocumento.DoesNotExist:
            return None

    def get(self, request, pk):
        modelo = self._get_modelo(pk)
        if not modelo:
            return Response({'erro': 'Não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if not modelo.is_sistema and modelo.criado_por != request.user:
            return Response({'erro': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(ModeloDocumentoSerializer(modelo).data)

    def put(self, request, pk):
        modelo = self._get_modelo(pk)
        if not modelo:
            return Response({'erro': 'Não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if modelo.is_sistema:
            return Response({'erro': 'Modelos do sistema não podem ser editados.'}, status=status.HTTP_403_FORBIDDEN)
        if modelo.criado_por != request.user:
            return Response({'erro': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = ModeloDocumentoSerializer(modelo, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        modelo = self._get_modelo(pk)
        if not modelo:
            return Response({'erro': 'Não encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        if modelo.is_sistema:
            return Response({'erro': 'Modelos do sistema não podem ser excluídos.'}, status=status.HTTP_403_FORBIDDEN)
        if modelo.criado_por != request.user:
            return Response({'erro': 'Sem permissão.'}, status=status.HTTP_403_FORBIDDEN)
        modelo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
