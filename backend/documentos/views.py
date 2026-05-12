from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from autenticacao.models import CustomUser
from autenticacao.sse import sse_broadcast
from .models import (
    Documento, ColaboradorDocumento, ComentarioDocumento,
    VersaoDocumento, ConviteDocumento,
)
from .serializadores import (
    DocumentoListSerializer, DocumentoDetalheSerializer,
    ColaboradorSerializer, ComentarioSerializer,
    VersaoSerializer, VersaoComConteudoSerializer,
    AssinaturaSerializer,
)
from .servicos import (
    criar_documento, salvar_versao, adicionar_colaborador,
    iniciar_assinaturas, registrar_assinatura,
    gerar_convite, aceitar_convite,
)


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
        doc_ref = request.query_params.get('doc_ref', '')
        if doc_ref:
            docs = Documento.objects.filter(doc_ref=doc_ref)
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

        comentario = ComentarioDocumento.objects.create(
            documento=doc, autor=request.user,
            texto=request.data.get('texto', ''),
            tipo=request.data.get('tipo', 'comentario'),
        )
        _sse_doc(doc.id, doc.doc_ref, 'comentario', request.user.name)
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

        ass = registrar_assinatura(doc, request.user, request.data)
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
