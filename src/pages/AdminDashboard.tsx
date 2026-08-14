import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import {
  FolderPlus,
  Download,
  ExternalLink,
  Image as ImageIcon,
  Calendar,
  Sparkles,
  Upload,
  LogOut,
  Palette,
  Save,
  Trash2,
  Eye,
  Check,
  RefreshCw,
  Smile,
  Layers,
  Sliders,
  X,
  Type,
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

interface ExtendedEventSession {
  id: string;
  event_name: string;
  event_slug: string;
  custom_template_urls?: string[];
  template_configs?: Record<string, TemplateConfig>;
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
  const [events, setEvents] = useState<ExtendedEventSession[]>([]);
  const [eventName, setEventName] = useState('');
  const [eventSlug, setEventSlug] = useState('');

  const [selectedEvent, setSelectedEvent] = useState<ExtendedEventSession | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [eventPhotos, setEventPhotos] = useState<any[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [loading, setLoading] = useState(false);

  // Per-Template Customization Map & Modal State
  const [templateConfigs, setTemplateConfigs] =
    useState<Record<string, TemplateConfig>>(defaultConfigMap);
  const [activeTemplateId, setActiveTemplateId] = useState<number>(5);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [savingText, setSavingText] = useState(false);

  // Custom PNG Templates Management
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [selectedCustomTemplateUrl, setSelectedCustomTemplateUrl] = useState<string | null>(null);
  const [loadedCustomOverlay, setLoadedCustomOverlay] = useState<HTMLImageElement | null>(null);

  // Live Canvas Preview Reference & Dummy Images
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const modalCanvasRef = useRef<HTMLCanvasElement>(null);
  const [dummyImages, setDummyImages] = useState<HTMLImageElement[]>([]);

  // Generate dummy images for live preview
  useEffect(() => {
    const imgs: HTMLImageElement[] = [];
    const colors = ['#2C3E50', '#8E44AD', '#2980B9', '#16A085', '#D35400', '#C0392B'];

    colors.forEach((color, i) => {
      const c = document.createElement('canvas');
      c.width = 1200;
      c.height = 800;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1200, 800);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Sample Frame ${i + 1}`, 600, 400);
      }
      const img = new Image();
      img.src = c.toDataURL();
      imgs.push(img);
    });

    setDummyImages(imgs);
  }, []);

  // Pre-load selected custom template overlay image
  useEffect(() => {
    if (selectedCustomTemplateUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = selectedCustomTemplateUrl;
      img.onload = () => {
        setLoadedCustomOverlay(img);
        setActiveTemplateId(4);
      };
      img.onerror = () => setLoadedCustomOverlay(null);
    } else {
      setLoadedCustomOverlay(null);
      if (activeTemplateId === 4) setActiveTemplateId(5);
    }
  }, [selectedCustomTemplateUrl]);

  // Fetch photos for the selected event
  const fetchPhotosForEvent = useCallback(async (slug: string) => {
    setLoadingPhotos(true);
    const cleanSlug = slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');

    const { data, error } = await supabase
      .from('event_photos')
      .select('*')
      .eq('event_slug', cleanSlug)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setEventPhotos(data);
    } else {
      setEventPhotos([]);
    }
    setLoadingPhotos(false);
  }, []);

  const selectEvent = useCallback(async (eventItem: ExtendedEventSession) => {
    setSelectedEvent(eventItem);

    const loadedConfigs = eventItem.template_configs
      ? { ...defaultConfigMap, ...eventItem.template_configs }
      : defaultConfigMap;

    setTemplateConfigs(loadedConfigs);
    setActiveTemplateId(5);

    const templatesList = eventItem.custom_template_urls || [];
    setSelectedCustomTemplateUrl(templatesList.length > 0 ? templatesList[0] : null);

    const boothUrl = `${window.location.origin}/booth?event=${encodeURIComponent(eventItem.event_slug)}`;

    try {
      const qrUrl = await QRCode.toDataURL(boothUrl, {
        width: 800,
        margin: 2,
        color: { dark: '#121212', light: '#FFFFFF' },
      });
      setQrCodeDataUrl(qrUrl);
    } catch (err) {
      console.error('QR Generation Error:', err);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setEvents(data);
      if (data.length > 0) {
        selectEvent(data[0]);
      }
    }
  }, [selectEvent]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Real-time photos updates
  useEffect(() => {
    if (selectedEvent?.event_slug) {
      fetchPhotosForEvent(selectedEvent.event_slug);

      const channel = supabase
        .channel(`realtime_admin_photos_${selectedEvent.event_slug}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'event_photos' },
          (payload) => {
            const newPhoto = payload.new as any;
            const currentCleanSlug = selectedEvent.event_slug
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-');
            if (newPhoto.event_slug === currentCleanSlug) {
              setEventPhotos((prev) => [newPhoto, ...prev]);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedEvent, fetchPhotosForEvent]);

  // Render canvas logic
  const drawTemplateCanvas = useCallback(
    (canvasTarget: HTMLCanvasElement | null) => {
      if (!canvasTarget || dummyImages.length < 4) return;
      const ctx = canvasTarget.getContext('2d');
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
        customOverlayImg: loadedCustomOverlay,
      };

      if (activeTemplateId === 5) renderTemplate5(opts);
      if (activeTemplateId === 1) renderTemplate1(opts);
      if (activeTemplateId === 2) renderTemplate2(opts);
      if (activeTemplateId === 3) renderTemplate3(opts);
      if (activeTemplateId === 4) renderCustomPNGTemplate(opts);
    },
    [dummyImages, activeTemplateId, templateConfigs, loadedCustomOverlay]
  );

  useEffect(() => {
    drawTemplateCanvas(previewCanvasRef.current);
    if (showCustomizeModal) {
      drawTemplateCanvas(modalCanvasRef.current);
    }
  }, [drawTemplateCanvas, showCustomizeModal]);

  const updateActiveConfig = (field: keyof TemplateConfig, value: string) => {
    const key = String(activeTemplateId);
    setTemplateConfigs((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || defaultConfigMap[key] || defaultConfigMap['5']),
        [field]: value,
      },
    }));
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName || !eventSlug) return;

    setLoading(true);
    const cleanSlug = eventSlug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');

    const { data, error } = await supabase
      .from('events')
      .insert([
        {
          event_name: eventName,
          event_slug: cleanSlug,
          title_text: eventName,
          subtitle_text: 'Official Event Memory',
          text_color: '#2C3E50',
          font_style: 'serif',
          template_configs: defaultConfigMap,
          custom_template_urls: [],
        },
      ])
      .select()
      .single();

    if (error) {
      alert(`Error creating event: ${error.message}`);
    } else if (data) {
      setEvents([data, ...events]);
      selectEvent(data);
      setEventName('');
      setEventSlug('');
    }
    setLoading(false);
  };

  const handleUploadCustomTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !templateFile) return;

    setUploadingTemplate(true);

    const cleanFileName = templateFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `custom-frames/${Date.now()}_${cleanFileName}`;

    const { error: uploadErr } = await supabase.storage
      .from('templates')
      .upload(filePath, templateFile, { contentType: 'image/png', upsert: true });

    if (uploadErr) {
      alert(`Template Storage Upload Failed: ${uploadErr.message}`);
      setUploadingTemplate(false);
      return;
    }

    const { data: pubData } = supabase.storage.from('templates').getPublicUrl(filePath);
    const newTemplateUrl = pubData.publicUrl;

    const { data: latestEvent } = await supabase
      .from('events')
      .select('custom_template_urls')
      .eq('id', selectedEvent.id)
      .single();

    const existingArray: string[] = latestEvent?.custom_template_urls || [];
    const updatedArray = [newTemplateUrl, ...existingArray];

    const { error: updateErr } = await supabase
      .from('events')
      .update({ custom_template_urls: updatedArray })
      .eq('id', selectedEvent.id);

    if (updateErr) {
      alert(`Failed to save template to database: ${updateErr.message}`);
    } else {
      alert('New PNG Frame Template uploaded and saved!');
      setTemplateFile(null);

      const updatedEvent = { ...selectedEvent, custom_template_urls: updatedArray };
      setSelectedEvent(updatedEvent);
      setSelectedCustomTemplateUrl(newTemplateUrl);

      setEvents((prevEvents) =>
        prevEvents.map((ev) => (ev.id === selectedEvent.id ? updatedEvent : ev))
      );
    }

    setUploadingTemplate(false);
  };

  const handleDeleteCustomTemplate = async (urlToDelete: string) => {
    if (!selectedEvent) return;

    if (!window.confirm('Are you sure you want to remove this PNG template?')) return;

    const { data: latestEvent, error: fetchErr } = await supabase
      .from('events')
      .select('custom_template_urls')
      .eq('id', selectedEvent.id)
      .single();

    if (fetchErr) {
      alert(`Failed to fetch event data: ${fetchErr.message}`);
      return;
    }

    const existingTemplates: string[] = latestEvent?.custom_template_urls || [];
    const updatedTemplates = existingTemplates.filter((url) => url !== urlToDelete);

    const { error: updateErr } = await supabase
      .from('events')
      .update({ custom_template_urls: updatedTemplates })
      .eq('id', selectedEvent.id);

    if (updateErr) {
      alert(`Failed to delete template from database: ${updateErr.message}`);
    } else {
      const updatedEvent = { ...selectedEvent, custom_template_urls: updatedTemplates };
      setSelectedEvent(updatedEvent);

      if (selectedCustomTemplateUrl === urlToDelete) {
        setSelectedCustomTemplateUrl(updatedTemplates[0] || null);
      }

      setEvents((prevEvents) =>
        prevEvents.map((ev) => (ev.id === selectedEvent.id ? updatedEvent : ev))
      );
    }
  };

  const handleSaveAllTemplateConfigs = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedEvent) return;

    setSavingText(true);

    const activeConfig = templateConfigs[String(activeTemplateId)] || defaultConfigMap['5'];

    const { error } = await supabase
      .from('events')
      .update({
        template_configs: templateConfigs,
        title_text: activeConfig.title,
        subtitle_text: activeConfig.subtitle,
        text_color: activeConfig.color,
        font_style: activeConfig.font,
      })
      .eq('id', selectedEvent.id);

    if (error) {
      alert(`Failed to update template settings: ${error.message}`);
    } else {
      alert(`Configuration saved for Template ${activeTemplateId}!`);
      setShowCustomizeModal(false);
      fetchEvents();
    }
    setSavingText(false);
  };

  const handleDeleteEvent = async (eventId: string, eventNameStr: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${eventNameStr}"? This will also remove all associated photos.`
      )
    ) {
      return;
    }

    const { error } = await supabase.from('events').delete().eq('id', eventId);

    if (error) {
      alert(`Failed to delete event: ${error.message}`);
      return;
    }

    setEvents((prev) => {
      const updated = prev.filter((ev) => ev.id !== eventId);
      if (selectedEvent?.id === eventId) {
        if (updated.length > 0) {
          selectEvent(updated[0]);
        } else {
          setSelectedEvent(null);
          setEventPhotos([]);
        }
      }
      return updated;
    });

    alert(`Event "${eventNameStr}" successfully deleted.`);
  };

  const currentConfig =
    templateConfigs[String(activeTemplateId)] ||
    defaultConfigMap[String(activeTemplateId)] ||
    defaultConfigMap['5'];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8 max-w-7xl mx-auto antialiased">
      <header className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-800 mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-red-500 tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-7 h-7" /> PIMA ALBAY ADMIN
          </h1>
          <p className="text-xs text-gray-400 mt-1">Independent Multi-Template Booth Manager</p>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="self-start md:self-auto px-4 py-2 bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Sidebar */}
        <div className="flex flex-col gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-red-500" /> Create New Event
            </h2>
            <form onSubmit={handleCreateEvent} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Event Name"
                value={eventName}
                onChange={(e) => {
                  setEventName(e.target.value);
                  setEventSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                }}
                className="w-full bg-black border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                required
              />
              <input
                type="text"
                placeholder="Event Slug"
                value={eventSlug}
                onChange={(e) => setEventSlug(e.target.value)}
                className="w-full bg-black border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-gray-300 font-mono"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl text-xs mt-1"
              >
                {loading ? 'Creating...' : 'Create Event'}
              </button>
            </form>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl flex-1">
            <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-red-500" /> Active Events ({events.length})
            </h2>
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className={`p-3 rounded-xl border transition flex items-center justify-between gap-2 ${
                    selectedEvent?.id === ev.id
                      ? 'bg-red-950/40 border-red-500/60 text-white'
                      : 'bg-black/40 border-gray-800/80 text-gray-400'
                  }`}
                >
                  <button onClick={() => selectEvent(ev)} className="text-left flex-1 truncate">
                    <p className="font-semibold text-xs truncate">{ev.event_name}</p>
                    <p className="font-mono text-[10px] text-gray-500">{ev.event_slug}</p>
                  </button>

                  <button
                    onClick={() => handleDeleteEvent(ev.id, ev.event_name)}
                    className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Main Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {selectedEvent ? (
            <>
              {/* Custom PNG Templates Section */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
                  <Upload className="w-4 h-4 text-red-500" /> Custom PNG Frame Overlays (
                  {(selectedEvent.custom_template_urls || []).length})
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  Add custom full-screen PNG graphics for{' '}
                  <strong className="text-white">{selectedEvent.event_name}</strong>.
                </p>

                <form
                  onSubmit={handleUploadCustomTemplate}
                  className="flex flex-col sm:flex-row gap-3 mb-6"
                >
                  <label className="flex-1 bg-black border border-dashed border-gray-800 hover:border-red-500 rounded-xl px-3.5 py-3 text-xs text-gray-400 flex items-center justify-center gap-2 cursor-pointer transition">
                    <ImageIcon className="w-4 h-4 text-red-500" />
                    <span className="truncate">
                      {templateFile ? templateFile.name : 'Upload 1200x2400 PNG Overlay'}
                    </span>
                    <input
                      type="file"
                      accept="image/png"
                      onChange={(e) => setTemplateFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={!templateFile || uploadingTemplate}
                    className="bg-red-600 hover:bg-red-500 active:scale-95 disabled:opacity-50 text-white font-bold px-5 py-3 rounded-xl text-xs shadow-lg shrink-0"
                  >
                    {uploadingTemplate ? 'Uploading...' : 'Upload PNG Frame'}
                  </button>
                </form>

                {(selectedEvent.custom_template_urls || []).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-300 mb-2">
                      Uploaded Custom Overlay Templates:
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {(selectedEvent.custom_template_urls || []).map((url, index) => (
                        <div
                          key={`${url}-${index}`}
                          onClick={() => setSelectedCustomTemplateUrl(url)}
                          className={`relative group rounded-xl overflow-hidden border aspect-[1/2] bg-black cursor-pointer transition ${
                            selectedCustomTemplateUrl === url
                              ? 'border-red-500 ring-2 ring-red-500/50'
                              : 'border-gray-800 hover:border-gray-600'
                          }`}
                        >
                          <img
                            src={url}
                            alt={`Overlay ${index + 1}`}
                            crossOrigin="anonymous"
                            className="w-full h-full object-contain p-1"
                          />
                          {selectedCustomTemplateUrl === url && (
                            <div className="absolute top-1.5 right-1.5 bg-red-600 text-white rounded-full p-1 shadow-md">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCustomTemplate(url);
                            }}
                            className="absolute bottom-1.5 right-1.5 bg-black/80 hover:bg-red-600 text-white rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition z-10"
                            title="Delete Overlay"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Clean Preview & Customize Modal Trigger */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Eye className="w-4 h-4 text-red-500" /> Live Canvas Preview
                  </h3>
                  <button
                    onClick={() => setShowCustomizeModal(true)}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition"
                  >
                    <Sliders className="w-3.5 h-3.5" /> Customize Template
                  </button>
                </div>

                {/* Template Selector Tabs */}
                <div className="grid grid-cols-5 gap-2 w-full mb-6">
                  {[
                    { id: 5, name: '4-Frame' },
                    { id: 3, name: 'Polaroid' },
                    { id: 1, name: 'Classic Dark' },
                    { id: 2, name: 'Sunset' },
                    { id: 4, name: 'Custom PNG' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTemplateId(t.id)}
                      className={`py-2 px-2 text-xs font-semibold rounded-xl border transition flex items-center justify-center gap-1.5 ${
                        activeTemplateId === t.id
                          ? 'bg-red-600 border-red-500 text-white font-bold shadow-md'
                          : 'bg-black border-gray-800 text-gray-400 hover:bg-gray-800'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      {t.name}
                    </button>
                  ))}
                </div>

                {/* Main Preview Screen */}
                <div className="relative w-full max-w-[260px] aspect-[1/2] rounded-2xl overflow-hidden border border-gray-800 bg-black flex items-center justify-center shadow-2xl">
                  <canvas
                    ref={previewCanvasRef}
                    width={1200}
                    height={2400}
                    className="w-full h-auto rounded-xl"
                  />
                </div>
              </div>

              {/* Floating Customization Modal */}
              {showCustomizeModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                  <div className="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                      <div className="flex items-center gap-2">
                        <Palette className="w-5 h-5 text-red-500" />
                        <h2 className="text-lg font-bold text-white">
                          Customize Template {activeTemplateId}
                        </h2>
                      </div>
                      <button
                        onClick={() => setShowCustomizeModal(false)}
                        className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-xl transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                      <form
                        onSubmit={handleSaveAllTemplateConfigs}
                        className="flex flex-col gap-3.5"
                      >
                        <div>
                          <label className="text-xs text-gray-400 font-medium mb-1 block">
                            Title Text
                          </label>
                          <input
                            type="text"
                            value={currentConfig.title}
                            onChange={(e) => updateActiveConfig('title', e.target.value)}
                            className="w-full bg-black border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-xs text-gray-400 font-medium mb-1 block">
                            Subheading Text
                          </label>
                          <input
                            type="text"
                            value={currentConfig.subtitle}
                            onChange={(e) => updateActiveConfig('subtitle', e.target.value)}
                            className="w-full bg-black border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-400 font-medium mb-1 block">
                              Background Gradient
                            </label>
                            <select
                              value={currentConfig.gradient}
                              onChange={(e) => updateActiveConfig('gradient', e.target.value)}
                              className="w-full bg-black border border-gray-800 rounded-xl px-2.5 py-2 text-xs text-white"
                            >
                              <option value="dark">Dark Mesh</option>
                              <option value="sunset">Sunset Glow</option>
                              <option value="pastel">Pastel Soft</option>
                              <option value="neon">Neon Magenta</option>
                              <option value="monochrome">Monochrome</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-xs text-gray-400 font-medium mb-1 block flex items-center gap-1">
                              <Smile className="w-3.5 h-3.5 text-red-500" /> Emoticons / Badges
                            </label>
                            <select
                              value={currentConfig.sticker}
                              onChange={(e) => updateActiveConfig('sticker', e.target.value)}
                              className="w-full bg-black border border-gray-800 rounded-xl px-2.5 py-2 text-xs text-white"
                            >
                              <option value="none">None</option>
                              <option value="stars">✨ Magic Stars</option>
                              <option value="hearts">💖 Lovely Hearts</option>
                              <option value="sparkles">⚡ Party Sparkles</option>
                              <option value="vintage-badge">● Official Badge</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-400 font-medium mb-1 block">
                              Font Style
                            </label>
                            <select
                              value={currentConfig.font}
                              onChange={(e) => updateActiveConfig('font', e.target.value)}
                              className="w-full bg-black border border-gray-800 rounded-xl px-2.5 py-2 text-xs text-white"
                            >
                              <option value="serif">Serif (Georgia)</option>
                              <option value="sans-serif">Sans-Serif (Inter)</option>
                              <option value="monospace">Monospace</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-xs text-gray-400 font-medium mb-1 block flex items-center gap-1">
                              <Type className="w-3.5 h-3.5 text-red-500" /> Font Size
                            </label>
                            <select
                              value={currentConfig.fontSize || 'normal'}
                              onChange={(e) => updateActiveConfig('fontSize', e.target.value)}
                              className="w-full bg-black border border-gray-800 rounded-xl px-2.5 py-2 text-xs text-white"
                            >
                              <option value="small">Compact</option>
                              <option value="normal">Normal</option>
                              <option value="large">Large</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-gray-400 font-medium mb-1 block">
                            Text Color
                          </label>
                          <input
                            type="color"
                            value={currentConfig.color}
                            onChange={(e) => updateActiveConfig('color', e.target.value)}
                            className="w-full h-8 rounded-lg bg-black border border-gray-800 cursor-pointer"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={savingText}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-lg mt-2"
                        >
                          <Save className="w-4 h-4" />
                          {savingText
                            ? 'Saving...'
                            : `Save Customization for Template ${activeTemplateId}`}
                        </button>
                      </form>

                      {/* Modal Live Preview Canvas */}
                      <div className="flex flex-col items-center gap-2 bg-black p-3 rounded-2xl border border-gray-800 shadow-inner">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 mb-1">
                          <Eye className="w-3.5 h-3.5 text-red-500" />
                          <span>Real-time Preview</span>
                        </div>

                        <div className="w-full max-w-[200px] aspect-[1/2] rounded-xl overflow-hidden border border-gray-800 bg-gray-950 flex items-center justify-center">
                          <canvas
                            ref={modalCanvasRef}
                            width={1200}
                            height={2400}
                            className="w-full h-auto rounded-lg shadow-2xl"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* QR Code */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center gap-6">
                {qrCodeDataUrl && (
                  <div className="bg-white p-3 rounded-2xl shadow-xl shrink-0">
                    <img src={qrCodeDataUrl} alt="QR Code" className="w-36 h-36 object-contain" />
                  </div>
                )}
                <div className="flex-1 flex flex-col items-start gap-2">
                  <h2 className="text-lg font-bold text-white">{selectedEvent.event_name}</h2>
                  <p className="text-[11px] text-gray-400 font-mono bg-black/60 px-3 py-2 rounded-xl border border-gray-800 w-full break-all">
                    {window.location.origin}/booth?event={selectedEvent.event_slug}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <a
                      href={qrCodeDataUrl || '#'}
                      download={`${selectedEvent.event_slug}-qr.png`}
                      className="bg-white hover:bg-gray-200 text-black font-bold py-2 px-3 rounded-xl text-xs flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Download QR
                    </a>
                    <a
                      href={`/booth?event=${selectedEvent.event_slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Launch Active Booth
                    </a>
                  </div>
                </div>
              </div>

              {/* Captured Photos Gallery */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-red-500" /> Captured Photos (
                    {eventPhotos.length})
                  </h3>
                  <button
                    onClick={() => selectedEvent && fetchPhotosForEvent(selectedEvent.event_slug)}
                    disabled={loadingPhotos}
                    className="p-1.5 bg-black border border-gray-800 hover:border-gray-700 text-gray-400 rounded-lg text-xs flex items-center gap-1"
                    title="Refresh Gallery"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingPhotos ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {loadingPhotos ? (
                  <div className="p-8 text-center text-gray-500 text-xs">Loading gallery...</div>
                ) : eventPhotos.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 border border-dashed border-gray-800 rounded-xl">
                    <p className="text-xs">No photos captured for this event yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {eventPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="group relative bg-black rounded-xl overflow-hidden border border-gray-800 aspect-[1/2] shadow-md"
                      >
                        <img
                          src={photo.public_url}
                          alt="Photobooth Strip"
                          crossOrigin="anonymous"
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center p-2">
                          <a
                            href={photo.public_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 bg-white text-black rounded-full shadow-lg hover:scale-110 transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center text-gray-500 text-xs">
              Select or create an event from the left sidebar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
