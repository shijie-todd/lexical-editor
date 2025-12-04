/**
 * 图片工具函数
 */

/**
 * 加载图片并获取其尺寸
 * @param src 图片 URL
 * @returns Promise<{ width: number; height: number }>
 */
export function loadImage(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${src}`));
    };
    img.src = src;
  });
}

/**
 * 计算图片的显示尺寸（保持宽高比，限制最大宽度）
 * @param naturalWidth 图片自然宽度
 * @param naturalHeight 图片自然高度
 * @param maxWidth 最大宽度限制
 * @returns { width: number; height: number }
 */
export function calculateImageSize(
  naturalWidth: number,
  naturalHeight: number,
  maxWidth: number = 500,
): { width: number; height: number } {
  // 如果图片宽度小于等于最大宽度，使用原始尺寸
  if (naturalWidth <= maxWidth) {
    return {
      width: naturalWidth,
      height: naturalHeight,
    };
  }

  // 按比例缩放
  const aspectRatio = naturalWidth / naturalHeight;
  const width = maxWidth;
  const height = Math.round(width / aspectRatio);

  return { width, height };
}

/**
 * 加载图片并计算显示尺寸
 * @param src 图片 URL
 * @param maxWidth 最大宽度限制
 * @returns Promise<{ width: number; height: number }>
 */
export async function loadImageAndCalculateSize(
  src: string,
  maxWidth: number = 500,
): Promise<{ width: number; height: number }> {
  const { width: naturalWidth, height: naturalHeight } = await loadImage(src);
  return calculateImageSize(naturalWidth, naturalHeight, maxWidth);
}

