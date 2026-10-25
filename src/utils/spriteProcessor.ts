/**
 * Processes an uploaded character image:
 * - If already a transparent PNG, preserves transparency or creates a circular/sticker token if needed.
 * - If a JPEG with white or solid framing, strips outer border / background cleanly.
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

      // If the image is already a transparent PNG (like removebg-preview), test if it already has transparent pixels
      try {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        let hasAlpha = false;
        for (let i = 3; i < data.length; i += 16) {
          if (data[i] < 200) {
            hasAlpha = true;
            break;
          }
        }

        // If it's already cleanly transparent, we can use it directly!
        if (hasAlpha) {
          resolve(canvas);
          return;
        }

        // Check if the image has a full scene background (like a cafe/indoor photo)
        // by comparing corner colors:
        const corners = [
          [0, 0],
          [width - 1, 0],
          [0, height - 1],
          [width - 1, height - 1],
        ];
        let whiteCorners = 0;
        corners.forEach(([cx, cy]) => {
          const idx = (cy * width + cx) * 4;
          if (data[idx] > 230 && data[idx + 1] > 230 && data[idx + 2] > 230) {
            whiteCorners++;
          }
        });

        // If it's a solid/photo background (like the cafe photo), clip into a stylish circular sticker badge with a white border
        if (whiteCorners < 3) {
          const badgeCanvas = document.createElement('canvas');
          badgeCanvas.width = width;
          badgeCanvas.height = height;
          const bCtx = badgeCanvas.getContext('2d')!;

          const radius = Math.min(width, height) / 2 - 4;
          const centerX = width / 2;
          const centerY = height / 2;

          bCtx.save();
          bCtx.beginPath();
          bCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          bCtx.clip();
          bCtx.drawImage(canvas, 0, 0);
          bCtx.restore();

          // Crisp white border + dark rim
          bCtx.beginPath();
          bCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          bCtx.lineWidth = 6;
          bCtx.strokeStyle = '#FFFFFF';
          bCtx.stroke();

          bCtx.beginPath();
          bCtx.arc(centerX, centerY, radius + 1, 0, Math.PI * 2);
          bCtx.lineWidth = 2;
          bCtx.strokeStyle = '#2B1D24';
          bCtx.stroke();

          resolve(badgeCanvas);
          return;
        }

        // Otherwise it has white outer background: flood-fill to strip the outer white
        const visited = new Uint8Array(width * height);
        const queue = new Int32Array(width * height);
        let head = 0;
        let tail = 0;

        const isExteriorWhite = (idx: number): boolean => {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          return r >= 238 && g >= 238 && b >= 238;
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

        for (let x = 0; x < width; x++) {
          enqueueIfValid(x, 0);
          enqueueIfValid(x, height - 1);
        }
        for (let y = 0; y < height; y++) {
          enqueueIfValid(0, y);
          enqueueIfValid(width - 1, y);
        }

        while (head < tail) {
          const pos = queue[head++];
          const rgbaIdx = pos * 4;
          data[rgbaIdx + 3] = 0;

          const x = pos % width;
          const y = (pos - x) / width;

          enqueueIfValid(x + 1, y);
          enqueueIfValid(x - 1, y);
          enqueueIfValid(x, y + 1);
          enqueueIfValid(x, y - 1);
        }

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
                if (data[rgbaIdx] > 235 && data[rgbaIdx + 1] > 235 && data[rgbaIdx + 2] > 235) {
                  data[rgbaIdx + 3] = 140;
                }
              }
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);
      } catch {
        // Fallback
      }

      resolve(canvas);
    };

    img.onerror = (err) => reject(err);
    img.src = imageUrl;
  });
}
