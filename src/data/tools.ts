export interface Tool {
  slug: string;
  name: string;
  summary: string;
}
// 索引只读这个数组。新工具加一条，并在 src/pages/tools/ 下放同名页面。
export const tools: Tool[] = [
  {
    slug: 'video-to-gif',
    name: '视频转 GIF',
    summary: '在本地把视频片段转成 GIF，可调整起止时间、帧率、宽度和播放速度。',
  },
];
