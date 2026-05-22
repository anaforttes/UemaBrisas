from rest_framework import serializers
from autenticacao.models import CustomUser
from .models import Documento, ColaboradorDocumento, ComentarioDocumento, VersaoDocumento, AssinaturaDocumento, ModeloDocumento


class UsuarioSimples(serializers.ModelSerializer):
    class Meta:
        model  = CustomUser
        fields = ['id', 'name', 'email', 'role']


class ColaboradorSerializer(serializers.ModelSerializer):
    usuario    = UsuarioSimples(read_only=True)
    usuario_id = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(), source='usuario', write_only=True
    )

    class Meta:
        model  = ColaboradorDocumento
        fields = ['id', 'usuario', 'usuario_id', 'papel', 'convidado_em']


class ComentarioSerializer(serializers.ModelSerializer):
    autor       = UsuarioSimples(read_only=True)
    autor_nome  = serializers.SerializerMethodField()
    autor_cargo = serializers.SerializerMethodField()

    def get_autor_nome(self, obj):
        return obj.autor.name if obj.autor else 'Usuário'

    def get_autor_cargo(self, obj):
        return obj.autor.role if obj.autor else ''

    class Meta:
        model  = ComentarioDocumento
        fields = ['id', 'autor', 'autor_nome', 'autor_cargo', 'texto', 'tipo', 'status',
                  'texto_selecionado', 'pos_inicio', 'pos_fim', 'criado_em']


class VersaoSerializer(serializers.ModelSerializer):
    autor      = UsuarioSimples(read_only=True)
    autor_nome = serializers.SerializerMethodField()

    def get_autor_nome(self, obj):
        return obj.autor.name if obj.autor else 'Sistema'

    class Meta:
        model  = VersaoDocumento
        fields = ['id', 'numero', 'titulo', 'autor', 'autor_nome', 'descricao', 'criado_em']


class VersaoComConteudoSerializer(VersaoSerializer):
    class Meta(VersaoSerializer.Meta):
        fields = VersaoSerializer.Meta.fields + ['conteudo']


class AssinaturaSerializer(serializers.ModelSerializer):
    usuario    = UsuarioSimples(read_only=True)
    usuario_id = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(), source='usuario', write_only=True, required=False
    )

    class Meta:
        model  = AssinaturaDocumento
        fields = [
            'id', 'usuario', 'usuario_id', 'status', 'ordem', 'protocolo',
            'hash_assinatura', 'nome_certificado', 'cpf_certificado', 'ac_emissora', 'assinado_em',
        ]


class DocumentoListSerializer(serializers.ModelSerializer):
    criado_por = UsuarioSimples(read_only=True)

    class Meta:
        model  = Documento
        fields = ['id', 'doc_ref', 'titulo', 'processo_id', 'criado_por',
                  'status', 'versao_atual', 'criado_em', 'atualizado_em']


class DocumentoDetalheSerializer(serializers.ModelSerializer):
    criado_por   = UsuarioSimples(read_only=True)
    colaboradores = ColaboradorSerializer(many=True, read_only=True)
    assinaturas   = AssinaturaSerializer(many=True, read_only=True)

    class Meta:
        model  = Documento
        fields = [
            'id', 'doc_ref', 'titulo', 'conteudo', 'cabecalho', 'rodape',
            'processo_id', 'criado_por', 'status', 'versao_atual',
            'criado_em', 'atualizado_em', 'colaboradores', 'assinaturas',
        ]


class ModeloDocumentoSerializer(serializers.ModelSerializer):
    criado_por = UsuarioSimples(read_only=True)

    class Meta:
        model  = ModeloDocumento
        fields = ['id', 'nome', 'tipo', 'versao', 'descricao', 'conteudo', 'campos', 'criado_por', 'criado_em', 'atualizado_em']
        read_only_fields = ['id', 'criado_por', 'criado_em', 'atualizado_em']
