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
  Type,
  Palette,
  Save,
  Trash2,
  Eye,
  Check,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  renderTemplate1,
  renderTemplate2,
  renderTemplate3,
  renderCustomPNGTemplate,
} from '../utils/templates';

interface ExtendedEventSession {
  id: string;
  event_name: string;
  event_slug: string;
  custom_template_urls?: string[];
  title_text?: string;
  subtitle_text?: string;
  text_color?: string;
  font_style?: string;
}

export default function AdminDashboard() {
  const [events, setEvents] = useState<ExtendedEventSession[]>([]);
  const [eventName, setEventName] = useState('');
  const [eventSlug, setEventSlug] = useState('');

  const [selectedEvent, setSelectedEvent] = useState<ExtendedEventSession | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [eventPhotos, setEventPhotos] = useState<any[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [loading, setLoading] = useState(false);

  // Editable Template Text & Style States
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editColor, setEditColor] = useState('#2C3E50');
  const [editFont, setEditFont] = useState('serif');
  const [previewTemplateId, setPreviewTemplateId] = useState<number>(3);
  const [savingText, setSavingText] = useState(false);

  // Dedicated Multiple Templates State
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [selectedCustomTemplateUrl, setSelectedCustomTemplateUrl] = useState<string | null>(null);
  const [loadedCustomOverlay, setLoadedCustomOverlay] = useState<HTMLImageElement | null>(null);

  // Live Canvas Preview Reference & Dummy Images
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [dummyImages, setDummyImages] = useState<HTMLImageElement[]>([]);

  // Generate 6 dummy images for preview
  useEffect(() => {
    const imgs: HTMLImageElement[] = [];
    const colors = ['#2C3E50', '#8E44AD', '#2980B9', '#16A085', '#D35400', '#C0392B'];

    colors.forEach((color) => {
      const c = document.createElement('canvas');
      c.width = 600;
      c.height = 800;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 600, 800);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Sample Shot', 300, 400);
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
        setPreviewTemplateId(4);
      };
      img.onerror = () => setLoadedCustomOverlay(null);
    } else {
      setLoadedCustomOverlay(null);
      if (previewTemplateId === 4) setPreviewTemplateId(3);
    }
  }, [selectedCustomTemplateUrl]);

  // Direct database fetch for photos matching the active event slug
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

    if (error) {
      console.error('Error fetching event photos:', error);
      setEventPhotos([]);
    } else if (data) {
      setEventPhotos(data);
    }
    setLoadingPhotos(false);
  }, []);

  // Fetch initial events
  useEffect(() => {
    fetchEvents();
  }, []);

  // Auto-fetch photos and attach real-time channel when active event changes
  useEffect(() => {
    if (selectedEvent?.event_slug) {
      fetchPhotosForEvent(selectedEvent.event_slug);

      const channel = supabase
        .channel(`realtime_photos_${selectedEvent.event_slug}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'event_photos',
          },
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

  const renderLivePreview = useCallback(() => {
    if (!previewCanvasRef.current || dummyImages.length < 6) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const opts = {
      ctx,
      images: dummyImages,
      width: 1200,
      height: 1800,
      eventName: editTitle || 'Event Title',
      subtitleText: editSubtitle || 'Subtitle text...',
      textColor: editColor,
      fontStyle: editFont,
      customOverlayImg: loadedCustomOverlay,
    };

    if (previewTemplateId === 1) renderTemplate1(opts);
    if (previewTemplateId === 2) renderTemplate2(opts);
    if (previewTemplateId === 3) renderTemplate3(opts);
    if (previewTemplateId === 4) renderCustomPNGTemplate(opts);
  }, [
    dummyImages,
    editTitle,
    editSubtitle,
    editColor,
    editFont,
    previewTemplateId,
    loadedCustomOverlay,
  ]);

  useEffect(() => {
    renderLivePreview();
  }, [renderLivePreview]);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setEvents(data);
      if (data.length > 0 && !selectedEvent) {
        selectEvent(data[0]);
      }
    }
  };

  const selectEvent = async (eventItem: ExtendedEventSession) => {
    setSelectedEvent(eventItem);
    setEditTitle(eventItem.title_text || eventItem.event_name);
    setEditSubtitle(eventItem.subtitle_text || 'Official Event Memory');
    setEditColor(eventItem.text_color || '#2C3E50');
    setEditFont(eventItem.font_style || 'serif');

    const templatesList = eventItem.custom_template_urls || [];
    if (templatesList.length > 0) {
      setSelectedCustomTemplateUrl(templatesList[0]);
    } else {
      setSelectedCustomTemplateUrl(null);
    }

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

  const handleUpdateTemplateText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    setSavingText(true);

    const { error } = await supabase
      .from('events')
      .update({
        title_text: editTitle,
        subtitle_text: editSubtitle,
        text_color: editColor,
        font_style: editFont,
      })
      .eq('id', selectedEvent.id);

    if (error) {
      alert(`Failed to update template text: ${error.message}`);
    } else {
      alert('Template text and style settings saved!');
      fetchEvents();
    }
    setSavingText(false);
  };

  const handleDeleteEvent = async (eventId: string, eventNameStr: string) => {
    if (!window.confirm(`Delete "${eventNameStr}" and all its photos?`)) return;

    const { error } = await supabase.from('events').delete().eq('id', eventId);

    if (error) {
      alert(`Failed to delete event: ${error.message}`);
    } else {
      const remaining = events.filter((ev) => ev.id !== eventId);
      setEvents(remaining);
      if (remaining.length > 0) selectEvent(remaining[0]);
      else setSelectedEvent(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8 max-w-7xl mx-auto antialiased">
      <header className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-800 mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-red-500 tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-7 h-7" /> PIMA ALBAY ADMIN
          </h1>
          <p className="text-xs text-gray-400 mt-1">Multi-Template Booth Manager</p>
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
              {/* Custom Templates Gallery */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
                  <Upload className="w-4 h-4 text-red-500" /> Custom PNG Frame Templates (
                  {(selectedEvent.custom_template_urls || []).length})
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  Add and manage frame overlays for{' '}
                  <strong className="text-white">{selectedEvent.event_name}</strong>.
                </p>

                <form
                  onSubmit={handleUploadCustomTemplate}
                  className="flex flex-col sm:flex-row gap-3 mb-6"
                >
                  <label className="flex-1 bg-black border border-dashed border-gray-800 hover:border-red-500 rounded-xl px-3.5 py-3 text-xs text-gray-400 flex items-center justify-center gap-2 cursor-pointer transition">
                    <ImageIcon className="w-4 h-4 text-red-500" />
                    <span className="truncate">
                      {templateFile ? templateFile.name : 'Add New 1200x1800 PNG Frame'}
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
                    {uploadingTemplate ? 'Uploading...' : 'Upload Template'}
                  </button>
                </form>

                {(selectedEvent.custom_template_urls || []).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-300 mb-2">
                      Available Custom Templates (Select to Preview):
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {(selectedEvent.custom_template_urls || []).map((url, index) => (
                        <div
                          key={`${url}-${index}`}
                          onClick={() => setSelectedCustomTemplateUrl(url)}
                          className={`relative group rounded-xl overflow-hidden border aspect-[2/3] bg-black cursor-pointer transition ${
                            selectedCustomTemplateUrl === url
                              ? 'border-red-500 ring-2 ring-red-500/50'
                              : 'border-gray-800 hover:border-gray-600'
                          }`}
                        >
                          <img
                            src={url}
                            alt={`Template ${index + 1}`}
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
                            title="Delete Template"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Text Editor & Live Preview */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                  <Type className="w-4 h-4 text-red-500" /> Dynamic Template Text Editor & Live
                  Preview
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <form onSubmit={handleUpdateTemplateText} className="flex flex-col gap-3.5">
                    <div>
                      <label className="text-xs text-gray-400 font-medium mb-1 block">
                        Title Text
                      </label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full bg-black border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 font-medium mb-1 block">
                        Subtitle / Hashtag
                      </label>
                      <input
                        type="text"
                        value={editSubtitle}
                        onChange={(e) => setEditSubtitle(e.target.value)}
                        className="w-full bg-black border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 font-medium mb-1 block flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5" /> Text Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                          className="w-9 h-9 rounded-lg bg-black border border-gray-800 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                          className="flex-1 bg-black border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 font-medium mb-1 block">
                        Font Style
                      </label>
                      <select
                        value={editFont}
                        onChange={(e) => setEditFont(e.target.value)}
                        className="w-full bg-black border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                      >
                        <option value="serif">Classic Serif (Georgia)</option>
                        <option value="sans-serif">Modern Sans (Inter / Arial)</option>
                        <option value="monospace">Monospace (Courier / Mono)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 font-medium mb-1 block">
                        Preview Mode
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: 3, name: 'Polaroid' },
                          { id: 1, name: 'Classic Dark' },
                          { id: 2, name: 'Sunset' },
                          ...(selectedCustomTemplateUrl ? [{ id: 4, name: 'Selected PNG' }] : []),
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setPreviewTemplateId(t.id)}
                            className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border transition ${
                              previewTemplateId === t.id
                                ? 'bg-red-600 border-red-500 text-white font-bold'
                                : 'bg-black border-gray-800 text-gray-400'
                            }`}
                          >
                            {t.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={savingText}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-lg mt-2"
                    >
                      <Save className="w-4 h-4" />
                      {savingText ? 'Saving...' : 'Save Template Text Changes'}
                    </button>
                  </form>

                  <div className="flex flex-col items-center gap-2 bg-black p-3 rounded-2xl border border-gray-800 shadow-inner">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 mb-1">
                      <Eye className="w-3.5 h-3.5 text-red-500" />
                      <span>Live Template Text Preview</span>
                    </div>

                    <div className="w-full max-w-[260px] aspect-[2/3] rounded-xl overflow-hidden border border-gray-800 bg-gray-950 flex items-center justify-center">
                      <canvas
                        ref={previewCanvasRef}
                        width={1200}
                        height={1800}
                        className="w-full h-auto rounded-lg shadow-2xl"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center gap-6">
                {qrCodeDataUrl && (
                  <div className="bg-white p-3 rounded-2xl shadow-xl shrink-0">
                    <img src={qrCodeDataUrl} alt="QR Code" className="w-40 h-40 object-contain" />
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
                      className="bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold py-2 px-3 rounded-xl text-xs flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Launch Booth
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
                  <div className="p-8 text-center text-gray-500 text-xs">Loading photos...</div>
                ) : eventPhotos.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 border border-dashed border-gray-800 rounded-xl">
                    <p className="text-xs">No photos captured for this event yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {eventPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="group relative bg-black rounded-xl overflow-hidden border border-gray-800 aspect-[2/3] shadow-md"
                      >
                        <img
                          src={photo.public_url}
                          alt="Photobooth Strip"
                          crossOrigin="anonymous"
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://via.placeholder.com/600x900/121212/ffffff?text=Image+Load+Error';
                          }}
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
