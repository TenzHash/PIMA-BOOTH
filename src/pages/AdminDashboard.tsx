import { useState, useEffect, useRef } from 'react';
import {
  Layers,
  Upload,
  Save,
  Trash2,
  ExternalLink,
  Edit,
  Type,
  Palette,
  Sparkles,
  QrCode,
  Image as ImageIcon,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  renderTemplate1,
  renderTemplate2,
  renderTemplate3,
  renderTemplate5,
  renderCustomPNGTemplate,
} from '../utils/templates';

interface TemplateConfig {
  title: string;
  subtitle: string;
  color: string;
  font: string;
  fontSize: string;
  gradient: string;
  sticker: string;
}

const defaultConfigMap: Record<string, TemplateConfig> = {
  '1': {
    title: 'PIMA ALBAY',
    subtitle: 'WELCOME PARTY 2026',
    color: '#FFFFFF',
    font: 'sans-serif',
    fontSize: 'normal',
    gradient: 'dark',
    sticker: 'none',
  },
  '2': {
    title: 'PIMA ALBAY',
    subtitle: 'WELCOME PARTY 2026',
    color: '#1E293B',
    font: 'serif',
    fontSize: 'normal',
    gradient: 'sunset',
    sticker: 'none',
  },
  '3': {
    title: 'PIMA ALBAY',
    subtitle: 'WELCOME PARTY 2026',
    color: '#1E293B',
    font: 'serif',
    fontSize: 'normal',
    gradient: 'pastel',
    sticker: 'none',
  },
  '4': {
    title: 'PIMA ALBAY',
    subtitle: 'WELCOME PARTY 2026',
    color: '#000000',
    font: 'sans-serif',
    fontSize: 'normal',
    gradient: 'monochrome',
    sticker: 'none',
  },
  '5': {
    title: 'PIMA',
    subtitle: 'WELCOME PARTY 2026',
    color: '#000000',
    font: 'sans-serif',
    fontSize: 'normal',
    gradient: 'monochrome',
    sticker: 'none',
  },
};

export default function AdminDashboard() {
  const [eventSlug, setEventSlug] = useState('pima-albay');
  const [eventName, setEventName] = useState('PIMA Albay Welcome Party');
  const [templateConfigs, setTemplateConfigs] =
    useState<Record<string, TemplateConfig>>(defaultConfigMap);
  const [activeTemplateId, setActiveTemplateId] = useState<number>(5);

  const [customTemplateUrls, setCustomTemplateUrls] = useState<string[]>([]);
  const [activeCustomImg, setActiveCustomImg] = useState<HTMLImageElement | null>(null);

  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<TemplateConfig>(defaultConfigMap['5']);

  const [dummyImages, setDummyImages] = useState<HTMLImageElement[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modalCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const imgs: HTMLImageElement[] = [];
    const colors = ['#1E293B', '#334155', '#475569', '#64748B', '#94A3B8', '#CBD5E1'];

    colors.forEach((color, i) => {
      const c = document.createElement('canvas');
      c.width = 1200;
      c.height = 800;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1200, 800);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 42px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Sample Frame ${i + 1}`, 600, 400);
      }
      const img = new Image();
      img.src = c.toDataURL();
      imgs.push(img);
    });

    setDummyImages(imgs);
  }, []);

  useEffect(() => {
    const fetchEvent = async () => {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('event_slug', eventSlug)
        .maybeSingle();

      if (data) {
        setEventName(data.event_name || 'PIMA Albay Welcome Party');
        if (data.template_configs && typeof data.template_configs === 'object') {
          setTemplateConfigs((prev) => ({ ...prev, ...data.template_configs }));
        }
        if (data.custom_template_urls && Array.isArray(data.custom_template_urls)) {
          setCustomTemplateUrls(data.custom_template_urls);
          if (data.custom_template_urls.length > 0) {
            loadCustomOverlay(data.custom_template_urls[0]);
          }
        }
      }
    };
    fetchEvent();
  }, [eventSlug]);

  const loadCustomOverlay = (url: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => {
      setActiveCustomImg(img);
    };
  };

  const handleCustomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const path = `${eventSlug}/custom_frame_${Date.now()}.png`;
    const { error: uploadErr } = await supabase.storage
      .from('event-photos')
      .upload(path, file, { contentType: 'image/png', upsert: true });

    if (uploadErr) {
      alert(`Upload error: ${uploadErr.message}`);
      return;
    }

    const { data } = supabase.storage.from('event-photos').getPublicUrl(path);
    const newUrls = [...customTemplateUrls, data.publicUrl];
    setCustomTemplateUrls(newUrls);
    loadCustomOverlay(data.publicUrl);
    setActiveTemplateId(4);

    await supabase
      .from('events')
      .update({ custom_template_urls: newUrls })
      .eq('event_slug', eventSlug);
  };

  const removeCustomOverlay = async (url: string) => {
    const updated = customTemplateUrls.filter((u) => u !== url);
    setCustomTemplateUrls(updated);
    if (updated.length > 0) {
      loadCustomOverlay(updated[0]);
    } else {
      setActiveCustomImg(null);
      if (activeTemplateId === 4) setActiveTemplateId(5);
    }

    await supabase
      .from('events')
      .update({ custom_template_urls: updated })
      .eq('event_slug', eventSlug);
  };

  useEffect(() => {
    if (!canvasRef.current || dummyImages.length < 4) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentConfig =
      templateConfigs[String(activeTemplateId)] ||
      defaultConfigMap[String(activeTemplateId)] ||
      defaultConfigMap['5'];

    const opts = {
      ctx,
      images: dummyImages,
      width: 1200,
      height: 2400,
      eventName: currentConfig.title,
      subtitleText: currentConfig.subtitle,
      textColor: currentConfig.color,
      fontStyle: currentConfig.font,
      fontSize: currentConfig.fontSize || 'normal',
      gradientTheme: currentConfig.gradient,
      stickerStyle: currentConfig.sticker,
      customOverlayImg: activeCustomImg,
    };

    if (activeTemplateId === 5) renderTemplate5(opts);
    if (activeTemplateId === 1) renderTemplate1(opts);
    if (activeTemplateId === 2) renderTemplate2(opts);
    if (activeTemplateId === 3) renderTemplate3(opts);
    if (activeTemplateId === 4) renderCustomPNGTemplate(opts);
  }, [activeTemplateId, templateConfigs, dummyImages, activeCustomImg]);

  useEffect(() => {
    if (!isEditingModalOpen || !modalCanvasRef.current || dummyImages.length < 4) return;
    const canvas = modalCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const opts = {
      ctx,
      images: dummyImages,
      width: 1200,
      height: 2400,
      eventName: editingConfig.title,
      subtitleText: editingConfig.subtitle,
      textColor: editingConfig.color,
      fontStyle: editingConfig.font,
      fontSize: editingConfig.fontSize || 'normal',
      gradientTheme: editingConfig.gradient,
      stickerStyle: editingConfig.sticker,
      customOverlayImg: activeCustomImg,
    };

    if (activeTemplateId === 5) renderTemplate5(opts);
    if (activeTemplateId === 1) renderTemplate1(opts);
    if (activeTemplateId === 2) renderTemplate2(opts);
    if (activeTemplateId === 3) renderTemplate3(opts);
    if (activeTemplateId === 4) renderCustomPNGTemplate(opts);
  }, [isEditingModalOpen, editingConfig, dummyImages, activeTemplateId, activeCustomImg]);

  const openCustomizer = () => {
    const config =
      templateConfigs[String(activeTemplateId)] ||
      defaultConfigMap[String(activeTemplateId)] ||
      defaultConfigMap['5'];
    setEditingConfig({ ...config });
    setIsEditingModalOpen(true);
  };

  const applyModalChanges = async () => {
    setIsSaving(true);
    const updatedMap = {
      ...templateConfigs,
      [String(activeTemplateId)]: editingConfig,
    };
    setTemplateConfigs(updatedMap);

    const { error } = await supabase.from('events').upsert(
      {
        event_slug: eventSlug,
        event_name: eventName,
        template_configs: updatedMap,
        custom_template_urls: customTemplateUrls,
      },
      { onConflict: 'event_slug' }
    );

    setIsSaving(false);
    if (!error) {
      setIsEditingModalOpen(false);
      setSaveMessage('Template customizations updated successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } else {
      alert(`Save error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-6 pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-900 border border-gray-800 p-5 rounded-3xl shadow-xl">
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-red-500" /> Photobooth Template Studio
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Configure individual template graphics & custom overlays
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href={`/booth?event=${eventSlug}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-lg"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Launch Live Booth
            </a>
          </div>
        </header>

        {saveMessage && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl text-emerald-300 text-xs font-semibold text-center">
            {saveMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Controls & Custom Overlay Management */}
          <div className="md:col-span-5 space-y-5">
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-3xl space-y-3">
              <h2 className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-red-500" /> Custom PNG Frame Upload
              </h2>
              <label className="w-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-700 hover:border-red-500 rounded-2xl cursor-pointer bg-black/40 transition">
                <Upload className="w-6 h-6 text-gray-400 mb-1" />
                <span className="text-[11px] font-semibold text-gray-300">
                  Upload Transparent Frame PNG
                </span>
                <span className="text-[10px] text-gray-500 mt-0.5">
                  1200 x 2400 resolution recommended
                </span>
                <input
                  type="file"
                  accept="image/png"
                  onChange={handleCustomUpload}
                  className="hidden"
                />
              </label>

              {customTemplateUrls.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">
                    Uploaded Custom Frames
                  </span>
                  <div className="space-y-1.5">
                    {customTemplateUrls.map((url, i) => (
                      <div
                        key={url}
                        className="flex items-center justify-between p-2 bg-black/50 border border-gray-800 rounded-xl text-xs"
                      >
                        <span className="truncate max-w-[170px] text-gray-300 text-[11px]">
                          Frame {i + 1} Overlay
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              loadCustomOverlay(url);
                              setActiveTemplateId(4);
                            }}
                            className="text-red-400 hover:text-red-300 font-semibold text-[11px]"
                          >
                            Use
                          </button>
                          <button
                            type="button"
                            onClick={() => removeCustomOverlay(url)}
                            className="text-gray-500 hover:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-900 border border-gray-800 p-4 rounded-3xl space-y-3 text-center">
              <h2 className="text-xs font-bold text-gray-300 flex items-center justify-center gap-1.5">
                <QrCode className="w-4 h-4 text-red-500" /> Event Access QR
              </h2>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  `${window.location.origin}/booth?event=${eventSlug}`
                )}`}
                alt="Event QR"
                className="w-36 h-36 mx-auto rounded-xl p-2 bg-white shadow-md"
              />
              <p className="text-[11px] text-gray-400">Scan to open live photobooth</p>
            </div>
          </div>

          {/* Right Live Preview & Template Tab Customizer */}
          <div className="md:col-span-7 bg-gray-900 border border-gray-800 p-5 rounded-3xl flex flex-col items-center space-y-4">
            {/* Template Selector Tabs */}
            <div className="grid grid-cols-5 gap-1.5 w-full">
              {[
                { id: 5, name: '4-Frame' },
                { id: 3, name: 'Polaroid' },
                { id: 1, name: 'Dark' },
                { id: 2, name: 'Sunset' },
                { id: 4, name: 'Custom' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTemplateId(t.id)}
                  className={`py-2 px-1 text-[11px] font-semibold rounded-xl border transition flex items-center justify-center gap-1 ${
                    activeTemplateId === t.id
                      ? 'bg-red-600 border-red-500 text-white font-bold shadow-md'
                      : 'bg-black border-gray-800 text-gray-400 hover:bg-gray-800'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  {t.name}
                </button>
              ))}
            </div>

            <div className="relative w-full max-w-[280px] aspect-[1/2] rounded-2xl overflow-hidden border border-gray-800 bg-black flex items-center justify-center shadow-2xl">
              <canvas
                ref={canvasRef}
                width={1200}
                height={2400}
                className="w-full h-auto rounded-xl"
              />
            </div>

            <button
              onClick={openCustomizer}
              className="w-full max-w-[280px] py-3 bg-red-600 hover:bg-red-700 active:scale-95 font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 text-white transition"
            >
              <Edit className="w-3.5 h-3.5" /> Customize Selected Template
            </button>
          </div>
        </div>

        {/* Modal: Per-Template Customization */}
        {isEditingModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-3xl p-5 shadow-2xl flex flex-col md:flex-row gap-5 max-h-[90vh] overflow-y-auto no-scrollbar">
              {/* Live Modal Canvas Preview */}
              <div className="w-full md:w-1/2 flex flex-col items-center justify-center bg-black/50 p-3 rounded-2xl border border-gray-800">
                <span className="text-[10px] font-bold text-gray-400 uppercase mb-2">
                  Live Preview
                </span>
                <div className="relative w-full max-w-[200px] aspect-[1/2] rounded-xl overflow-hidden border border-gray-800 bg-gray-950 flex items-center justify-center shadow-lg">
                  <canvas
                    ref={modalCanvasRef}
                    width={1200}
                    height={2400}
                    className="w-full h-auto rounded-lg"
                  />
                </div>
              </div>

              {/* Editing Controls */}
              <div className="w-full md:w-1/2 space-y-3.5 text-left">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Edit className="w-4 h-4 text-red-500" /> Edit Template #{activeTemplateId}
                </h3>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-300 flex items-center gap-1">
                    <Type className="w-3 h-3 text-red-500" /> Header Title
                  </label>
                  <input
                    type="text"
                    value={editingConfig.title}
                    onChange={(e) => setEditingConfig({ ...editingConfig, title: e.target.value })}
                    className="w-full bg-black border border-gray-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-300">Subtitle / Date</label>
                  <input
                    type="text"
                    value={editingConfig.subtitle}
                    onChange={(e) =>
                      setEditingConfig({ ...editingConfig, subtitle: e.target.value })
                    }
                    className="w-full bg-black border border-gray-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-300">Font Family</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['sans-serif', 'serif', 'monospace'].map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setEditingConfig({ ...editingConfig, font: f })}
                        className={`py-1.5 text-[11px] rounded-lg border capitalize transition ${
                          editingConfig.font === f
                            ? 'bg-red-600 border-red-500 text-white font-bold'
                            : 'bg-black border-gray-800 text-gray-400'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size Selector Control */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-300">Font Size</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'small', name: 'Compact' },
                      { id: 'normal', name: 'Normal' },
                      { id: 'large', name: 'Large' },
                    ].map((sz) => (
                      <button
                        key={sz.id}
                        type="button"
                        onClick={() => setEditingConfig({ ...editingConfig, fontSize: sz.id })}
                        className={`py-1.5 text-[11px] font-bold rounded-lg border transition ${
                          editingConfig.fontSize === sz.id
                            ? 'bg-red-600 border-red-500 text-white'
                            : 'bg-black border-gray-800 text-gray-400'
                        }`}
                      >
                        {sz.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-300 flex items-center gap-1">
                    <Palette className="w-3 h-3 text-red-500" /> Background Theme
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['dark', 'sunset', 'pastel', 'monochrome', 'neon'].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setEditingConfig({ ...editingConfig, gradient: g })}
                        className={`py-1.5 text-[10px] rounded-lg border capitalize transition ${
                          editingConfig.gradient === g
                            ? 'bg-red-600 border-red-500 text-white font-bold'
                            : 'bg-black border-gray-800 text-gray-400'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-red-500" /> Sticker Overlay
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['none', 'stars', 'hearts', 'sparkles', 'vintage-badge'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setEditingConfig({ ...editingConfig, sticker: s })}
                        className={`py-1.5 text-[10px] rounded-lg border capitalize transition ${
                          editingConfig.sticker === s
                            ? 'bg-red-600 border-red-500 text-white font-bold'
                            : 'bg-black border-gray-800 text-gray-400'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingModalOpen(false)}
                    className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={applyModalChanges}
                    disabled={isSaving}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition"
                  >
                    <Save className="w-3.5 h-3.5" /> Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
