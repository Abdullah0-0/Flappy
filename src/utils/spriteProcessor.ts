/**
 * Processes an uploaded sticker-style JPEG image by flood-filling from the outer edges
 * to strip the solid white outer background while preserving the crisp white sticker outline
 * and interior details of the character portrait.
 */
export async function createStickerCutoutSprite(imageUrl: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const maxDim = 256;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get 2D context for sprite processor'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      try {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const visited = new Uint8Array(width * height);
        const queue = new Int32Array(width * height);
        let head = 0;
        let tail = 0;

        // Check if pixel at (x, y) is near-white outer background
        // Notice: Both uploaded photos have a thin grey outer sticker stroke (~200-235 luminance)
        // surrounding the white sticker border, surrounded by pure white (250-255) outside.
        // Flood-filling pixels with R,G,B >= 244 from the perimeter cleanly removes only the
        // exterior white background up to the grey sticker outline!
        const isExteriorWhite = (idx: number): boolean => {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          return r >= 242 && g >= 242 && b >= 242;
        };

        const enqueueIfValid = (x: number, y: number) => {
          if (x < 0 || x >= width || y < 0 || y >= height) return;
          const pos = y * width + x;
          if (visited[pos]) return;
          const rgbaIdx = pos * 4;
          if (isExteriorWhite(rgbaIdx)) {
            visited[pos] = 1;
            queue[tail++] = pos;
          }
        };

        // Seed flood-fill along all 4 image edges
        for (let x = 0; x < width; x++) {
          enqueueIfValid(x, 0);
          enqueueIfValid(x, height - 1);
        }
        for (let y = 0; y < height; y++) {
          enqueueIfValid(0, y);
          enqueueIfValid(width - 1, y);
        }

        // BFS flood fill from exterior corners/edges
        while (head < tail) {
          const pos = queue[head++];
          const rgbaIdx = pos * 4;
          data[rgbaIdx + 3] = 0; // Make exterior background transparent

          const x = pos % width;
          const y = (pos - x) / width;

          enqueueIfValid(x + 1, y);
          enqueueIfValid(x - 1, y);
          enqueueIfValid(x, y + 1);
          enqueueIfValid(x, y - 1);
        }

        // Soften 1px fringe along the flood-filled boundary for anti-aliased rendering
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const pos = y * width + x;
            if (!visited[pos]) {
              const hasTransparentNeighbor =
                visited[pos - 1] ||
                visited[pos + 1] ||
                visited[pos - width] ||
                visited[pos + width];
              if (hasTransparentNeighbor) {
                const rgbaIdx = pos * 4;
                const r = data[rgbaIdx];
                const g = data[rgbaIdx + 1];
                const b = data[rgbaIdx + 2];
                if (r > 235 && g > 235 && b > 235) {
                  data[rgbaIdx + 3] = 150;
                }
              }
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);
      } catch {
        // If getImageData fails for any reason, keep the drawn image intact
      }

      resolve(canvas);
    };

    img.onerror = (err) => reject(err);
    img.src = imageUrl;
  });
}
