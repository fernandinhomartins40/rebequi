/** Decode and bound camera/gallery photos before any upload or paid AI call. */
export async function prepareQuotePhoto(blob: Blob): Promise<{ file: File; width: number; height: number }> {
  if (!blob.size || blob.size > 30 * 1024 * 1024) throw new Error('Escolha uma foto de até 30 MB.');
  const url = URL.createObjectURL(blob);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('Não foi possível abrir a foto. Escolha uma imagem JPG, PNG ou WebP.')), 15000);
      image.onload = () => { window.clearTimeout(timer); resolve(); };
      image.onerror = () => { window.clearTimeout(timer); reject(new Error('Formato não suportado. Escolha uma foto JPG, PNG ou WebP.')); };
      image.src = url;
    });
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 40000000) {
      throw new Error('A foto é grande demais. Tire outra foto da lista.');
    }
    const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível preparar a imagem neste navegador.');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const webp = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Não foi possível preparar a foto.')), 'image/webp', 0.88));
    if (webp.type !== 'image/webp') throw new Error('Atualize o navegador para preparar a imagem em WebP.');
    if (webp.size > 2 * 1024 * 1024) throw new Error('A foto ficou grande demais. Tire outra foto mais próxima da lista.');
    return { file: new File([webp], `lista-${Date.now()}.webp`, { type: 'image/webp' }), width: canvas.width, height: canvas.height };
  } finally { image.onload = null; image.onerror = null; image.src = ''; URL.revokeObjectURL(url); }
}
