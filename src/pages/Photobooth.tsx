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

export default function Photobooth() {
  const [searchParams] = useSearchParams();

  // Normalize raw search param slug to match database format perfectly
  const rawParam = searchParams.get('event') || 'pima-albay';
  const decodedSlug = decodeURIComponent(rawParam);

  const eventSlug = decodedSlug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [photos, setPhotos] = useState<HTMLImageElement[]>([]);
  const [isCapturingSeries, setIsCapturingSeries] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flashEffect, setFlashEffect] = useState(false);

  // Customization States
  const [eventName, setEventName] = useState('PIMA ALBAY');
  const [subtitleText, setSubtitleText] = useState('Official Event Memory');
  const [textColor, setTextColor] = useState('#2C3E50');
  const [fontStyle, setFontStyle] = useState('serif');

  // Multi-Template Support
  const [customTemplateUrls, setCustomTemplateUrls] = useState<string[]>([]);
  const [activeCustomOverlayImg, setActiveCustomOverlayImg] = useState<HTMLImageElement | null>(
    null
  );
  const [selectedTemplate, setSelectedTemplate] = useState<number>(5); // Default to LookUp 4-Frame

  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  // Fetch Event Customizations
  useEffect(() => {
    let isMounted = true;
    const fetchEventData = async () => {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('event_slug', eventSlug)
        .maybeSingle();

      if (isMounted && data) {
        if (data.event_name) setEventName(data.title_text || data.event_name);
        if (data.subtitle_text) setSubtitleText(data.subtitle_text);
        if (data.text_color) setTextColor(data.text_color);
        if (data.font_style) setFontStyle(data.font_style);

        const urls: string[] = data.custom_template_urls || [];
        if (data.custom_template_url && !urls.includes(data.custom_template_url)) {
          urls.unshift(data.custom_template_url);
        }

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

  const fetchAvailableCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter((device) => device.kind === 'videoinput')
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Lens ${index + 1}`,
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
      activeStream.getTracks().forEach((track) => {
        track.stop();
        activeStream.removeTrack(track);
      });
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
      }

      await fetchAvailableCameras();
    } catch (err: any) {
      setCameraError('Failed to initialize selected camera lens.');
    }
  }, [selectedDeviceId, fetchAvailableCameras]);

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  const takeSingleFrame = (): HTMLImageElement | null => {
    if (!videoRef.current) return null;
    const video = videoRef.current;

    // Use 3:2 aspect ratio (1200x800) so photos fit nicely into landscape template frames
    const targetWidth = 1200;
    const targetHeight = 800;
    const targetAspect = targetWidth / targetHeight;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = targetWidth;
    tempCanvas.height = targetHeight;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return null;

    const videoWidth = video.videoWidth || 1280;
    const videoHeight = video.videoHeight || 720;
    const videoAspect = videoWidth / videoHeight;

    let sourceX = 0,
      sourceY = 0,
      sourceWidth = videoWidth,
      sourceHeight = videoHeight;

    if (videoAspect > targetAspect) {
      sourceWidth = videoHeight * targetAspect;
      sourceX = (videoWidth - sourceWidth) / 2;
    } else {
      sourceHeight = videoWidth / targetAspect;
      sourceY = (videoHeight - sourceHeight) / 2;
    }

    ctx.translate(targetWidth, 0);
    ctx.scale(-1, 1);
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

  const requiredPhotoCount = selectedTemplate === 5 ? 4 : 6;

  const startBurstCapture = async () => {
    if (isCapturingSeries) return;
    setPhotos([]);
    setIsCapturingSeries(true);
    setUploadedUrl(null);

    const captured: HTMLImageElement[] = [];

    for (let i = 1; i <= requiredPhotoCount; i++) {
      for (let cd = 3; cd > 0; cd--) {
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
    if (photos.length >= requiredPhotoCount && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const opts = {
        ctx,
        images: photos,
        width: 1200,
        height: 2400,
        eventName,
        subtitleText,
        textColor,
        fontStyle,
        customOverlayImg: activeCustomOverlayImg,
      };

      if (selectedTemplate === 5) renderTemplate5(opts);
      if (selectedTemplate === 1) renderTemplate1(opts);
      if (selectedTemplate === 2) renderTemplate2(opts);
      if (selectedTemplate === 3) renderTemplate3(opts);
      if (selectedTemplate === 4) renderCustomPNGTemplate(opts);
    }
  }, [
    photos,
    selectedTemplate,
    eventName,
    subtitleText,
    textColor,
    fontStyle,
    activeCustomOverlayImg,
    requiredPhotoCount,
  ]);

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

      const { error: createErr } = await supabase.from('events').upsert(
        [
          {
            event_name: defaultName,
            event_slug: cleanSlug,
            title_text: defaultName,
            subtitle_text: 'Official Event Memory',
            text_color: '#2C3E50',
            font_style: 'serif',
            custom_template_urls: [],
          },
        ],
        { onConflict: 'event_slug' }
      );

      if (createErr) {
        alert(`Cannot create matching event row: ${createErr.message}`);
        setIsUploading(false);
        return;
      }
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

        const { error: dbErr } = await supabase.from('event_photos').insert([
          {
            event_slug: cleanSlug,
            storage_path: filePath,
            public_url: publicUrl,
            template_used: selectedTemplate,
          },
        ]);

        if (dbErr) {
          console.error('Database insert error:', dbErr);
          alert(`Failed to record photo in database: ${dbErr.message}`);
        } else {
          setUploadedUrl(publicUrl);
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.7 },
          });
        }

        setIsUploading(false);
      },
      'image/jpeg',
      0.85
    );
  };

  return (
    <div className="min-h-[100dvh] bg-gray-950 text-white flex flex-col justify-between p-4 pt-safe pb-safe max-w-md mx-auto touch-none select-none">
      <header className="w-full flex items-center justify-between py-2.5 px-4 bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-gray-800 shadow-xl mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <h1 className="font-bold text-xs uppercase tracking-wider text-white truncate max-w-[140px]">
            {eventName}
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

      {photos.length < requiredPhotoCount ? (
        <main className="w-full flex-1 flex flex-col justify-center items-center gap-4 my-auto">
          <div className="relative w-full aspect-[3/4] max-w-[320px] bg-black rounded-3xl overflow-hidden border-2 border-gray-800/80 shadow-2xl flex items-center justify-center">
            {cameraError ? (
              <div className="p-6 text-center text-red-400 flex flex-col items-center gap-2.5">
                <AlertCircle className="w-10 h-10 text-red-500" />
                <p className="text-xs font-medium leading-relaxed">{cameraError}</p>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />
            )}

            <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold border border-white/10 text-white shadow-lg">
              {photos.length} / {requiredPhotoCount} Shots
            </div>

            {countdown !== null && (
              <div className="absolute top-3 left-3 bg-red-600/90 text-white backdrop-blur-md px-3 py-1 rounded-full text-xs font-black border border-red-400/40 shadow-xl flex items-center gap-1.5 animate-pulse">
                <Timer className="w-3.5 h-3.5" />
                <span>SNAP IN {countdown}...</span>
              </div>
            )}

            {flashEffect && (
              <div className="absolute inset-0 bg-white opacity-90 transition-opacity duration-150" />
            )}
          </div>

          <div className="w-full max-w-[320px]">
            <button
              onClick={startBurstCapture}
              disabled={isCapturingSeries || !!cameraError}
              className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 active:scale-95 disabled:opacity-50 font-bold text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2 text-white border border-red-500/30 transition-transform"
            >
              <Camera className="w-5 h-5" />
              {isCapturingSeries
                ? `Taking Shot ${photos.length + 1}...`
                : `Snap ${requiredPhotoCount} Photobooth Shots`}
            </button>
          </div>
        </main>
      ) : (
        <main className="w-full flex-1 flex flex-col items-center gap-3 overflow-hidden my-auto">
          <div className="text-center">
            <h2 className="text-base font-bold flex items-center justify-center gap-1.5 text-green-400">
              <Sparkles className="w-4 h-4" /> Photos Ready!
            </h2>
            <p className="text-[11px] text-gray-400">Select a frame style</p>
          </div>

          <div className="grid grid-cols-4 gap-1.5 w-full">
            {[
              { id: 5, name: 'LookUp' },
              { id: 3, name: 'Polaroid' },
              { id: 1, name: 'Classic' },
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

          {/* Custom Templates Carousel Selector */}
          {customTemplateUrls.length > 0 && (
            <div className="w-full flex flex-col gap-1">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                Custom PNG Frames:
              </p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {customTemplateUrls.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      loadCustomOverlay(url);
                    }}
                    className={`shrink-0 w-12 h-16 rounded-lg overflow-hidden border transition bg-black ${
                      selectedTemplate === 4 && activeCustomOverlayImg?.src === url
                        ? 'border-red-500 ring-2 ring-red-500/50'
                        : 'border-gray-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={url}
                      alt={`Frame ${i + 1}`}
                      className="w-full h-full object-contain p-0.5"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

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
                  <Share2 className="w-3 h-3" /> Copy Direct Image Link
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setPhotos([]);
                setUploadedUrl(null);
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
