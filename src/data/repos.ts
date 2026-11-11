// 公开仓库的 language / stars 是 2026-11-11 的 GitHub 快照。
// 私有仓库在此环境无法读取内容，简介只复述所有者给出的主题，不写实验结果。

export const githubProfile = 'https://github.com/flynnmav';

interface RepoBase {
  name: string;
  summary: string;
  tags: string[];
}

export interface PublicRepo extends RepoBase {
  private: false;
  href: string;
  language: string;
  stars: number;
  extra?: { label: string; href: string };
}

export interface PrivateRepo extends RepoBase {
  private: true;
}

export type CodeRepo = PublicRepo | PrivateRepo;

export interface CodeGroup {
  id: string;
  kicker: string;
  title: string;
  repos: CodeRepo[];
}

const pub = (
  name: string,
  language: string,
  stars: number,
  summary: string,
  tags: string[],
  extra?: PublicRepo['extra'],
): PublicRepo => ({
  name,
  private: false,
  href: `${githubProfile}/${name}`,
  language,
  stars,
  summary,
  tags,
  ...(extra ? { extra } : {}),
});

const priv = (name: string, summary: string, tags: string[]): PrivateRepo => ({
  name,
  private: true,
  summary,
  tags,
});

export const codeGroups: CodeGroup[] = [
  {
    id: 'flight',
    kicker: 'FLIGHT & CONTROL',
    title: '飞行与控制研究',
    repos: [
      priv(
        'adaptive-safety-flight',
        '面向四旋翼的不确定性自适应安全滤波，并包含校准。',
        ['四旋翼', '安全滤波'],
      ),
      pub(
        'flightvla-guard',
        'Python',
        1,
        '让 VLA / VLM / LLM 飞行代理只提交短时动作块，由安全网关校验、修正或拒绝后再按 PX4 offboard 约定下发。仓库带简化仿真和冒烟测试；README 说明内置物理不是 Gazebo 或 PX4 SITL。',
        ['Python', 'PX4'],
      ),
      priv(
        'beetle-omni-isaac',
        '在 Isaac 中做全向无人机的强化学习控制，并包含其他控制方法。',
        ['Isaac', '强化学习', '全向无人机'],
      ),
      priv('omni_intercept', '全向无人机拦截相关的工作。', [
        '全向无人机',
        '拦截',
      ]),
      priv('omini_quadrone', '描述全向四旋翼控制的数学工具。', ['全向四旋翼']),
      priv(
        'tilt-quadrotor-wrench',
        '独立可倾转四旋翼的前向力旋量映射与测试。',
        ['可倾转四旋翼', '力旋量'],
      ),
      priv(
        'Reinforcement-Learning-based-UAV-Formation-Control',
        '基于强化学习的无人机编队控制。',
        ['强化学习', '编队'],
      ),
      priv('Interceptor_gazebo-sim-', '用 C++ 编写的拦截机 Gazebo 仿真。', [
        'C++',
        'Gazebo',
      ]),
      priv('ppo', '近端策略优化（PPO）的一份实现。', ['PPO']),
      pub(
        'gc-lit-review',
        'HTML',
        1,
        '多智能体协同制导、微分博弈与强化学习的文献综述站，含 17 篇论文的结构化精读、五维对比和 12 条研究空白。静态页由 Python 脚本从笔记生成。',
        ['HTML', 'Python'],
        {
          label: '综述站点',
          href: 'https://flynnmav.github.io/gc-lit-review/',
        },
      ),
      pub(
        'robot-arm-control',
        'C++',
        0,
        '机械臂运动控制库，包含正逆运动学、动力学、轨迹规划，以及 MuJoCo 集成和 Qt 上位机。示例附有 6 轴工业臂模型。',
        ['C++', 'MuJoCo', 'Qt'],
      ),
    ],
  },
  {
    id: 'vision',
    kicker: 'VISION',
    title: '视觉与感知',
    repos: [
      pub(
        'realsense-d435i-distance',
        'Python',
        0,
        '读取 Intel RealSense D435i 的彩色与深度画面，点击像素后用相机内参反投影成欧氏距离，并可导出 CSV 或 JSONL。带有不连接相机也能运行的测试。',
        ['Python', 'RealSense', 'OpenCV'],
      ),
      priv('vision_yolov10', '基于 YOLOv10 的视觉相关代码。', ['YOLOv10']),
    ],
  },
  {
    id: 'tools',
    kicker: 'TOOLS',
    title: '工具',
    repos: [
      pub(
        'dsh-paper-reader',
        'JavaScript',
        0,
        'DSH 侧栏里的 PDF 阅读插件：把选中的段落或图表发给当前对话，讨论结束后可以插入阅读笔记草稿。',
        ['JavaScript', 'TypeScript', 'pdf.js'],
      ),
      priv(
        'bambu-fleet-console',
        '用 TypeScript 编写的局域网控制台，用来统一管理两台拓竹（Bambu Lab）打印机。',
        ['TypeScript', 'Bambu Lab'],
      ),
      pub(
        'daily-log',
        'Shell',
        0,
        '按日期存放的开发笔记。README 写明由本机定时任务自动写入并推送，是公开的自动打卡，不代表当天有手动编码。',
        ['Shell'],
      ),
      pub(
        'machine_learning',
        'Python',
        0,
        '图像与机器学习练习：混合图像、局部特征点匹配，以及用视觉词袋和预训练 ResNet-50 特征训练 SVM。',
        ['Python', 'PyTorch', 'OpenCV'],
      ),
    ],
  },
];
