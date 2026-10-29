/**
 * Utility per manipolazione immagini lato client:
 * - Rimozione dello sfondo bianco/chiaro tramite HTML5 Canvas
 * - Ridimensionamento e compressione ottimizzata in formato WebP/PNG
 */

export interface ProcessImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  removeWhiteBg?: boolean;
  whiteThreshold?: number; // soglia tra 0 e 255 (es. 240)
  outputFormat?: 'image/webp' | 'image/png';
  quality?: number; // 0..1
}

/**
 * Rimuove lo sfondo chiaro o bianco da un'immagine tramite scansione dei pixel RGB
 * e genera un Blob trasparente ottimizzato.
 */
export async function processImageForUpload(
  file: File,
  options: ProcessImageOptions = {}
): Promise<{ blob: Blob; previewUrl: string }> {
  const {
    maxWidth = 800,
    maxHeight = 800,
    removeWhiteBg = false,
    whiteThreshold = 235,
    outputFormat = removeWhiteBg ? 'image/png' : 'image/webp',
    quality = 0.85,
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Calcolo dimensioni mantenendo le proporzioni
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Impossibile ottenere il contesto 2D del Canvas'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        if (removeWhiteBg) {
          const imageData = ctx.getImageData(0, 0, width, height);
          const data = imageData.data;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Se il pixel è vicino al bianco su tutti i tre canali, rendilo trasparente
            if (r >= whiteThreshold && g >= whiteThreshold && b >= whiteThreshold) {
              data[i + 3] = 0; // Alpha trasparente
            }
          }

          ctx.putImageData(imageData, 0, 0);
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Errore nella generazione del file immagine'));
              return;
            }
            const previewUrl = URL.createObjectURL(blob);
            resolve({ blob, previewUrl });
          },
          outputFormat,
          quality
        );
      };

      img.onerror = () => reject(new Error('Errore nel caricamento dell\'immagine'));
      img.src = event.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Errore nella lettura del file'));
    reader.readAsDataURL(file);
  });
}
