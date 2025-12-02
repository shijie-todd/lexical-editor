/**
 * 图片上传工具方法
 */

/**
 * 将文件转换为 base64 格式
 * @param file - 要转换的文件
 * @returns Promise<string> - 返回 base64 格式的字符串（data URL）
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        resolve(result);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

