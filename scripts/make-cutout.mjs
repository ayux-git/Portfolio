// Cuts the figure out of the hero avatar (background removal, runs locally via ONNX).
// Usage: npm run cutout                -> assets-src/avatar-hero.png  ->  assets-src/hero-alpha.png
//        npm run cutout -- in.png out.png
// The alpha matte is combined with the image by `npm run assets` into public/hero-figure.webp.
import { AutoModel, AutoProcessor, RawImage } from '@huggingface/transformers';
import sharp from 'sharp';

const input = process.argv[2] ?? 'assets-src/avatar-hero.png';
const out = process.argv[3] ?? 'assets-src/hero-alpha.png';

// MODNet (Apache-2.0) portrait matting; good on illustrated people too.
const model = await AutoModel.from_pretrained('Xenova/modnet', { dtype: 'fp32' });
const processor = await AutoProcessor.from_pretrained('Xenova/modnet');
const image = await RawImage.read(input);
const { pixel_values } = await processor(image);
const { output } = await model({ input: pixel_values });
const matte = await RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(image.width, image.height);
await sharp(Buffer.from(matte.data), { raw: { width: matte.width, height: matte.height, channels: 1 } }).png().toFile(out);
console.log(`alpha matte written to ${out} (${matte.width}x${matte.height})`);
