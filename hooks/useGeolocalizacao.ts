import { useState, useCallback } from 'react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface DadosGeo {
  latitude: number;
  longitude: number;
  municipio: string;
  estado: string;
  capturadoEm: string; // ISO string
  precisao: number;    // metros
}

export interface ResultadoGeo {
  status: 'ok' | 'divergencia' | 'erro' | 'negado';
  dadosTecnico: DadosGeo | null;  // onde está o técnico agora
  municipioProcesso: string;       // município esperado pelo processo
  divergencia: boolean;
  mensagem: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

// Nominatim é gratuito e cobre todo o Brasil sem chave de API
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';

// Tempo máximo para aguardar o GPS do dispositivo (ms)
const TIMEOUT_GPS = 10_000;

// ─── Função auxiliar: geocodificação reversa ──────────────────────────────────
// Recebe lat/lng e retorna município + estado via OpenStreetMap

async function geocodificarReverso(lat: number, lng: number): Promise<{ municipio: string; estado: string }> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'json',
    addressdetails: '1',
    'accept-language': 'pt-BR',
  });

  const resposta = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: {
      // Nominatim exige um User-Agent identificando a aplicação
      'User-Agent': 'REURBDoc/1.0 (sistema de regularizacao fundiaria)',
    },
  });

  if (!resposta.ok) {
    throw new Error(`Nominatim retornou status ${resposta.status}`);
  }

  const dados = await resposta.json();
  const endereco = dados.address ?? {};

  // Nominatim pode retornar o município em campos diferentes dependendo da área
  const municipio =
    endereco.city ||
    endereco.town ||
    endereco.village ||
    endereco.county ||
    'Desconhecido';

  // Estado abreviado (ex: "Ceará" → "CE") via campo state_code quando disponível
  const estado = endereco.state_code?.toUpperCase() || endereco.state || 'Desconhecido';

  return { municipio, estado };
}

// ─── Função auxiliar: comparar municípios ─────────────────────────────────────
// Normaliza strings para comparação case-insensitive sem acentos

function municipiosIguais(a: string, b: string): boolean {
  const normalizar = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .trim();

  return normalizar(a) === normalizar(b);
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useGeolocalizacao() {
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoGeo | null>(null);

  /**
   * Captura a posição do técnico e valida contra o município do processo.
   *
   * @param municipioEsperado - Nome do município cadastrado no processo
   */
  const capturarEValidar = useCallback(
    async (municipioEsperado: string): Promise<ResultadoGeo> => {
      setCarregando(true);
      setResultado(null);

      // 1. Verificar se o navegador suporta geolocalização
      if (!navigator.geolocation) {
        const res: ResultadoGeo = {
          status: 'erro',
          dadosTecnico: null,
          municipioProcesso: municipioEsperado,
          divergencia: false,
          mensagem: 'Este dispositivo não suporta geolocalização.',
        };
        setResultado(res);
        setCarregando(false);
        return res;
      }

      try {
        // 2. Capturar GPS do dispositivo
        const posicao = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,   // usa GPS quando disponível
            timeout: TIMEOUT_GPS,
            maximumAge: 0,              // nunca usar cache — sempre captura nova
          });
        });

        const { latitude, longitude, accuracy } = posicao.coords;
        const capturadoEm = new Date().toISOString();

        // 3. Geocodificação reversa: coordenadas → município
        const { municipio, estado } = await geocodificarReverso(latitude, longitude);

        const dadosTecnico: DadosGeo = {
          latitude,
          longitude,
          municipio,
          estado,
          capturadoEm,
          precisao: Math.round(accuracy),
        };

        // 4. Validar se o técnico está no município correto
        const divergencia = !municipiosIguais(municipio, municipioEsperado);

        const res: ResultadoGeo = {
          status: divergencia ? 'divergencia' : 'ok',
          dadosTecnico,
          municipioProcesso: municipioEsperado,
          divergencia,
          mensagem: divergencia
            ? `⚠️ Divergência detectada: você está em ${municipio}/${estado}, mas o processo é de ${municipioEsperado}. A divergência será registrada no documento.`
            : `✓ Localização confirmada em ${municipio}/${estado}.`,
        };

        setResultado(res);
        setCarregando(false);
        return res;
      } catch (erro: any) {
        // Tratamento específico para cada tipo de erro de geolocalização
        let mensagem = 'Não foi possível capturar a localização.';

        if (erro instanceof GeolocationPositionError) {
          switch (erro.code) {
            case GeolocationPositionError.PERMISSION_DENIED:
              mensagem = 'Permissão de localização negada. Habilite o GPS nas configurações do navegador.';
              break;
            case GeolocationPositionError.POSITION_UNAVAILABLE:
              mensagem = 'Localização indisponível. Verifique se o GPS está ativo.';
              break;
            case GeolocationPositionError.TIMEOUT:
              mensagem = 'Tempo limite excedido ao capturar localização. Tente novamente.';
              break;
          }
        } else if (erro.message) {
          mensagem = `Erro ao consultar localização: ${erro.message}`;
        }

        const res: ResultadoGeo = {
          status: erro instanceof GeolocationPositionError && erro.code === GeolocationPositionError.PERMISSION_DENIED
            ? 'negado'
            : 'erro',
          dadosTecnico: null,
          municipioProcesso: municipioEsperado,
          divergencia: false,
          mensagem,
        };

        setResultado(res);
        setCarregando(false);
        return res;
      }
    },
    []
  );

  // Limpa o resultado (ex: ao fechar um modal)
  const limpar = useCallback(() => {
    setResultado(null);
  }, []);

  return { carregando, resultado, capturarEValidar, limpar };
}

// ─── Utilitário exportado: gera o bloco HTML de geolocalização ────────────────
// Inserido no documento pelo Editor ao abrir com dados de geo

export function gerarBlocoGeoHTML(dados: DadosGeo, divergencia: boolean, municipioEsperado: string): string {
  const dataFormatada = new Date(dados.capturadoEm).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const corBorda = divergencia ? '#f59e0b' : '#10b981';
  const corFundo = divergencia ? '#fffbeb' : '#f0fdf4';
  const icone    = divergencia ? '⚠️' : '📍';
  const titulo   = divergencia
    ? `Registro de Localização — DIVERGÊNCIA DETECTADA`
    : `Registro de Localização — Confirmado`;

  const alertaDivergencia = divergencia
    ? `<p style="margin:6px 0 0;font-size:11px;color:#b45309;font-weight:600;">
        Técnico localizado em ${dados.municipio}/${dados.estado} — processo referente a ${municipioEsperado}.
        Divergência registrada automaticamente pelo sistema.
       </p>`
    : '';

  return `
<div style="margin-top:24px;padding:14px 18px;border-left:4px solid ${corBorda};background:${corFundo};border-radius:0 8px 8px 0;font-family:monospace;font-size:12px;">
  <p style="margin:0 0 6px;font-weight:700;font-size:13px;color:#1e293b;">${icone} ${titulo}</p>
  <p style="margin:0;color:#334155;">Latitude: <strong>${dados.latitude.toFixed(6)}</strong> &nbsp;|&nbsp; Longitude: <strong>${dados.longitude.toFixed(6)}</strong></p>
  <p style="margin:4px 0 0;color:#334155;">Data/Hora da captura: <strong>${dataFormatada}</strong></p>
  <p style="margin:4px 0 0;color:#64748b;">Precisão GPS: ±${dados.precisao}m &nbsp;|&nbsp; Município detectado: ${dados.municipio}/${dados.estado}</p>
  ${alertaDivergencia}
</div>
<p></p>
`.trim();
}
