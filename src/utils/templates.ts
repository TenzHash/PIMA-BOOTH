export interface TemplateOptions {
  ctx: CanvasRenderingContext2D;
  images: HTMLImageElement[];
  width: number;
  height: number;
  eventName?: string;
  subtitleText?: string;
  textColor?: string;
  fontStyle?: string;
  customOverlayImg?: HTMLImageElement | null;
}

// Helper function to draw images without distortion or cutting off faces
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
    offsetY = (h - renderH) / 2;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + offsetX, y + offsetY, renderW, renderH);
  ctx.restore();
}

// Helper for text font styling
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

// Template 1: Dark Mode Grid
export function renderTemplate1({
  ctx,
  images,
  width,
  height,
  eventName = 'EVENT NAME',
  subtitleText = 'Official Event Memory',
  textColor = '#FFFFFF',
  fontStyle = 'sans-serif',
}: TemplateOptions) {
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, width, height);

  const font = getFontFamily(fontStyle);
  const margin = 40;
  const topHeader = 120;
  const footerHeight = 180;
  const gridW = width - margin * 2;
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
    const x = margin + col * (cellW + gap);
    const y = topHeader + row * (cellH + gap);

    ctx.fillStyle = '#1E293B';
    ctx.fillRect(x - 4, y - 4, cellW + 8, cellH + 8);
    drawImageCover(ctx, img, x, y, cellW, cellH);
  });

  ctx.fillStyle = textColor;
  ctx.font = `18px ${font}`;
  ctx.fillText(subtitleText, width / 2, height - 70);
}

// Template 2: Sunset / Vibrant Theme
export function renderTemplate2({
  ctx,
  images,
  width,
  height,
  eventName = 'EVENT NAME',
  subtitleText = 'Official Event Memory',
  textColor = '#2C3E50',
  fontStyle = 'serif',
}: TemplateOptions) {
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#FFF5EB');
  grad.addColorStop(1, '#FED7AA');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  const font = getFontFamily(fontStyle);
  const margin = 45;
  const startY = 60;
  const availableH = height - startY - 180;

  const cols = 2;
  const rows = 3;
  const gap = 24;
  const cellW = (width - margin * 2 - gap) / cols;
  const cellH = (availableH - gap * (rows - 1)) / rows;

  images.slice(0, 6).forEach((img, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = margin + col * (cellW + gap);
    const y = startY + row * (cellH + gap);

    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
    ctx.shadowBlur = 12;
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
}

// Template 3: Polaroid Classic Vertical Strip
export function renderTemplate3({
  ctx,
  images,
  width,
  height,
  eventName = 'PIMA ALBAY',
  subtitleText = 'Official Event Memory',
  textColor = '#2C3E50',
  fontStyle = 'serif',
}: TemplateOptions) {
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, width, height);

  const font = getFontFamily(fontStyle);
  const sideMargin = 60;
  const topMargin = 60;
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
    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = 10;
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
}

// NEW Template 5: 4-Frame Vertical "lookUp" Wide Photo Strip Layout
export function renderTemplate5({
  ctx,
  images,
  width,
  height,
  eventName = 'lookUp',
  subtitleText = 'PHOTOBOOTH',
  textColor = '#000000',
  fontStyle = 'sans-serif',
}: TemplateOptions) {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  const font = getFontFamily(fontStyle);
  const sideMargin = 70;
  const topMargin = 50;
  const bottomSpace = 200;
  const gap = 22;

  const availableW = width - sideMargin * 2;
  const availableH = height - topMargin - bottomSpace;
  const frameH = (availableH - gap * 3) / 4;

  // Render 4 stacked landscape photo frames
  images.slice(0, 4).forEach((img, i) => {
    const y = topMargin + i * (frameH + gap);

    // Black frame outline
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeRect(sideMargin, y, availableW, frameH);

    // Image fit without distortion
    drawImageCover(ctx, img, sideMargin, y, availableW, frameH);

    // Side indicators: Left frame numbers (▸ 1, ▸ 2...)
    ctx.fillStyle = '#000000';
    ctx.font = `bold 22px ${font}`;
    ctx.textAlign = 'right';
    ctx.fillText(`▸ ${i + 1}`, sideMargin - 15, y + frameH / 2 + 8);

    // Right side label ("up ▲")
    ctx.font = `bold 18px ${font}`;
    ctx.textAlign = 'left';
    ctx.fillText('up ▲', sideMargin + availableW + 15, y + frameH / 2 + 6);
  });

  // Bottom Logo / Typography Branding
  const footerY = height - 110;
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';

  // Stylized "lookUp" title
  ctx.font = `italic bold 56px ${font}`;
  ctx.fillText(eventName, width / 2, footerY);

  // Subtitle / "PHOTOBOOTH" label
  ctx.font = `bold 16px ${font}`;
  ctx.fillText(subtitleText.toUpperCase(), width / 2, footerY + 36);
}

// Custom PNG Overlay Template Loader
export function renderCustomPNGTemplate({
  ctx,
  images,
  width,
  height,
  customOverlayImg,
}: TemplateOptions) {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  const sideMargin = 50;
  const topMargin = 50;
  const gap = 16;
  const rows = 3;
  const cols = 2;
  const cellW = (width - sideMargin * 2 - gap) / cols;
  const cellH = (height - topMargin - 200 - gap * (rows - 1)) / rows;

  images.slice(0, 6).forEach((img, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = sideMargin + c * (cellW + gap);
    const y = topMargin + r * (cellH + gap);
    drawImageCover(ctx, img, x, y, cellW, cellH);
  });

  if (customOverlayImg) {
    ctx.drawImage(customOverlayImg, 0, 0, width, height);
  }
}