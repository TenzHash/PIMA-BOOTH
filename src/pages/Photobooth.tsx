import { useRef, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Camera,
  Sparkles,
  Check,
  Download,
  Share2,
  AlertCircle,
  ChevronDown,
  Layers,
  RotateCcw,
  Timer,
  Play,
  Settings,
  Eye,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '../lib/supabase';
import {
  renderTemplate1,
  renderTemplate2,
  renderTemplate3,
  renderTemplate5,
  renderCustomPNGTemplate,
} from '../utils/templates';

interface CameraDevice {
  deviceId: string;
  label: string;
}

interface TemplateConfig {
  title: string;
  subtitle: string;
  color: string;
  font: string;
  gradient: string;
  sticker: string;
}

const defaultConfigMap: Record<string, TemplateConfig> = {
  '1': {
    title: 'PIMA ALBAY',
    subtitle: 'WELCOME PARTY 2026',
    color: '#FFFFFF',
    font: 'sans-serif',
    gradient: 'dark',
    sticker: 'none',
  },
  '2': {
    title: 'PIMA ALBAY',
    subtitle: 'WELCOME PARTY 2026',
    color: '#1E293B',
    font: 'serif',
    gradient: 'sunset',
    sticker: 'none',
  },
  '3': {
    title: 'PIMA ALBAY',
    subtitle: 'WELCOME PARTY 2026',
    color: '#1E293B',
    font: 'serif',
    gradient: 'pastel',
    sticker: 'none',
  },
  '5': {
    title: 'PIMA',
    subtitle: 'WELCOME PARTY 2026',
    color: '#000000',
    font: 'sans-serif',
    gradient: 'monochrome',
    sticker: 'none',
  },
};

export default function Photobooth() {
  const [searchParams] = useSearchParams();

  const rawParam = searchParams.get('event') || 'pima-albay';
  const decodedSlug = decodeURIComponent(rawParam);
  const eventSlug = decodedSlug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modalCanvasRef = useRef<HTMLCanvasElement>(null);

  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [showSetupModal, setShowSetupModal] = useState<boolean>(true);
  const [useTimer, setUseTimer] = useState<boolean>(true);
  const [timerDuration, setTimerDuration] = useState<number>(3);
  const [selectedTemplate, setSelectedTemplate] = useState<number>(5);

  const [photos, setPhotos] = useState<HTMLImageElement[]>([]);
  const [isCapturingSeries, setIsCapturingSeries] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flashEffect, setFlashEffect] = useState(false);

  const [templateConfigs, setTemplateConfigs] =
    useState<Record<string, TemplateConfig>>(defaultConfigMap);
  const [, setCustomTemplateUrls] = useState<string[]>([]);
  const [activeCustomOverlayImg, setActiveCustomOverlayImg] = useState<HTMLImageElement | null>(
    null
  );
  const [dummyImages, setDummyImages] = useState<HTMLImageElement[]>([]);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const isFrontCamera = useCallback(() => {
    if (!selectedDeviceId) return true;
    const activeDevice = availableCameras.find((c) => c.deviceId === selectedDeviceId);
    if (!activeDevice) return true;
    const label = activeDevice.label.toLowerCase();
    return !label.includes('back') && !label.includes('environment') && !label.includes('rear');
  }, [selectedDeviceId, availableCameras]);

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
        ctx.fillText(`Preview Shot ${i + 1}`, 600, 400);
      }
      const img = new Image();
      img.src = c.toDataURL();
      imgs.push(img);
    });

    setDummyImages(imgs);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchEventData = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('template_configs, custom_template_urls, event_name')
        .eq('event_slug', eventSlug)
        .maybeSingle();

      if (error) {
        console.error('Error fetching event config from Supabase:', error);
        return;
      }

      if (isMounted && data) {
        if (data.template_configs && typeof data.template_configs === 'object') {
          setTemplateConfigs((prev) => ({ ...prev, ...data.template_configs }));
        }

        const urls: string[] = data.custom_template_urls || [];
        setCustomTemplateUrls(urls);

        if (urls.length > 0) {
          loadCustomOverlay(urls[0]);
        }
      }
    };
    fetchEventData();

    return () => {
      isMounted = false;
    };
  }, [eventSlug]);

  const loadCustomOverlay = (url: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => {
      setActiveCustomOverlayImg(img);
      setSelectedTemplate(4);
    };
  };

  useEffect(() => {
    if (!showSetupModal || !modalCanvasRef.current || dummyImages.length < 4) return;
    const canvas = modalCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentConfig =
      templateConfigs[String(selectedTemplate)] ||
      defaultConfigMap[String(selectedTemplate)] ||
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
      gradientTheme: currentConfig.gradient,
      stickerStyle: currentConfig.sticker,
      customOverlayImg: activeCustomOverlayImg,
    };

    if (selectedTemplate === 5) renderTemplate5(opts);
    if (selectedTemplate === 1) renderTemplate1(opts);
    if (selectedTemplate === 2) renderTemplate2(opts);
    if (selectedTemplate === 3) renderTemplate3(opts);
    if (selectedTemplate === 4) renderCustomPNGTemplate(opts);
  }, [showSetupModal, selectedTemplate, dummyImages, templateConfigs, activeCustomOverlayImg]);

  const fetchAvailableCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter((device) => device.kind === 'videoinput')
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${index + 1}`,
        }));

      setAvailableCameras(videoDevices);
      if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error('Failed to enumerate media devices:', err);
    }
  }, [selectedDeviceId]);

  const startCamera = useCallback(async () => {
    setCameraError(null);

    if (videoRef.current && videoRef.current.srcObject) {
      const activeStream = videoRef.current.srcObject as MediaStream;
      activeStream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    const videoConstraints: MediaTrackConstraints = selectedDeviceId
      ? { deviceId: { exact: selectedDeviceId } }
      : { facingMode: 'user' };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      await fetchAvailableCameras();
    } catch (err: any) {
      setCameraError('Failed to initialize selected camera lens.');
    }
  }, [selectedDeviceId, fetchAvailableCameras]);

  const requiredPhotoCount = selectedTemplate === 5 ? 4 : 6;
  const isCameraActive = photos.length < requiredPhotoCount;

  useEffect(() => {
    if (isCameraActive) {
      startCamera();
    }

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isCameraActive, startCamera]);

  // Completely isolated frame capture: Template 5 uses 3:2 top-aligned crop; 6-shot templates use original full camera aspect ratio
  const takeSingleFrame = (): HTMLImageElement | null => {
    if (!videoRef.current) return null;
    const video = videoRef.current;

    const videoWidth = video.videoWidth || 1280;
    const videoHeight = video.videoHeight || 720;

    const targetWidth = 1200;
    // Template 5 (4 shots) forces 3:2 ratio; 6-shot templates preserve native camera aspect ratio
    const targetHeight =
      selectedTemplate === 5 ? 800 : Math.round((1200 * videoHeight) / videoWidth);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = targetWidth;
    tempCanvas.height = targetHeight;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return null;

    let sourceX = 0,
      sourceY = 0,
      sourceWidth = videoWidth,
      sourceHeight = videoHeight;

    if (selectedTemplate === 5) {
      const targetAspect = targetWidth / targetHeight;
      const videoAspect = videoWidth / videoHeight;
      if (videoAspect > targetAspect) {
        sourceWidth = videoHeight * targetAspect;
        sourceX = (videoWidth - sourceWidth) / 2;
      } else {
        sourceHeight = videoWidth / targetAspect;
        sourceY = 0; // Top-align for template 5
      }
    }

    if (isFrontCamera()) {
      ctx.translate(targetWidth, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(
      video,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      targetWidth,
      targetHeight
    );

    const img = new Image();
    img.src = tempCanvas.toDataURL('image/jpeg', 0.95);
    return img;
  };

  const snapSingleManualFrame = () => {
    if (photos.length >= requiredPhotoCount) return;

    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 150);

    const frameImg = takeSingleFrame();
    if (frameImg) {
      setPhotos((prev) => [...prev, frameImg]);
    }
  };

  const startBurstCapture = async () => {
    setShowSetupModal(false);

    if (!useTimer) {
      return;
    }

    if (isCapturingSeries) return;
    setPhotos([]);
    setIsCapturingSeries(true);
    setUploadedUrl(null);

    const captured: HTMLImageElement[] = [];

    for (let i = 1; i <= requiredPhotoCount; i++) {
      for (let cd = timerDuration; cd > 0; cd--) {
        setCountdown(cd);
        await new Promise((res) => setTimeout(res, 1000));
      }
      setCountdown(null);

      setFlashEffect(true);
      setTimeout(() => setFlashEffect(false), 150);

      const frameImg = takeSingleFrame();
      if (frameImg) {
        captured.push(frameImg);
        setPhotos([...captured]);
      }

      await new Promise((res) => setTimeout(res, 600));
    }

    setIsCapturingSeries(false);
  };

  useEffect(() => {
    const targetCount = selectedTemplate === 5 ? 4 : 6;
    if (photos.length < targetCount || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isMounted = true;

    const loadAllImages = async () => {
      const imagePromises = photos.slice(0, targetCount).map((photoObj) => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = (err) => reject(err);
          img.src = typeof photoObj === 'string' ? photoObj : photoObj.src;
        });
      });

      try {
        const loadedImages = await Promise.all(imagePromises);
        if (!isMounted) return;

        const currentConfig =
          templateConfigs[String(selectedTemplate)] ||
          defaultConfigMap[String(selectedTemplate)] ||
          defaultConfigMap['5'];

        const opts = {
          ctx,
          images: loadedImages,
          width: 1200,
          height: 2400,
          eventName: currentConfig.title,
          subtitleText: currentConfig.subtitle,
          textColor: currentConfig.color,
          fontStyle: currentConfig.font,
          gradientTheme: currentConfig.gradient,
          stickerStyle: currentConfig.sticker,
          customOverlayImg: activeCustomOverlayImg,
        };

        if (selectedTemplate === 5) renderTemplate5(opts);
        if (selectedTemplate === 1) renderTemplate1(opts);
        if (selectedTemplate === 2) renderTemplate2(opts);
        if (selectedTemplate === 3) renderTemplate3(opts);
        if (selectedTemplate === 4) renderCustomPNGTemplate(opts);
      } catch (err) {
        console.error('Error loading photobooth frame images:', err);
      }
    };

    loadAllImages();

    return () => {
      isMounted = false;
    };
  }, [photos, selectedTemplate, templateConfigs, activeCustomOverlayImg]);

  const handleSaveAndUpload = async () => {
    if (!canvasRef.current || photos.length < requiredPhotoCount) return;
    setIsUploading(true);

    const cleanSlug = eventSlug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');

    const { data: eventExists } = await supabase
      .from('events')
      .select('event_slug')
      .eq('event_slug', cleanSlug)
      .maybeSingle();

    if (!eventExists) {
      const defaultName = cleanSlug
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      await supabase.from('events').upsert(
        [
          {
            event_name: defaultName,
            event_slug: cleanSlug,
            title_text: defaultName,
            subtitle_text: 'Official Event Memory',
            text_color: '#2C3E50',
            font_style: 'serif',
            template_configs: defaultConfigMap,
            custom_template_urls: [],
          },
        ],
        { onConflict: 'event_slug' }
      );
    }

    canvasRef.current.toBlob(
      async (blob) => {
        if (!blob) {
          setIsUploading(false);
          return;
        }

        const filePath = `${cleanSlug}/${Date.now()}_photobooth.jpg`;

        const { error: uploadErr } = await supabase.storage
          .from('event-photos')
          .upload(filePath, blob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadErr) {
          alert(`Upload failed: ${uploadErr.message}`);
          setIsUploading(false);
          return;
        }

        const { data: publicData } = supabase.storage.from('event-photos').getPublicUrl(filePath);
        const publicUrl = publicData.publicUrl;

        await supabase.from('event_photos').insert([
          {
            event_slug: cleanSlug,
            storage_path: filePath,
            public_url: publicUrl,
            template_used: selectedTemplate,
          },
        ]);

        setUploadedUrl(publicUrl);
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
        setIsUploading(false);
      },
      'image/jpeg',
      0.85
    );
  };

  const activeHeaderConfig = templateConfigs[String(selectedTemplate)] || defaultConfigMap['5'];

  return (
    <div className="min-h-[100dvh] bg-gray-950 text-white flex flex-col justify-between p-4 pt-safe pb-safe max-w-md mx-auto touch-none select-none">
      <header className="w-full flex items-center justify-between py-2.5 px-4 bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-gray-800 shadow-xl mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <h1 className="font-bold text-xs uppercase tracking-wider text-white truncate max-w-[140px]">
            {activeHeaderConfig.title}
          </h1>
        </div>

        {availableCameras.length > 0 && photos.length < requiredPhotoCount && (
          <div className="relative">
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              disabled={isCapturingSeries}
              className="bg-gray-800 border border-gray-700 text-gray-200 text-[11px] rounded-xl py-1 pl-2.5 pr-6 appearance-none font-medium focus:outline-none focus:border-red-500 max-w-[110px] truncate"
            >
              {availableCameras.map((cam) => (
                <option key={cam.deviceId} value={cam.deviceId}>
                  {cam.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}
      </header>

      {/* Pre-Shot Setup Overlay Modal */}
      {showSetupModal && photos.length === 0 && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="text-center">
              <h2 className="text-base font-black text-white flex items-center justify-center gap-2">
                <Settings className="w-4 h-4 text-red-500" /> Photobooth Setup
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Customize your session and preview layout
              </p>
            </div>

            <div className="flex flex-col items-center gap-1.5 bg-black/60 p-3 rounded-2xl border border-gray-800">
              <div className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                <Eye className="w-3 h-3 text-red-500" /> Frame Preview
              </div>
              <div className="relative w-full max-w-[180px] aspect-[1/2] rounded-xl overflow-hidden border border-gray-800 bg-gray-950 flex items-center justify-center shadow-lg">
                <canvas
                  ref={modalCanvasRef}
                  width={1200}
                  height={2400}
                  className="w-full h-auto rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-gray-300 flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-red-500" /> Select Layout
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 5, name: 'LookUp (4 Shots)' },
                  { id: 3, name: 'Polaroid (6 Shots)' },
                  { id: 1, name: 'Dark Mesh (6 Shots)' },
                  { id: 2, name: 'Sunset (6 Shots)' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                    className={`p-2 rounded-xl border text-left transition ${
                      selectedTemplate === t.id
                        ? 'bg-red-950/60 border-red-500 text-white font-bold'
                        : 'bg-black/50 border-gray-800 text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    <p className="text-[11px] font-semibold">{t.name}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 bg-black/40 border border-gray-800 p-3 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-200 flex items-center gap-1.5">
                  <Timer className="w-3 h-3 text-red-500" /> Countdown Timer
                </span>
                <button
                  type="button"
                  onClick={() => setUseTimer(!useTimer)}
                  className={`w-9 h-5 rounded-full transition-colors p-0.5 ${
                    useTimer ? 'bg-red-600' : 'bg-gray-800'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      useTimer ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {useTimer && (
                <div className="flex gap-1.5 pt-1.5 border-t border-gray-800/80">
                  {[2, 3, 5].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => setTimerDuration(sec)}
                      className={`flex-1 py-1 rounded-lg text-[11px] font-bold border transition ${
                        timerDuration === sec
                          ? 'bg-red-600 border-red-500 text-white'
                          : 'bg-gray-900 border-gray-800 text-gray-400'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={startBurstCapture}
              className="w-full py-3.5 bg-gradient-to-r from-red-600 to-red-700 active:scale-95 font-bold text-xs rounded-xl shadow-xl flex items-center justify-center gap-2 text-white border border-red-500/30"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Start Photo Session
            </button>
          </div>
        </div>
      )}

      {photos.length < requiredPhotoCount ? (
        <main className="w-full flex-1 flex flex-col justify-center items-center gap-4 my-auto">
          {/* Viewfinder dynamically adjusts aspect ratio: 3:2 for Template 5, full native camera container for 6-shot templates */}
          <div
            className={`relative w-full ${
              selectedTemplate === 5 ? 'aspect-[3/2]' : 'aspect-[4/3]'
            } max-w-[340px] bg-black rounded-3xl overflow-hidden border-2 border-red-500/80 shadow-2xl flex items-center justify-center`}
          >
            {cameraError ? (
              <div className="p-6 text-center text-red-400 flex flex-col items-center gap-2.5">
                <AlertCircle className="w-10 h-10 text-red-500" />
                <p className="text-xs font-medium leading-relaxed">{cameraError}</p>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${selectedTemplate === 5 ? 'object-top' : 'object-center'} ${
                    isFrontCamera() ? '-scale-x-100' : ''
                  }`}
                />

                <div className="absolute inset-2 pointer-events-none border border-dashed border-white/30 rounded-2xl">
                  <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-red-500" />
                  <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-red-500" />
                  <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-red-500" />
                  <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-red-500" />
                </div>
              </>
            )}

            <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold border border-white/10 text-white shadow-lg z-10">
              {photos.length} / {requiredPhotoCount} Shots
            </div>

            {countdown !== null && (
              <div className="absolute top-3 left-3 bg-red-600/90 text-white backdrop-blur-md px-3 py-1 rounded-full text-xs font-black border border-red-400/40 shadow-xl flex items-center gap-1.5 animate-pulse z-10">
                <Timer className="w-3.5 h-3.5" />
                <span>SNAP IN {countdown}...</span>
              </div>
            )}

            {flashEffect && (
              <div className="absolute inset-0 bg-white opacity-90 transition-opacity duration-150 z-20" />
            )}
          </div>

          <div className="w-full max-w-[340px] flex gap-2">
            <button
              onClick={() => setShowSetupModal(true)}
              disabled={isCapturingSeries}
              className="p-4 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-2xl text-gray-300"
              title="Options"
            >
              <Settings className="w-5 h-5" />
            </button>

            {useTimer ? (
              <button
                onClick={startBurstCapture}
                disabled={isCapturingSeries || !!cameraError}
                className="flex-1 py-4 bg-gradient-to-r from-red-600 to-red-700 active:scale-95 disabled:opacity-50 font-bold text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2 text-white border border-red-500/30 transition-transform"
              >
                <Camera className="w-5 h-5" />
                {isCapturingSeries
                  ? `Taking Shot ${photos.length + 1}...`
                  : `Auto-Snap ${requiredPhotoCount} Shots`}
              </button>
            ) : (
              <button
                onClick={snapSingleManualFrame}
                disabled={!!cameraError || photos.length >= requiredPhotoCount}
                className="flex-1 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 active:scale-95 disabled:opacity-50 font-bold text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2 text-white border border-emerald-500/30 transition-transform"
              >
                <Camera className="w-5 h-5" />
                Snap Photo ({photos.length + 1} of {requiredPhotoCount})
              </button>
            )}
          </div>
        </main>
      ) : (
        <main className="w-full flex-1 flex flex-col items-center gap-3 overflow-hidden my-auto">
          <div className="text-center">
            <h2 className="text-base font-bold flex items-center justify-center gap-1.5 text-green-400">
              <Sparkles className="w-4 h-4" /> Photos Ready!
            </h2>
            <p className="text-[11px] text-gray-400">Select frame layout</p>
          </div>

          <div className="grid grid-cols-4 gap-1.5 w-full">
            {[
              { id: 5, name: 'LookUp' },
              { id: 3, name: 'Polaroid' },
              { id: 1, name: 'Mesh' },
              { id: 2, name: 'Sunset' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTemplate(t.id)}
                className={`py-2 px-1 text-[11px] font-semibold rounded-xl border transition flex items-center justify-center gap-1 active:scale-95 ${
                  selectedTemplate === t.id
                    ? 'bg-red-600 border-red-500 text-white shadow-md font-bold'
                    : 'bg-gray-900 border-gray-800 text-gray-400'
                }`}
              >
                <Layers className="w-3 h-3" />
                {t.name}
              </button>
            ))}
          </div>

          <div className="w-full max-h-[44vh] overflow-y-auto no-scrollbar rounded-2xl border border-gray-800 bg-black p-2 shadow-2xl">
            <canvas
              ref={canvasRef}
              width={1200}
              height={2400}
              className="w-full h-auto rounded-xl"
            />
          </div>

          <div className="w-full flex flex-col gap-2 pt-1 shrink-0">
            {!uploadedUrl ? (
              <button
                onClick={handleSaveAndUpload}
                disabled={isUploading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-50 font-bold rounded-xl flex items-center justify-center gap-2 text-white shadow-lg text-xs"
              >
                {isUploading ? (
                  <span>Saving Photo Strip...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Save Photo Strip
                  </>
                )}
              </button>
            ) : (
              <div className="flex flex-col gap-1.5 w-full">
                <a
                  href={uploadedUrl}
                  target="_blank"
                  rel="noreferrer"
                  download="pima-albay-photobooth.jpg"
                  className="w-full py-3.5 bg-emerald-600 active:scale-95 text-center font-bold rounded-xl flex items-center justify-center gap-2 text-white shadow-lg text-xs"
                >
                  <Download className="w-4 h-4" /> Download HD Strip
                </a>
                <button
                  onClick={() => navigator.clipboard.writeText(uploadedUrl)}
                  className="w-full py-2 bg-gray-900 active:scale-95 text-[11px] text-gray-300 font-medium rounded-lg flex items-center justify-center gap-1.5 border border-gray-800"
                >
                  <Share2 className="w-3 h-3" /> Copy Direct Link
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setPhotos([]);
                setUploadedUrl(null);
                setShowSetupModal(true);
              }}
              disabled={isUploading}
              className="w-full py-2.5 bg-gray-900/60 text-gray-400 font-semibold text-[11px] rounded-xl border border-gray-800/80 active:scale-95 flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" /> Retake Photos
            </button>
          </div>
        </main>
      )}
    </div>
  );
}
