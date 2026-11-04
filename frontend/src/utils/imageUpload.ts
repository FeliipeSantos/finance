const UPLOAD_SIZE = 128;

export const roundedFaviconDataUri = (imageData: string | null): string => {
  if (!imageData) return '/platform-icon.png';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><clipPath id="rounded"><rect width="128" height="128" rx="26"/></clipPath></defs><image href="${imageData}" width="128" height="128" preserveAspectRatio="xMidYMid meet" clip-path="url(#rounded)"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

// Redimensiona/recorta a imagem escolhida num quadrado (cover), para manter o
// data URI salvo pequeno independente do tamanho do arquivo original.
export const resizeImageToDataUri = (file: File, fit: 'cover' | 'contain' = 'cover', rounded = false): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Falha ao carregar imagem'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = UPLOAD_SIZE;
        canvas.height = UPLOAD_SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas não suportado'));
          return;
        }
        const scale = (fit === 'contain' ? Math.min : Math.max)(UPLOAD_SIZE / img.width, UPLOAD_SIZE / img.height);
        const drawWidth = img.width * scale;
        const drawHeight = img.height * scale;
        if (rounded) {
          const radius = UPLOAD_SIZE * 0.2;
          ctx.beginPath();
          ctx.roundRect(0, 0, UPLOAD_SIZE, UPLOAD_SIZE, radius);
          ctx.clip();
        }
        ctx.drawImage(img, (UPLOAD_SIZE - drawWidth) / 2, (UPLOAD_SIZE - drawHeight) / 2, drawWidth, drawHeight);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
};

