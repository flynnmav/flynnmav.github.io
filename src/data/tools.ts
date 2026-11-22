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
  {
    slug: 'px4-log-viewer',
    name: 'PX4 日志查看器',
    summary:
      '在浏览器里打开 .ulg 飞行日志，按 topic 选择字段并绘制曲线，可缩放和平移。',
  },
  {
    slug: 'pid-simulator',
    name: 'PID 阶跃响应模拟器',
    summary:
      '调节 Kp、Ki、Kd，实时看一阶、二阶或带延迟对象的阶跃响应和超调、上升时间等指标。',
  },
  {
    slug: 'coord-convert',
    name: '坐标与姿态换算',
    summary:
      '经纬高、ECEF、NED/ENU 互转，以及四元数、ZYX 欧拉角和旋转矩阵互转。',
  },
  {
    slug: 'image-compress',
    name: '图片压缩与格式转换',
    summary:
      'PNG、JPG、WebP 互转，调整质量和尺寸，可批量处理并对比压缩前后大小。',
  },
  {
    slug: 'video-trim',
    name: '视频裁剪与压缩',
    summary: '截取起止时间、去掉音轨、降低分辨率和码率，在本地导出 WebM。',
  },
];
