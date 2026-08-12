export interface TemplateRenderOptions {
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

// Aspect Ratio Cover Fit calculation to prevent image stretching or head clipping
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const imgAspect = img.width / img.height;
  const targetAspect = w / h;

  let sx = 0, sy = 0, sw = img.width, sh = img.height;

  if (imgAspect > targetAspect) {
    sw = img.height * targetAspect;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / targetAspect;
    sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// 1. Polaroid Vintage Collage Template with Editable Text
export function renderTemplate3({
  ctx,
  images,
  width,
  height,
  eventName = 'PIMA Albay',
  subtitleText = 'Official Event Memory',
  textColor = '#2C3E50',
  fontStyle = 'serif',
}: TemplateRenderOptions) {
  // Canvas Background
  ctx.fillStyle = '#F4F1EA';
  ctx.fillRect(0, 0, width, height);

  // Header Title
  ctx.fillStyle = textColor;
  ctx.font = `bold 52px ${fontStyle}`;
  ctx.textAlign = 'center';
  ctx.fillText(eventName, width / 2, 95);

  const photoW = 390;
  const photoH = 520;
  const framePad = 18;
  const frameBottomPad = 65;

  const coords = [
    { x: 120, y: 140, angle: -0.03 },
    { x: 670, y: 160, angle: 0.04 },
    { x: 100, y: 680, angle: 0.02 },
    { x: 690, y: 660, angle: -0.04 },
    { x: 130, y: 1210, angle: -0.02 },
    { x: 660, y: 1230, angle: 0.03 },
  ];

  images.slice(0, 6).forEach((img, idx) => {
    const { x, y, angle } = coords[idx];

    ctx.save();
    ctx.translate(x + photoW / 2, y + photoH / 2);
    ctx.rotate(angle);

    ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
    ctx.shadowBlur = 18;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(
      -photoW / 2 - framePad,
      -photoH / 2 - framePad,
      photoW + framePad * 2,
      photoH + framePad + frameBottomPad
    );

    ctx.shadowBlur = 0;
    drawImageCover(ctx, img, -photoW / 2, -photoH / 2, photoW, photoH);
    ctx.restore();
  });

  // Footer Subtitle
  ctx.fillStyle = textColor;
  ctx.font = `italic 28px ${fontStyle}`;
  ctx.fillText(subtitleText, width / 2, height - 35);
}

// 2. Dedicated Custom PNG Overlay Template with Editable Text
export function renderCustomPNGTemplate({
  ctx,
  images,
  width,
  height,
  eventName = 'PIMA Albay',
  subtitleText = 'Official Event Memory',
  textColor = '#2C3E50',
  fontStyle = 'serif',
  customOverlayImg,
}: TemplateRenderOptions) {
  // Draw Uploaded Custom PNG Background First
  if (customOverlayImg) {
    ctx.drawImage(customOverlayImg, 0, 0, width, height);
  } else {
    ctx.fillStyle = '#F4F1EA';
    ctx.fillRect(0, 0, width, height);
  }

  // Header Title
  ctx.fillStyle = textColor;
  ctx.font = `bold 52px ${fontStyle}`;
  ctx.textAlign = 'center';
  ctx.fillText(eventName, width / 2, 95);

  const photoW = 390;
  const photoH = 520;
  const framePad = 18;
  const frameBottomPad = 65;

  const coords = [
    { x: 120, y: 140, angle: -0.03 },
    { x: 670, y: 160, angle: 0.04 },
    { x: 100, y: 680, angle: 0.02 },
    { x: 690, y: 660, angle: -0.04 },
    { x: 130, y: 1210, angle: -0.02 },
    { x: 660, y: 1230, angle: 0.03 },
  ];

  images.slice(0, 6).forEach((img, idx) => {
    const { x, y, angle } = coords[idx];

    ctx.save();
    ctx.translate(x + photoW / 2, y + photoH / 2);
    ctx.rotate(angle);

    ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
    ctx.shadowBlur = 18;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(
      -photoW / 2 - framePad,
      -photoH / 2 - framePad,
      photoW + framePad * 2,
      photoH + framePad + frameBottomPad
    );

    ctx.shadowBlur = 0;
    drawImageCover(ctx, img, -photoW / 2, -photoH / 2, photoW, photoH);
    ctx.restore();
  });

  // Footer Subtitle
  ctx.fillStyle = textColor;
  ctx.font = `italic 28px ${fontStyle}`;
  ctx.fillText(subtitleText, width / 2, height - 35);
}

// 3. Classic Dark Crimson Template
export function renderTemplate1(opts: TemplateRenderOptions) {
  const { ctx, images, width, height, eventName = 'PIMA ALBAY', subtitleText = 'Legazpi City', textColor = '#FFFFFF', fontStyle = 'sans-serif' } = opts;
  ctx.fillStyle = '#121212';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#C0392B';
  ctx.fillRect(0, 0, width, 150);

  ctx.fillStyle = textColor;
  ctx.font = `bold 44px ${fontStyle}`;
  ctx.textAlign = 'center';
  ctx.fillText(eventName.toUpperCase(), width / 2, 90);

  const padding = 40;
  const topOffset = 190;
  const cols = 2;
  const rows = 3;
  const frameW = (width - padding * 3) / cols;
  const frameH = (height - topOffset - 200 - padding * 3) / rows;

  images.slice(0, 6).forEach((img, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = padding + col * (frameW + padding);
    const y = topOffset + row * (frameH + padding);

    ctx.fillStyle = '#222222';
    ctx.fillRect(x - 8, y - 8, frameW + 16, frameH + 16);
    drawImageCover(ctx, img, x, y, frameW, frameH);
  });

  ctx.fillStyle = textColor;
  ctx.font = `24px ${fontStyle}`;
  ctx.fillText(subtitleText, width / 2, height - 30);
}

// 4. Bicol Sunset Photocard Template
export function renderTemplate2(opts: TemplateRenderOptions) {
  const { ctx, images, width, height, eventName = 'PIMA ALBAY', subtitleText = 'OFFICIAL EVENT MEMORY', textColor = '#1A1A1A', fontStyle = 'sans-serif' } = opts;
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#FF512F');
  grad.addColorStop(1, '#DD2476');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(30, 30, width - 60, height - 60);

  const padding = 50;
  const topOffset = 160;
  const cols = 2;
  const rows = 3;
  const frameW = (width - padding * 3) / cols;
  const frameH = (height - topOffset - 220 - padding * 3) / rows;

  images.slice(0, 6).forEach((img, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = padding + col * (frameW + padding);
    const y = topOffset + row * (frameH + padding);

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 15;
    drawImageCover(ctx, img, x, y, frameW, frameH);
    ctx.restore();
  });

  ctx.fillStyle = textColor;
  ctx.font = `900 48px ${fontStyle}`;
  ctx.textAlign = 'center';
  ctx.fillText(eventName.toUpperCase(), width / 2, height - 120);

  ctx.fillStyle = '#777777';
  ctx.font = `26px ${fontStyle}`;
  ctx.fillText(subtitleText, width / 2, height - 75);
}