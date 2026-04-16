import type { Environment } from "../../core/environment";
import type { Paint } from "../../core/paint";
import { unwrap, consume } from "../../core/paint";

export interface CorrectionBlurParams {
  amount: number;
}

export function correctionBlur(
  env: Environment,
  paint: Paint,
  params: CorrectionBlurParams,
): Paint {
  const { ctx, canvas } = unwrap(paint);
  const temp = env.createPaint();
  const tempInternal = unwrap(temp);

  tempInternal.ctx.filter = `blur(${params.amount}px)`;
  tempInternal.ctx.drawImage(canvas, 0, 0);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(tempInternal.canvas, 0, 0);

  consume(temp);
  return paint;
}
