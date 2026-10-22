export const site = {
  name: 'Leyan Liu',
  title: 'Leyan Liu · 自主系统与机器人',
  url: 'https://leyanliu.com',
  locale: 'zh-CN',
  description:
    'Leyan Liu 的个人学术主页与科研学习笔记，关注无人机自主系统、机器人学、轨迹规划与智能控制。',
  // 仅填写本人确认并愿意公开的信息；空值不生成链接。
  email: '',
  github: '',
  scholar: '',
  avatar: '',
  education: [] as string[],
  interests: [
    '无人机自主系统',
    '机器人学',
    '智能控制',
    '轨迹规划',
    '多无人机协同',
    '强化学习',
    '人工智能与具身智能',
  ],
  technologies: [
    'ROS 2',
    'PX4',
    'Gazebo',
    'Python',
    'C++',
    'PyTorch',
    'MATLAB',
    'Docker',
  ],
};
export const navigation = [
  ['/', '首页'],
  ['/about/', '关于'],
  ['/projects/', '研究项目'],
  ['/blog/', '博客'],
  ['/publications/', '论文'],
];
export const categories = [
  'UAV',
  'Robotics',
  'Control',
  'Reinforcement Learning',
  'Deep Learning',
  'Research Notes',
  'Engineering',
];
export const i18n = {
  zh: { home: '首页', blog: '博客' },
  en: { home: 'Home', blog: 'Blog' },
};
