export interface TemplateOptions {
  ctx: CanvasRenderingContext2D;
  images: HTMLImageElement[];
  width: number;
  height: number;
  eventName?: string;
  subtitleText?: string;
  textColor?: string;
  fontStyle?: string;
  gradientTheme?: string;
  stickerStyle?: string;
  customOverlayImg?: HTMLImageElement | null;
}

// Standard cover scale for grid templates
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  if (!img || !img.width || !img.height) return;

  const imgAspect = img.width / img.height;
  const targetAspect = w / h;

  let renderW = w;
  let renderH = h;
  let offsetX = 0;
  let offsetY = 0;

  if (imgAspect > targetAspect) {
    renderW = h * imgAspect;
    offsetX = (w - renderW) / 2;
  } else {
    renderH = w / imgAspect;
    offsetY = targetAspect > 1.3 ? 0 : 0;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + offsetX, y + offsetY, renderW, renderH);

  const grad = ctx.createRadialGradient(
    x + w / 2, y + h / 2, Math.min(w, h) * 0.3,
    x + w / 2, y + h / 2, Math.max(w, h) * 0.75
  );
  grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.12)');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  ctx.restore();
}

// Contain scale helper for custom template slots to maintain ratios without cutting
function drawImageContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  if (!img || !img.width || !img.height) return;

  const imgAspect = img.width / img.height;
  const targetAspect = w / h;

  let renderW = w;
  let renderH = h;
  let offsetX = 0;
  let offsetY = 0;

  if (imgAspect > targetAspect) {
    renderW = w;
    renderH = w / imgAspect;
    offsetY = (h - renderH) / 2;
  } else {
    renderH = h;
    renderW = h * imgAspect;
    offsetX = (w - renderW) / 2;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x, y, w, h);

  ctx.drawImage(img, x + offsetX, y + offsetY, renderW, renderH);
  ctx.restore();
}

function getFontFamily(style?: string): string {
  switch (style) {
    case 'sans-serif':
      return 'Inter, system-ui, Arial, sans-serif';
    case 'monospace':
      return '"Courier New", Courier, monospace';
    case 'serif':
    default:
      return 'Georgia, "Times New Roman", serif';
  }
}

function applyCanvasGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: string = 'dark'
) {
  const grad = ctx.createLinearGradient(0, 0, width, height);

  switch (theme) {
    case 'sunset':
      grad.addColorStop(0, '#FFEDD5');
      grad.addColorStop(0.5, '#FDBA74');
      grad.addColorStop(1, '#F43F5E');
      break;
    case 'pastel':
      grad.addColorStop(0, '#F1F5F9');
      grad.addColorStop(0.5, '#E2E8F0');
      grad.addColorStop(1, '#CBD5E1');
      break;
    case 'neon':
      grad.addColorStop(0, '#0F172A');
      grad.addColorStop(0.5, '#581C87');
      grad.addColorStop(1, '#831843');
      break;
    case 'monochrome':
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(1, '#E2E8F0');
      break;
    case 'dark':
    default:
      grad.addColorStop(0, '#0F172A');
      grad.addColorStop(0.5, '#1E1B4B');
      grad.addColorStop(1, '#020617');
      break;
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

function drawStickers(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  stickerStyle: string = 'none'
) {
  if (!stickerStyle || stickerStyle === 'none') return;

  ctx.save();
  ctx.textAlign = 'center';

  if (stickerStyle === 'stars') {
    ctx.font = '36px sans-serif';
    ctx.fillText('✨', 100, 80);
    ctx.fillText('⭐', width - 100, 80);
    ctx.fillText('🌟', 90, height - 90);
    ctx.fillText('✨', width - 90, height - 90);
  } else if (stickerStyle === 'hearts') {
    ctx.font = '36px sans-serif';
    ctx.fillText('💖', 100, 80);
    ctx.fillText('💗', width - 100, 80);
    ctx.fillText('💕', 90, height - 90);
    ctx.fillText('❤️', width - 90, height - 90);
  } else if (stickerStyle === 'sparkles') {
    ctx.font = '32px sans-serif';
    ctx.fillText('⚡', 100, 70);
    ctx.fillText('🔥', width - 100, 70);
    ctx.fillText('🎉', 90, height - 80);
    ctx.fillText('🥳', width - 90, height - 80);
  } else if (stickerStyle === 'vintage-badge') {
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#DC2626';
    ctx.fillText('● OFFICIAL MEMORY ●', width / 2, 45);
  }

  ctx.restore();
}

// Template 1: Classic Dark Grid (6 Shots)
export function renderTemplate1({
  ctx,
  images,
  width,
  height,
  eventName = 'PIMA ALBAY',
  subtitleText = 'WELCOME PARTY 2026',
  textColor = '#FFFFFF',
  fontStyle = 'sans-serif',
  gradientTheme = 'dark',
  stickerStyle = 'none',
}: TemplateOptions) {
  applyCanvasGradient(ctx, width, height, gradientTheme);

  const font = getFontFamily(fontStyle);
  const sideMargin = 80;
  const topHeader = 120;
  const footerHeight = 180;
  const gridW = width - sideMargin * 2;
  const gridH = height - topHeader - footerHeight;

  const gap = 20;
  const cols = 2;
  const rows = 3;
  const cellW = (gridW - gap * (cols - 1)) / cols;
  const cellH = (gridH - gap * (rows - 1)) / rows;

  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.font = `bold 42px ${font}`;
  ctx.fillText(eventName.toUpperCase(), width / 2, 75);

  images.slice(0, 6).forEach((img, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = sideMargin + col * (cellW + gap);
    const y = topHeader + row * (cellH + gap);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x - 4, y - 4, cellW + 8, cellH + 8);
    drawImageCover(ctx, img, x, y, cellW, cellH);
  });

  ctx.fillStyle = textColor;
  ctx.font = `18px ${font}`;
  ctx.fillText(subtitleText, width / 2, height - 70);

  drawStickers(ctx, width, height, stickerStyle);
}

// Template 2: Vibrant Sunset Grid (6 Shots)
export function renderTemplate2({
  ctx,
  images,
  width,
  height,
  eventName = 'PIMA ALBAY',
  subtitleText = 'WELCOME PARTY 2026',
  textColor = '#1E293B',
  fontStyle = 'serif',
  gradientTheme = 'sunset',
  stickerStyle = 'none',
}: TemplateOptions) {
  applyCanvasGradient(ctx, width, height, gradientTheme);

  const font = getFontFamily(fontStyle);
  const sideMargin = 80;
  const startY = 70;
  const availableH = height - startY - 180;

  const cols = 2;
  const rows = 3;
  const gap = 24;
  const cellW = (width - sideMargin * 2 - gap) / cols;
  const cellH = (availableH - gap * (rows - 1)) / rows;

  images.slice(0, 6).forEach((img, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = sideMargin + col * (cellW + gap);
    const y = startY + row * (cellH + gap);

    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;
    ctx.fillRect(x - 8, y - 8, cellW + 16, cellH + 16);
    ctx.shadowColor = 'transparent';

    drawImageCover(ctx, img, x, y, cellW, cellH);
  });

  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.font = `bold 38px ${font}`;
  ctx.fillText(eventName, width / 2, height - 100);

  ctx.font = `italic 20px ${font}`;
  ctx.fillText(subtitleText, width / 2, height - 60);

  drawStickers(ctx, width, height, stickerStyle);
}

// Template 3: Polaroid Classic Vertical Strip (6 Shots)
export function renderTemplate3({
  ctx,
  images,
  width,
  height,
  eventName = 'PIMA ALBAY',
  subtitleText = 'WELCOME PARTY 2026',
  textColor = '#1E293B',
  fontStyle = 'serif',
  gradientTheme = 'pastel',
  stickerStyle = 'none',
}: TemplateOptions) {
  applyCanvasGradient(ctx, width, height, gradientTheme);

  const font = getFontFamily(fontStyle);
  const sideMargin = 90;
  const topMargin = 70;
  const bottomSpace = 220;

  const count = Math.min(images.length, 6);
  const cols = count > 4 ? 2 : 1;
  const rows = count > 4 ? 3 : 4;

  const availableW = width - sideMargin * 2;
  const availableH = height - topMargin - bottomSpace;
  const gap = 20;

  const cellW = cols === 2 ? (availableW - gap) / 2 : availableW;
  const cellH = (availableH - gap * (rows - 1)) / rows;

  images.slice(0, cols * rows).forEach((img, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = sideMargin + c * (cellW + gap);
    const y = topMargin + r * (cellH + gap);

    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
    ctx.shadowBlur = 12;
    ctx.fillRect(x - 6, y - 6, cellW + 12, cellH + 12);
    ctx.shadowColor = 'transparent';

    drawImageCover(ctx, img, x, y, cellW, cellH);
  });

  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.font = `bold 40px ${font}`;
  ctx.fillText(eventName, width / 2, height - 120);

  ctx.font = `18px ${font}`;
  ctx.fillText(subtitleText, width / 2, height - 75);

  drawStickers(ctx, width, height, stickerStyle);
}

// Template 5: 4-Frame "lookUp" Photo Strip
export function renderTemplate5({
  ctx,
  images,
  width,
  height,
  eventName = 'PIMA',
  subtitleText = 'WELCOME PARTY 2026',
  textColor = '#000000',
  fontStyle = 'sans-serif',
  gradientTheme = 'monochrome',
  stickerStyle = 'none',
}: TemplateOptions) {
  applyCanvasGradient(ctx, width, height, gradientTheme);

  const font = getFontFamily(fontStyle);

  const sideMargin = 140;
  const topMargin = 90;
  const bottomSpace = 340;
  const gap = 28;

  const availableW = width - sideMargin * 2;
  const availableH = height - topMargin - bottomSpace;
  const frameH = (availableH - gap * 3) / 4;

  images.slice(0, 4).forEach((img, i) => {
    const y = topMargin + i * (frameH + gap);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5;
    ctx.strokeRect(sideMargin, y, availableW, frameH);

    drawImageCover(ctx, img, sideMargin, y, availableW, frameH);

    ctx.fillStyle = '#000000';
    ctx.font = `bold 22px ${font}`;
    ctx.textAlign = 'right';
    ctx.fillText(`▸ ${i + 1}`, sideMargin - 18, y + frameH / 2 + 8);

    ctx.font = `bold 18px ${font}`;
    ctx.textAlign = 'left';
    ctx.fillText('up ▲', sideMargin + availableW + 18, y + frameH / 2 + 6);
  });

  const footerCenterY = height - 160;

  ctx.fillStyle = textColor || '#000000';
  ctx.textAlign = 'center';

  ctx.font = `italic bold 68px ${font}`;
  ctx.fillText(eventName, width / 2, footerCenterY);

  ctx.font = `bold 22px ${font}`;
  ctx.fillText(subtitleText.toUpperCase(), width / 2, footerCenterY + 48);

  drawStickers(ctx, width, height, stickerStyle);
}

// Custom PNG Frame Overlay Renderer (Includes title, subheading, and 0.8 square ratio slots)
export function renderCustomPNGTemplate({
  ctx,
  images,
  width,
  height,
  eventName = 'PIMA ALBAY',
  subtitleText = 'WELCOME PARTY 2026',
  textColor = '#000000',
  fontStyle = 'sans-serif',
  customOverlayImg,
  stickerStyle = 'none',
}: TemplateOptions) {
  // 1. Base white background fill
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // 2. Define grid slot proportions (0.8 x 0.8 square ratio)
  const cols = 2;
  const rows = 3;
  const sideMargin = 150;
  const topMargin = 220;
  const gapX = 40;
  const gapY = 30;

  const totalW = width - sideMargin * 2;
  const cellW = (totalW - gapX * (cols - 1)) / cols;
  const cellH = cellW; // Strict square ratio ($1:1$)

  // 3. Draw captured photos first in the background slots
  images.slice(0, 6).forEach((img, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = sideMargin + c * (cellW + gapX);
    const y = topMargin + r * (cellH + gapY);
    
    drawImageContain(ctx, img, x, y, cellW, cellH);
  });

  // 4. Draw custom frame overlay on top, punching out the square slots
  if (customOverlayImg) {
    ctx.save();
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (tempCtx) {
      tempCtx.drawImage(customOverlayImg, 0, 0, width, height);
      
      tempCtx.globalCompositeOperation = 'destination-out';
      images.slice(0, 6).forEach((_, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const x = sideMargin + c * (cellW + gapX);
        const y = topMargin + r * (cellH + gapY);
        tempCtx.fillRect(x, y, cellW, cellH);
      });
      
      ctx.drawImage(tempCanvas, 0, 0);
    } else {
      ctx.drawImage(customOverlayImg, 0, 0, width, height);
    }
    
    ctx.restore();
  }

  // 5. Draw Title and Subheading Text on top of the custom template
  const font = getFontFamily(fontStyle);
  ctx.fillStyle = textColor || '#000000';
  ctx.textAlign = 'center';

  // Title (Near top header area)
  ctx.font = `bold 48px ${font}`;
  ctx.fillText(eventName.toUpperCase(), width / 2, 110);

  // Subheading (Near bottom footer area)
  ctx.font = `bold 22px ${font}`;
  ctx.fillText(subtitleText.toUpperCase(), width / 2, height - 100);

  drawStickers(ctx, width, height, stickerStyle);
}