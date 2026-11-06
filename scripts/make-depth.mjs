// Generates public/hero-depth.png from the hero source image with Depth Anything (runs locally via ONNX).
// Usage: npm run depth                 -> uses assets-src/avatar-hero.png
//        npm run depth -- path/to/frame.png   (e.g. the poster/first frame of hero-loop.mp4)
import { pipeline, RawImage } from '@huggingface/transformers';
import sharp from 'sharp';

const input = process.argv[2] ?? 'assets-src/avatar-hero.png';
const out = process.argv[3] ?? 'public/hero-depth.png';

const estimator = await pipeline('depth-estimation', 'onnx-community/depth-anything-v2-small', { dtype: 'fp32' });
const meta = await sharp(input).metadata();
const image = await RawImage.read(input);
const { depth } = await estimator(image);

// depth is a single-channel RawImage (near = bright). Resize back to the source aspect, soften edges a little.
const raw = Buffer.from(depth.data);
await sharp(raw, { raw: { width: depth.width, height: depth.height, channels: 1 } })
  .resize(Math.round(768), Math.round((768 * meta.height) / meta.width), { fit: 'fill' })
  .blur(1.2)
  .normalise()
  .png()
  .toFile(out);
console.log(`depth map written to ${out} (${depth.width}x${depth.height} model output)`);
