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
  status: 'ok' | 'erro' | 'negado';
  dadosTecnico: DadosGeo | null;  // onde está o técnico agora
  municipioProcesso: string;       // município esperado pelo processo
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

        const res: ResultadoGeo = {
          status: 'ok',
          dadosTecnico,
          municipioProcesso: municipioEsperado,
          mensagem: `✓ Localização capturada em ${municipio}/${estado}.`,
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

export function gerarBlocoGeoHTML(dados: DadosGeo): string {
  const dataFormatada = new Date(dados.capturadoEm).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const corBorda = '#10b981';
  const corFundo = '#f0fdf4';
  const icone = '📍';
  const titulo = 'Registro de Localização — Confirmado';

  return `
<div style="margin-top:24px;padding:14px 18px;border-left:4px solid ${corBorda};background:${corFundo};border-radius:0 8px 8px 0;font-family:monospace;font-size:12px;">
  <p style="margin:0 0 6px;font-weight:700;font-size:13px;color:#1e293b;">${icone} ${titulo}</p>
  <p style="margin:0;color:#334155;">Latitude: <strong>${dados.latitude.toFixed(6)}</strong> &nbsp;|&nbsp; Longitude: <strong>${dados.longitude.toFixed(6)}</strong></p>
  <p style="margin:4px 0 0;color:#334155;">Data/Hora da captura: <strong>${dataFormatada}</strong></p>
  <p style="margin:4px 0 0;color:#64748b;">Precisão GPS: ±${dados.precisao}m &nbsp;|&nbsp; Município detectado: ${dados.municipio}/${dados.estado}</p>
</div>
<p></p>
`.trim();
}
