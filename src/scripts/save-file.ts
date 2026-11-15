type SavePicker = (options: {
  suggestedName?: string;
  types?: { description?: string; accept: Record<string, string[]> }[];
}) => Promise<FileSystemFileHandle>;

export type SaveResult = 'saved' | 'downloaded' | 'aborted';

export async function saveBlob(
  blob: Blob,
  filename: string,
  description: string,
  mime: string,
  extension: string,
): Promise<SaveResult> {
  const picker = (window as Window & { showSaveFilePicker?: SavePicker })
    .showSaveFilePicker;
  if (picker) {
    try {
      const handle = await picker({
        suggestedName: filename,
        types: [{ description, accept: { [mime]: [extension] } }],
      });
      const writer = await handle.createWritable();
      await writer.write(blob);
      await writer.close();
      return 'saved';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'aborted';
      }
    }
  }
  downloadBlob(blob, filename);
  return 'downloaded';
}

export function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
