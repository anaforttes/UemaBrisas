import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, CheckCircle2, MapPin,
  Navigation, Building2, Camera, Loader2,
  AlertTriangle, X, Map, Plus,
} from 'lucide-react';
import { dbService } from '../../services/databaseService';
import { User } from '../../types/index';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Props {
  currentUser: User;
}

interface DadosGeo {
  latitude: number;
  longitude: number;
  precisao: number;
  municipioDetectado: string;
  estadoDetectado: string;
  capturadoEm: string;
  fluxo: 'campo' | 'escritorio';
  fotoUrl?: string;
}

// ─── Hook GPS ────────────────────────────────────────────────────────────────

function useGPS() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro]             = useState<string | null>(null);

  const capturar = () =>
    new Promise<GeolocationCoordinates>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalização não suportada.'));
        return;
      }
      setCarregando(true);
      setErro(null);
      navigator.geolocation.getCurrentPosition(
        pos => { setCarregando(false); resolve(pos.coords); },
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

  return { carregando, erro, capturar };
}

// ─── Geocodificação ───────────────────────────────────────────────────────────

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const GEO_HEADERS = { 'User-Agent': 'REURBDoc/1.0 (regularizacao fundiaria)' };

async function geocodificarReverso(lat: number, lng: number) {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lng), format: 'json', addressdetails: '1', 'accept-language': 'pt-BR' });
  const res  = await fetch(`${NOMINATIM}/reverse?${params}`, { headers: GEO_HEADERS });
  const data = await res.json();
  const end  = data.address ?? {};
  return {
    municipio: end.city || end.town || end.village || end.county || 'Desconhecido',
    estado:    (end.state_code || end.state || '??').toUpperCase(),
  };
}

async function geocodificarEndereco(endereco: string) {
  const params = new URLSearchParams({ q: `${endereco}, Brasil`, format: 'json', addressdetails: '1', 'accept-language': 'pt-BR', limit: '1' });
  const res  = await fetch(`${NOMINATIM}/search?${params}`, { headers: GEO_HEADERS });
  const data = await res.json();
  if (!data.length) throw new Error('Endereço não encontrado. Seja mais específico.');
  const item = data[0];
  const end  = item.address ?? {};
  return {
    lat:      parseFloat(item.lat),
    lng:      parseFloat(item.lon),
    municipio: end.city || end.town || end.village || end.county || 'Desconhecido',
    estado:    (end.state_code || end.state || '??').toUpperCase(),
  };
}

// ─── Mapa Leaflet ─────────────────────────────────────────────────────────────

const MapaLeaflet: React.FC<{ lat: number; lng: number; label?: string }> = ({ lat, lng, label }) => {
  const refDiv = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link  = document.createElement('link');
      link.id     = 'leaflet-css';
      link.rel    = 'stylesheet';
      link.href   = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    const inicializar = () => {
      const L = (window as any).L;
      if (!L || !refDiv.current) return;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      const mapa = L.map(refDiv.current).setView([lat, lng], 15);
      mapRef.current = mapa;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(mapa);
      const icone = L.divIcon({
        className: '',
        html: `<div style="width:32px;height:32px;background:#2563eb;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
        iconSize: [32, 32], iconAnchor: [16, 32],
      });
      L.marker([lat, lng], { icon: icone }).addTo(mapa).bindPopup(label || `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`).openPopup();
    };
    if ((window as any).L) { inicializar(); }
    else {
      const script  = document.createElement('script');
      script.src    = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = inicializar;
      document.head.appendChild(script);
    }
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [lat, lng, label]);

  return <div ref={refDiv} style={{ height: 200, borderRadius: 16, zIndex: 0 }} className="w-full border border-slate-100 overflow-hidden shadow-sm" />;
};

// ─── Indicador de Etapas ─────────────────────────────────────────────────────

const Etapas: React.FC<{ atual: number }> = ({ atual }) => {
  const etapas = ['Identificação', 'Equipe Técnica', 'Geolocalização'];
  return (
    <div className="flex items-center gap-2">
      {etapas.map((nome, i) => {
        const n = i + 1;
        const concluida = n < atual;
        const ativa     = n === atual;
        return (
          <React.Fragment key={nome}>
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                concluida ? 'bg-green-500 text-white' : ativa ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                {concluida ? <CheckCircle2 size={14} /> : n}
              </div>
              <span className={`text-xs font-bold hidden sm:block ${ativa ? 'text-blue-600' : concluida ? 'text-green-600' : 'text-slate-400'}`}>
                {nome}
              </span>
            </div>
            {i < etapas.length - 1 && (
              <div className={`flex-1 h-px mx-1 ${concluida ? 'bg-green-300' : 'bg-slate-200'}`} style={{ minWidth: 20 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export const NewProcessWizard: React.FC<Props> = ({ currentUser }) => {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState(1);

  // ── Etapa 1: Identificação ───────────────────────────────────────────────
  const [form, setForm] = useState({
    title: '', applicant: '', location: '',
    modality: 'REURB-S' as 'REURB-S' | 'REURB-E',
    area: '', municipio: '', estado: '',
  });
  const [erro1, setErro1] = useState('');

  // ── Etapa 2: Equipe ──────────────────────────────────────────────────────
  const [equipe, setEquipe] = useState({
    responsibleName: '', funcao: 'Responsável Técnico',
    conselho: 'CREA', registro: '',
  });
  const [membrosExtra, setMembrosExtra] = useState<{ nome: string; funcao: string; registro: string }[]>([]);

  // ── Etapa 3: Geolocalização ──────────────────────────────────────────────
  const [fluxoGeo, setFluxoGeo]           = useState<'campo' | 'escritorio' | null>(null);
  const [dadosGeo, setDadosGeo]           = useState<DadosGeo | null>(null);
  const [coordsMapa, setCoordsMapa]       = useState<{ lat: number; lng: number } | null>(null);
  const [enderecoText, setEnderecoText]   = useState('');
  const [buscandoEnd, setBuscandoEnd]     = useState(false);
  const [erroEnd, setErroEnd]             = useState<string | null>(null);
  const [fotoPreview, setFotoPreview]     = useState<string | null>(null);
  const [loading, setLoading]             = useState(false);
  const refFoto = useRef<HTMLInputElement>(null);
  const gps     = useGPS();

  // ── Handlers Etapa 1 ─────────────────────────────────────────────────────

  const handleChange1 = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const avancarEtapa1 = () => {
    if (!form.title || !form.applicant) { setErro1('Preencha Título e Requerente.'); return; }
    setErro1('');
    setEtapa(2);
  };

  // ── Handlers Etapa 2 ─────────────────────────────────────────────────────

  const adicionarMembro = () =>
    setMembrosExtra(m => [...m, { nome: '', funcao: '', registro: '' }]);

  const atualizarMembro = (i: number, campo: string, valor: string) =>
    setMembrosExtra(m => m.map((mb, idx) => idx === i ? { ...mb, [campo]: valor } : mb));

  const removerMembro = (i: number) =>
    setMembrosExtra(m => m.filter((_, idx) => idx !== i));

  // ── Handlers Etapa 3: GPS campo ──────────────────────────────────────────

  const handleCapturarGPS = async () => {
    try {
      const coords = await gps.capturar();
      const { municipio, estado } = await geocodificarReverso(coords.latitude, coords.longitude);
      const geo: DadosGeo = {
        latitude: coords.latitude, longitude: coords.longitude,
        precisao: Math.round(coords.accuracy),
        municipioDetectado: municipio, estadoDetectado: estado,
        capturadoEm: new Date().toISOString(), fluxo: 'campo',
      };
      setDadosGeo(geo);
      setCoordsMapa({ lat: coords.latitude, lng: coords.longitude });
      if (!form.municipio) setForm(f => ({ ...f, municipio, estado, location: `${municipio} — ${estado}` }));
    } catch { /* tratado no hook */ }
  };

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setFotoPreview(url);
      setDadosGeo(prev => prev ? { ...prev, fotoUrl: url } : null);
    };
    reader.readAsDataURL(arquivo);
  };

  // ── Handlers Etapa 3: Escritório ─────────────────────────────────────────

  const handleValidarEndereco = async () => {
    if (!enderecoText.trim()) return;
    setBuscandoEnd(true);
    setErroEnd(null);
    try {
      const r = await geocodificarEndereco(enderecoText);
      const geo: DadosGeo = {
        latitude: r.lat, longitude: r.lng, precisao: 0,
        municipioDetectado: r.municipio, estadoDetectado: r.estado,
        capturadoEm: new Date().toISOString(), fluxo: 'escritorio',
      };
      setDadosGeo(geo);
      setCoordsMapa({ lat: r.lat, lng: r.lng });
      if (!form.municipio) setForm(f => ({ ...f, municipio: r.municipio, estado: r.estado, location: `${r.municipio} — ${r.estado}` }));
    } catch (err: any) {
      setErroEnd(err.message);
    } finally {
      setBuscandoEnd(false);
    }
  };

  // ── Submit final ─────────────────────────────────────────────────────────

  const handleCriar = async () => {
    setLoading(true);
    try {
      const processo = dbService.processes.insert({
        title:           form.title,
        applicant:       form.applicant,
        location:        form.location || `${form.municipio} — ${form.estado}`,
        modality:        form.modality,
        area:            form.area,
        responsibleName: equipe.responsibleName,
        municipio:       dadosGeo?.municipioDetectado || form.municipio,
        estado:          dadosGeo?.estadoDetectado    || form.estado,
        technicianId:    currentUser.id,
        legalId:         currentUser.id,
      });
      // Redireciona para templates com o processo recém-criado selecionado
      navigate('/templates', { state: { processoId: processo.id } });
    } catch {
      setLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Header fixo ────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-100 px-8 py-4 flex items-center gap-6 shadow-sm">
        <button
          onClick={() => etapa > 1 ? setEtapa(e => e - 1) : navigate(-1)}
          className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-black text-slate-800">Novo Processo REURB</h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Após criar, você será direcionado para escolher o modelo de documento
          </p>
        </div>
        <div className="flex-1 max-w-sm">
          <Etapas atual={etapa} />
        </div>
      </div>

      {/* ── Conteúdo ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl">

          {/* ════════════════════════════════════════════════════════════
              ETAPA 1 — Identificação
          ════════════════════════════════════════════════════════════ */}
          {etapa === 1 && (
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="px-8 pt-8 pb-6 border-b border-slate-50">
                <h2 className="text-xl font-black text-slate-800">Identificação do Núcleo</h2>
                <p className="text-slate-400 text-sm font-medium mt-1">Dados principais do processo REURB</p>
              </div>

              <div className="p-8 space-y-5">
                {erro1 && (
                  <div className="bg-red-50 border border-red-100 text-red-600 text-sm font-medium px-4 py-3 rounded-2xl">
                    {erro1}
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Título do Núcleo / Processo *</label>
                  <input name="title" value={form.title} onChange={handleChange1}
                    placeholder="Ex: Núcleo Habitacional Esperança"
                    className="w-full px-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 transition-all" />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Requerente *</label>
                  <input name="applicant" value={form.applicant} onChange={handleChange1}
                    placeholder="Ex: Associação de Moradores Vila Verde"
                    className="w-full px-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 transition-all" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Município</label>
                    <input name="municipio" value={form.municipio} onChange={handleChange1}
                      placeholder="Ex: São Luís"
                      className="w-full px-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Estado</label>
                    <input name="estado" value={form.estado} onChange={handleChange1}
                      placeholder="Ex: MA"
                      className="w-full px-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 transition-all" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Bairro / Localização</label>
                  <input name="location" value={form.location} onChange={handleChange1}
                    placeholder="Ex: Bairro Coroadinho, São Luís — MA"
                    className="w-full px-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 transition-all" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Modalidade</label>
                    <select name="modality" value={form.modality} onChange={handleChange1}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-200 transition-all cursor-pointer">
                      <option value="REURB-S">REURB-S</option>
                      <option value="REURB-E">REURB-E</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Área Total</label>
                    <input name="area" value={form.area} onChange={handleChange1}
                      placeholder="Ex: 15.400 m²"
                      className="w-full px-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 transition-all" />
                  </div>
                </div>
              </div>

              <div className="px-8 pb-8 flex gap-3">
                <button onClick={() => navigate(-1)}
                  className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all">
                  Cancelar
                </button>
                <button onClick={avancarEtapa1}
                  className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-2">
                  Próxima etapa <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              ETAPA 2 — Equipe Técnica
          ════════════════════════════════════════════════════════════ */}
          {etapa === 2 && (
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="px-8 pt-8 pb-6 border-b border-slate-50">
                <h2 className="text-xl font-black text-slate-800">Equipe Técnica</h2>
                <p className="text-slate-400 text-sm font-medium mt-1">Profissionais responsáveis pelo processo</p>
              </div>

              <div className="p-8 space-y-6">

                {/* Responsável principal */}
                <div>
                  <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4">Responsável Técnico Principal</p>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nome Completo</label>
                      <input value={equipe.responsibleName}
                        onChange={e => setEquipe(q => ({ ...q, responsibleName: e.target.value }))}
                        placeholder="Ex: Eng. Carlos Souza"
                        className="w-full px-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 transition-all" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Função</label>
                      <input value={equipe.funcao}
                        onChange={e => setEquipe(q => ({ ...q, funcao: e.target.value }))}
                        placeholder="Ex: Responsável Técnico"
                        className="w-full px-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 transition-all" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Conselho</label>
                      <select value={equipe.conselho}
                        onChange={e => setEquipe(q => ({ ...q, conselho: e.target.value }))}
                        className="w-full px-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-200 transition-all cursor-pointer">
                        <option>CREA</option><option>CAU</option><option>OAB</option><option>CRG</option><option>CRESS</option><option>Outro</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nº de Registro</label>
                      <input value={equipe.registro}
                        onChange={e => setEquipe(q => ({ ...q, registro: e.target.value }))}
                        placeholder="Ex: 12345-D/MA"
                        className="w-full px-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 transition-all" />
                    </div>
                  </div>
                </div>

                {/* Membros extras */}
                {membrosExtra.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Demais Membros</p>
                    {membrosExtra.map((mb, i) => (
                      <div key={i} className="relative bg-slate-50 rounded-2xl p-4 space-y-3">
                        <button onClick={() => removerMembro(i)}
                          className="absolute top-3 right-3 p-1 hover:bg-slate-200 rounded-lg transition-all text-slate-400">
                          <X size={14} />
                        </button>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nome</label>
                            <input value={mb.nome} onChange={e => atualizarMembro(i, 'nome', e.target.value)}
                              placeholder="Nome"
                              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-200 transition-all" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Função</label>
                            <input value={mb.funcao} onChange={e => atualizarMembro(i, 'funcao', e.target.value)}
                              placeholder="Função"
                              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-200 transition-all" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Registro</label>
                            <input value={mb.registro} onChange={e => atualizarMembro(i, 'registro', e.target.value)}
                              placeholder="Ex: CAU A00000-0"
                              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-200 transition-all" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={adicionarMembro}
                  className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 text-sm font-bold hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2">
                  <Plus size={16} /> Adicionar membro
                </button>
              </div>

              <div className="px-8 pb-8 flex gap-3">
                <button onClick={() => setEtapa(1)}
                  className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                  <ArrowLeft size={16} /> Voltar
                </button>
                <button onClick={() => setEtapa(3)}
                  className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-2">
                  Próxima etapa <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              ETAPA 3 — Geolocalização
          ════════════════════════════════════════════════════════════ */}
          {etapa === 3 && (
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="px-8 pt-8 pb-6 border-b border-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center">
                    <MapPin size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800">Geolocalização do Núcleo</h2>
                    <p className="text-slate-400 text-sm font-medium mt-0.5">Registre as coordenadas GPS do núcleo urbano</p>
                  </div>
                  {dadosGeo && (
                    <span className="ml-auto text-[10px] font-black px-3 py-1.5 rounded-full bg-green-100 text-green-700">
                      {dadosGeo.fluxo === 'campo' ? '📍 Campo' : '🏢 Escritório'}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-8 space-y-5">

                {/* Escolha do fluxo */}
                {!fluxoGeo && !dadosGeo && (
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setFluxoGeo('campo')}
                      className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-blue-200 rounded-[24px] hover:border-blue-500 hover:bg-blue-50 transition-all group">
                      <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-200 transition-all">
                        <Navigation size={22} className="text-blue-600" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-black text-slate-800">Estou em campo</p>
                        <p className="text-[11px] text-slate-400 mt-1">GPS do dispositivo + foto do local</p>
                      </div>
                    </button>
                    <button onClick={() => setFluxoGeo('escritorio')}
                      className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-slate-200 rounded-[24px] hover:border-slate-400 hover:bg-slate-50 transition-all group">
                      <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center group-hover:bg-slate-200 transition-all">
                        <Building2 size={22} className="text-slate-500" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-black text-slate-800">Escritório</p>
                        <p className="text-[11px] text-slate-400 mt-1">Digitar endereço e validar</p>
                      </div>
                    </button>
                  </div>
                )}

                {/* Fluxo Campo */}
                {fluxoGeo === 'campo' && (
                  <div className="space-y-4">
                    {!dadosGeo && (
                      <button onClick={handleCapturarGPS} disabled={gps.carregando}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-60 shadow-lg shadow-blue-100">
                        {gps.carregando
                          ? <><Loader2 size={16} className="animate-spin" /> Capturando GPS...</>
                          : <><Navigation size={16} /> Capturar localização atual</>}
                      </button>
                    )}
                    {gps.erro && (
                      <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-2xl">
                        <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-600 font-medium">{gps.erro}</p>
                      </div>
                    )}
                    {dadosGeo && (
                      <div className="space-y-4">
                        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-2xl">
                          <CheckCircle2 size={18} className="text-green-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-black text-green-700">{dadosGeo.municipioDetectado}/{dadosGeo.estadoDetectado}</p>
                            <p className="text-[11px] text-green-600 font-mono mt-0.5">
                              Lat: {dadosGeo.latitude.toFixed(6)} | Lng: {dadosGeo.longitude.toFixed(6)} | ±{dadosGeo.precisao}m
                            </p>
                            <p className="text-[10px] text-green-500 mt-0.5">{new Date(dadosGeo.capturadoEm).toLocaleString('pt-BR')}</p>
                          </div>
                        </div>
                        <MapaLeaflet lat={dadosGeo.latitude} lng={dadosGeo.longitude} label={`📍 ${form.title}`} />
                        <input ref={refFoto} type="file" accept="image/*" capture="environment" onChange={handleFoto} className="hidden" />
                        {!fotoPreview ? (
                          <button onClick={() => refFoto.current?.click()}
                            className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 text-sm font-bold hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all">
                            <Camera size={18} /> Tirar foto do local (opcional)
                          </button>
                        ) : (
                          <div className="relative">
                            <img src={fotoPreview} alt="Foto" className="w-full h-44 object-cover rounded-2xl" />
                            <button onClick={() => { setFotoPreview(null); setDadosGeo(p => p ? { ...p, fotoUrl: undefined } : null); }}
                              className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-all">
                              <X size={14} />
                            </button>
                          </div>
                        )}
                        <button onClick={() => { setDadosGeo(null); setCoordsMapa(null); setFotoPreview(null); }}
                          className="text-xs text-slate-400 underline font-medium">Recapturar localização</button>
                      </div>
                    )}
                    {!dadosGeo && (
                      <button onClick={() => setFluxoGeo(null)} className="text-xs text-slate-400 underline font-medium">← Voltar</button>
                    )}
                  </div>
                )}

                {/* Fluxo Escritório */}
                {fluxoGeo === 'escritorio' && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <input value={enderecoText} onChange={e => setEnderecoText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleValidarEndereco()}
                        placeholder="Ex: Rua das Flores, Coroadinho, São Luís - MA"
                        className="flex-1 px-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 transition-all" />
                      <button onClick={handleValidarEndereco} disabled={buscandoEnd || !enderecoText.trim()}
                        className="px-5 py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-60 flex items-center gap-2 shrink-0">
                        {buscandoEnd ? <Loader2 size={14} className="animate-spin" /> : <Map size={14} />} Validar
                      </button>
                    </div>
                    {erroEnd && (
                      <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-2xl">
                        <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-600 font-medium">{erroEnd}</p>
                      </div>
                    )}
                    {dadosGeo && coordsMapa && (
                      <div className="space-y-4">
                        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-2xl">
                          <CheckCircle2 size={18} className="text-green-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-black text-green-700">Endereço validado — {dadosGeo.municipioDetectado}/{dadosGeo.estadoDetectado}</p>
                            <p className="text-[11px] text-green-600 font-mono mt-0.5">Lat: {dadosGeo.latitude.toFixed(6)} | Lng: {dadosGeo.longitude.toFixed(6)}</p>
                          </div>
                        </div>
                        <MapaLeaflet lat={coordsMapa.lat} lng={coordsMapa.lng} label={enderecoText} />
                        <button onClick={() => { setDadosGeo(null); setCoordsMapa(null); setEnderecoText(''); }}
                          className="text-xs text-slate-400 underline font-medium">Buscar outro endereço</button>
                      </div>
                    )}
                    {!dadosGeo && (
                      <button onClick={() => setFluxoGeo(null)} className="text-xs text-slate-400 underline font-medium">← Voltar</button>
                    )}
                  </div>
                )}

                {/* Info: geo opcional */}
                {!dadosGeo && (
                  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                    <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 font-medium">
                      A geolocalização é recomendada para garantir a integridade do processo,
                      mas você pode pular esta etapa.
                    </p>
                  </div>
                )}
              </div>

              <div className="px-8 pb-8 flex gap-3">
                <button onClick={() => setEtapa(2)}
                  className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                  <ArrowLeft size={16} /> Voltar
                </button>
                <button onClick={handleCriar} disabled={loading}
                  className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading
                    ? <><Loader2 size={16} className="animate-spin" /> Criando...</>
                    : <><CheckCircle2 size={16} /> Criar e escolher modelo</>}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
