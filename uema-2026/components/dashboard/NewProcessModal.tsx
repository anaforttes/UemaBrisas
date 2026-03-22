import React, { useState, useEffect, useRef } from 'react';
import {
  X, Plus, MapPin, Camera, Navigation,
  CheckCircle2, AlertTriangle, Loader2,
  Building2, Map,
} from 'lucide-react';
import { dbService } from '../../services/databaseService';
import { User } from '../../types/index';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface NewProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUser: User;
}

// Tipo do contexto de geolocalização salvo no processo
export interface DadosGeoProcesso {
  latitude: number;
  longitude: number;
  precisao: number;          // metros
  municipioDetectado: string;
  estadoDetectado: string;
  capturadoEm: string;       // ISO string
  fluxo: 'campo' | 'escritorio';
  fotoUrl?: string;          // data URL da foto tirada em campo
  fotoPossuiGps?: boolean;   // a foto tinha coordenadas nos metadados EXIF?
}

// ─── Constante: URL da API de geocodificação ──────────────────────────────────
// Nominatim (OpenStreetMap) — gratuito, sem chave, funciona em todo o Brasil

const NOMINATIM = 'https://nominatim.openstreetmap.org';

// ─── Hook: captura GPS do dispositivo ────────────────────────────────────────

function useGPS() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro]             = useState<string | null>(null);
  const [posicao, setPosicao]       = useState<GeolocationCoordinates | null>(null);

  const capturar = () =>
    new Promise<GeolocationCoordinates>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalização não suportada neste dispositivo.'));
        return;
      }
      setCarregando(true);
      setErro(null);
      navigator.geolocation.getCurrentPosition(
        pos => { setPosicao(pos.coords); setCarregando(false); resolve(pos.coords); },
        err => {
          setCarregando(false);
          const msgs: Record<number, string> = {
            1: 'Permissão negada. Habilite o GPS nas configurações do navegador.',
            2: 'GPS indisponível. Verifique se o GPS está ativo.',
            3: 'Tempo limite excedido. Tente novamente.',
          };
          const msg = msgs[err.code] || 'Erro ao capturar localização.';
          setErro(msg);
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });

  return { carregando, erro, posicao, capturar };
}

// ─── Função: geocodificação reversa ──────────────────────────────────────────
// Coordenadas → município + estado (Nominatim)

async function geocodificarReverso(lat: number, lng: number) {
  const params = new URLSearchParams({
    lat: String(lat), lon: String(lng),
    format: 'json', addressdetails: '1', 'accept-language': 'pt-BR',
  });
  const res  = await fetch(`${NOMINATIM}/reverse?${params}`, {
    headers: { 'User-Agent': 'REURBDoc/1.0 (regularizacao fundiaria)' },
  });
  const data = await res.json();
  const end  = data.address ?? {};
  return {
    municipio: end.city || end.town || end.village || end.county || 'Desconhecido',
    estado:    (end.state_code || end.state || '??').toUpperCase(),
  };
}

// ─── Função: geocodificação direta ────────────────────────────────────────────
// Endereço digitado → coordenadas (fluxo escritório)

async function geocodificarEndereco(endereco: string) {
  const params = new URLSearchParams({
    q: `${endereco}, Brasil`,
    format: 'json', addressdetails: '1',
    'accept-language': 'pt-BR', limit: '1',
  });
  const res  = await fetch(`${NOMINATIM}/search?${params}`, {
    headers: { 'User-Agent': 'REURBDoc/1.0 (regularizacao fundiaria)' },
  });
  const data = await res.json();
  if (!data.length) throw new Error('Endereço não encontrado. Tente ser mais específico.');
  const item = data[0];
  const end  = item.address ?? {};
  return {
    lat:      parseFloat(item.lat),
    lng:      parseFloat(item.lon),
    municipio: end.city || end.town || end.village || end.county || 'Desconhecido',
    estado:    (end.state_code || end.state || '??').toUpperCase(),
  };
}

// ─── Componente: Mapa Leaflet via CDN ─────────────────────────────────────────
// Carrega Leaflet dinamicamente — sem instalar nada, funciona direto no browser

interface MapaProps {
  lat: number;
  lng: number;
  label?: string;
}

const MapaLeaflet: React.FC<MapaProps> = ({ lat, lng, label }) => {
  const refDiv = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    // Carrega CSS do Leaflet se ainda não foi carregado
    if (!document.getElementById('leaflet-css')) {
      const link  = document.createElement('link');
      link.id     = 'leaflet-css';
      link.rel    = 'stylesheet';
      link.href   = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Carrega JS do Leaflet e inicializa o mapa
    const inicializar = () => {
      const L = (window as any).L;
      if (!L || !refDiv.current) return;

      // Destrói instância anterior se existir (evita erro ao re-renderizar)
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

      const mapa = L.map(refDiv.current).setView([lat, lng], 15);
      mapRef.current = mapa;

      // Tiles do OpenStreetMap — gratuito, sem chave de API
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(mapa);

      // Marcador personalizado azul
      const icone = L.divIcon({
        className: '',
        html: `<div style="
          width:32px;height:32px;background:#2563eb;border:3px solid #fff;
          border-radius:50% 50% 50% 0;transform:rotate(-45deg);
          box-shadow:0 2px 8px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      L.marker([lat, lng], { icon: icone })
        .addTo(mapa)
        .bindPopup(label || `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        .openPopup();
    };

    if ((window as any).L) {
      inicializar();
    } else {
      const script  = document.createElement('script');
      script.src    = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = inicializar;
      document.head.appendChild(script);
    }

    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [lat, lng, label]);

  return (
    <div ref={refDiv} style={{ height: 200, borderRadius: 12, zIndex: 0 }}
      className="w-full border border-slate-200 overflow-hidden" />
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export const NewProcessModal: React.FC<NewProcessModalProps> = ({
  isOpen, onClose, onSuccess, currentUser,
}) => {

  // ── Formulário original ──────────────────────────────────────────────────
  const [form, setForm] = useState({
    title:           '',
    applicant:       '',
    location:        '',
    modality:        'REURB-S' as 'REURB-S' | 'REURB-E',
    area:            '',
    responsibleName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // ── Fluxo de geolocalização ───────────────────────────────────────────────
  // 'campo'      → técnico está no local, usa GPS do dispositivo + foto
  // 'escritorio' → técnico digita o endereço, sistema valida via Nominatim
  // null         → usuário ainda não escolheu

  const [fluxo, setFluxo] = useState<'campo' | 'escritorio' | null>(null);

  // Dados de geo capturados (salvos junto ao processo)
  const [dadosGeo, setDadosGeo] = useState<DadosGeoProcesso | null>(null);

  // Estado do mapa: coordenadas para exibir
  const [coordsMapa, setCoordsMapa] = useState<{ lat: number; lng: number } | null>(null);

  // Endereço digitado no fluxo escritório
  const [enderecoEscritorio, setEnderecoEscritorio] = useState('');
  const [buscandoEndereco, setBuscandoEndereco]     = useState(false);
  const [erroEndereco, setErroEndereco]             = useState<string | null>(null);

  // Foto capturada em campo
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const refInputFoto = useRef<HTMLInputElement>(null);

  const gps = useGPS();

  if (!isOpen) return null;

  // ── Handlers do formulário original ────────────────────────────────────────

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ── Fluxo: Campo — captura GPS do dispositivo ─────────────────────────────

  const handleCapturarGPS = async () => {
    try {
      const coords = await gps.capturar();
      const { municipio, estado } = await geocodificarReverso(coords.latitude, coords.longitude);

      const geo: DadosGeoProcesso = {
        latitude:          coords.latitude,
        longitude:         coords.longitude,
        precisao:          Math.round(coords.accuracy),
        municipioDetectado: municipio,
        estadoDetectado:   estado,
        capturadoEm:       new Date().toISOString(),
        fluxo:             'campo',
      };
      setDadosGeo(geo);
      setCoordsMapa({ lat: coords.latitude, lng: coords.longitude });

      // Preenche automaticamente o campo Localização com o município detectado
      if (!form.location) {
        setForm(f => ({ ...f, location: `${municipio} — ${estado}` }));
      }
    } catch {
      // erro já tratado dentro do hook useGPS
    }
  };

  // ── Fluxo: Campo — foto com GPS nos metadados EXIF ───────────────────────

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setFotoPreview(url);

      // Tenta ler metadados EXIF da imagem para extrair GPS
      // Nota: a maioria dos navegadores não expõe EXIF via FileReader
      // Em produção usar biblioteca como 'exifr' (npm install exifr)
      // Por ora registra que a foto foi anexada sem GPS de EXIF
      setDadosGeo(prev => prev
        ? { ...prev, fotoUrl: url, fotoPossuiGps: false }
        : null
      );
    };
    reader.readAsDataURL(arquivo);
  };

  // ── Fluxo: Escritório — valida endereço digitado via Nominatim ────────────

  const handleValidarEndereco = async () => {
    if (!enderecoEscritorio.trim()) return;
    setBuscandoEndereco(true);
    setErroEndereco(null);
    try {
      const resultado = await geocodificarEndereco(enderecoEscritorio);
      const geo: DadosGeoProcesso = {
        latitude:           resultado.lat,
        longitude:          resultado.lng,
        precisao:           0, // endereço digitado, sem precisão de GPS
        municipioDetectado: resultado.municipio,
        estadoDetectado:    resultado.estado,
        capturadoEm:        new Date().toISOString(),
        fluxo:              'escritorio',
      };
      setDadosGeo(geo);
      setCoordsMapa({ lat: resultado.lat, lng: resultado.lng });

      // Preenche o campo Localização automaticamente
      if (!form.location) {
        setForm(f => ({ ...f, location: `${resultado.municipio} — ${resultado.estado}` }));
      }
    } catch (err: any) {
      setErroEndereco(err.message || 'Não foi possível validar o endereço.');
    } finally {
      setBuscandoEndereco(false);
    }
  };

  // ── Submit: cria processo com dados de geo ────────────────────────────────

  const handleSubmit = async () => {
    if (!form.title || !form.applicant) {
      setError('Preencha os campos obrigatórios: Título e Requerente.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // TODO (Backend): POST /api/processos — enviar form + dadosGeo juntos
      dbService.processes.insert({
        ...form,
        technicianId: currentUser.id,
        legalId:      currentUser.id,
        // dadosGeo será armazenado como campo extra quando o backend suportar
        // Por ora pode ser serializado como JSON em um campo de texto
      });
      onSuccess();
      onClose();
      // Reseta o formulário inteiro
      setForm({ title: '', applicant: '', location: '', modality: 'REURB-S', area: '', responsibleName: '' });
      setFluxo(null);
      setDadosGeo(null);
      setCoordsMapa(null);
      setFotoPreview(null);
      setEnderecoEscritorio('');
    } catch {
      setError('Erro ao criar processo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl mx-4 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 max-h-[90vh] overflow-y-auto">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-8 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-black text-slate-800">Novo Protocolo</h2>
            <p className="text-slate-400 text-sm font-medium mt-0.5">Preencha os dados do processo REURB</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all">
            <X size={22} />
          </button>
        </div>

        <div className="p-8 space-y-5">

          {/* ── Erro geral ───────────────────────────────────────────────── */}
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm font-medium px-4 py-3 rounded-2xl">
              {error}
            </div>
          )}

          {/* ── Campos originais ─────────────────────────────────────────── */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
              Título do Núcleo / Processo *
            </label>
            <input
              name="title" value={form.title} onChange={handleChange}
              placeholder="Ex: Núcleo Habitacional Esperança"
              className="w-full px-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 transition-all"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
              Requerente *
            </label>
            <input
              name="applicant" value={form.applicant} onChange={handleChange}
              placeholder="Ex: Associação de Moradores Vila Verde"
              className="w-full px-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 transition-all"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
              Localização
            </label>
            <input
              name="location" value={form.location} onChange={handleChange}
              placeholder="Ex: Bairro Santa Luzia, São Luís - MA"
              className="w-full px-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Modalidade</label>
              <select
                name="modality" value={form.modality} onChange={handleChange}
                className="w-full px-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-200 transition-all cursor-pointer"
              >
                <option value="REURB-S">REURB-S</option>
                <option value="REURB-E">REURB-E</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Área Total</label>
              <input
                name="area" value={form.area} onChange={handleChange}
                placeholder="Ex: 15.400 m²"
                className="w-full px-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
              Responsável Técnico
            </label>
            <input
              name="responsibleName" value={form.responsibleName} onChange={handleChange}
              placeholder="Ex: Eng. João da Silva"
              className="w-full px-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 transition-all"
            />
          </div>

          {/* ── Seção: Geolocalização ─────────────────────────────────────── */}
          <div className="border border-slate-100 rounded-3xl overflow-hidden">

            {/* Cabeçalho da seção */}
            <div className="flex items-center gap-3 px-5 py-4 bg-slate-50 border-b border-slate-100">
              <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                <MapPin size={16} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-700">Geolocalização do Núcleo</p>
                <p className="text-[11px] text-slate-400">
                  {dadosGeo ? '✓ Localização registrada' : 'Registre as coordenadas do núcleo urbano'}
                </p>
              </div>
              {dadosGeo && (
                <span className="ml-auto text-[10px] font-black px-3 py-1 rounded-full bg-green-100 text-green-700">
                  {dadosGeo.fluxo === 'campo' ? '📍 Campo' : '🏢 Escritório'}
                </span>
              )}
            </div>

            <div className="p-5 space-y-4">

              {/* Escolha do fluxo — só aparece se ainda não escolheu */}
              {!fluxo && !dadosGeo && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setFluxo('campo')}
                    className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-blue-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all group"
                  >
                    <Navigation size={24} className="text-blue-500 group-hover:text-blue-600" />
                    <div className="text-center">
                      <p className="text-sm font-black text-slate-700">Estou em campo</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">GPS do dispositivo + foto</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setFluxo('escritorio')}
                    className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-2xl hover:border-slate-400 hover:bg-slate-50 transition-all group"
                  >
                    <Building2 size={24} className="text-slate-400 group-hover:text-slate-600" />
                    <div className="text-center">
                      <p className="text-sm font-black text-slate-700">Escritório</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Digitar endereço e validar</p>
                    </div>
                  </button>
                </div>
              )}

              {/* ── FLUXO CAMPO ─────────────────────────────────────────── */}
              {fluxo === 'campo' && (
                <div className="space-y-4">

                  {/* Botão capturar GPS */}
                  {!dadosGeo && (
                    <button
                      onClick={handleCapturarGPS}
                      disabled={gps.carregando}
                      className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-60 shadow-lg shadow-blue-100"
                    >
                      {gps.carregando
                        ? <><Loader2 size={16} className="animate-spin" /> Capturando GPS...</>
                        : <><Navigation size={16} /> Capturar localização atual</>
                      }
                    </button>
                  )}

                  {/* Erro de GPS */}
                  {gps.erro && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-2xl">
                      <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-600 font-medium">{gps.erro}</p>
                    </div>
                  )}

                  {/* GPS capturado com sucesso */}
                  {dadosGeo && (
                    <div className="space-y-3">
                      <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-2xl">
                        <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-black text-green-700">
                            Localização capturada — {dadosGeo.municipioDetectado}/{dadosGeo.estadoDetectado}
                          </p>
                          <p className="text-[11px] text-green-600 font-mono mt-0.5">
                            Lat: {dadosGeo.latitude.toFixed(6)} | Lng: {dadosGeo.longitude.toFixed(6)} | ±{dadosGeo.precisao}m
                          </p>
                          <p className="text-[10px] text-green-500 mt-0.5">
                            {new Date(dadosGeo.capturadoEm).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>

                      {/* Mapa */}
                      <MapaLeaflet
                        lat={dadosGeo.latitude}
                        lng={dadosGeo.longitude}
                        label={`📍 ${form.title || 'Núcleo urbano'}`}
                      />

                      {/* Upload de foto */}
                      <input
                        ref={refInputFoto}
                        type="file"
                        accept="image/*"
                        capture="environment" // abre câmera traseira em mobile
                        onChange={handleFoto}
                        className="hidden"
                      />
                      {!fotoPreview ? (
                        <button
                          onClick={() => refInputFoto.current?.click()}
                          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 text-sm font-bold hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
                        >
                          <Camera size={18} /> Tirar foto do local (opcional)
                        </button>
                      ) : (
                        <div className="relative">
                          <img src={fotoPreview} alt="Foto do local" className="w-full h-40 object-cover rounded-2xl" />
                          <button
                            onClick={() => { setFotoPreview(null); setDadosGeo(prev => prev ? { ...prev, fotoUrl: undefined } : null); }}
                            className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-all"
                          >
                            <X size={14} />
                          </button>
                          <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-lg font-mono">
                            📍 GPS registrado
                          </div>
                        </div>
                      )}

                      {/* Recapturar */}
                      <button
                        onClick={() => { setDadosGeo(null); setCoordsMapa(null); setFotoPreview(null); }}
                        className="text-xs text-slate-400 underline font-medium"
                      >
                        Recapturar localização
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── FLUXO ESCRITÓRIO ──────────────────────────────────── */}
              {fluxo === 'escritorio' && (
                <div className="space-y-4">

                  {/* Campo de endereço + botão validar */}
                  <div className="flex gap-2">
                    <input
                      value={enderecoEscritorio}
                      onChange={e => setEnderecoEscritorio(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleValidarEndereco()}
                      placeholder="Ex: Rua das Flores, Mondubim, Fortaleza - CE"
                      className="flex-1 px-4 py-3 bg-slate-50 border border-transparent rounded-2xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 transition-all"
                    />
                    <button
                      onClick={handleValidarEndereco}
                      disabled={buscandoEndereco || !enderecoEscritorio.trim()}
                      className="px-4 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-60 flex items-center gap-2 shrink-0"
                    >
                      {buscandoEndereco ? <Loader2 size={14} className="animate-spin" /> : <Map size={14} />}
                      Validar
                    </button>
                  </div>

                  {/* Erro de endereço */}
                  {erroEndereco && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-2xl">
                      <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-600 font-medium">{erroEndereco}</p>
                    </div>
                  )}

                  {/* Resultado + mapa */}
                  {dadosGeo && coordsMapa && (
                    <div className="space-y-3">
                      <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-2xl">
                        <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-black text-green-700">
                            Endereço validado — {dadosGeo.municipioDetectado}/{dadosGeo.estadoDetectado}
                          </p>
                          <p className="text-[11px] text-green-600 font-mono mt-0.5">
                            Lat: {dadosGeo.latitude.toFixed(6)} | Lng: {dadosGeo.longitude.toFixed(6)}
                          </p>
                        </div>
                      </div>
                      <MapaLeaflet
                        lat={coordsMapa.lat}
                        lng={coordsMapa.lng}
                        label={enderecoEscritorio}
                      />
                      <button
                        onClick={() => { setDadosGeo(null); setCoordsMapa(null); setEnderecoEscritorio(''); }}
                        className="text-xs text-slate-400 underline font-medium"
                      >
                        Buscar outro endereço
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Trocar fluxo */}
              {fluxo && !dadosGeo && (
                <button
                  onClick={() => { setFluxo(null); setDadosGeo(null); setCoordsMapa(null); }}
                  className="text-xs text-slate-400 underline font-medium"
                >
                  ← Voltar e escolher outro método
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="px-8 pb-8 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? 'Criando...' : <><Plus size={18} /> Criar Processo</>}
          </button>
        </div>
      </div>
    </div>
  );
};
