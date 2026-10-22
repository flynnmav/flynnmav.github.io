export interface Project {
  slug: string;
  name: string;
  summary: string;
  stack: string[];
  image: string;
  status: '研究主题' | '待完善' | '进行中' | '已完成';
  details: string;
  github?: string;
  demo?: string;
}
const topics = [
  [
    'uav-control',
    'UAV Autonomous Control',
    '从状态估计到闭环控制，探索无人机自主飞行系统。',
    ['PX4', 'ROS 2', 'C++'],
  ],
  [
    'multi-uav',
    'Multi-UAV Coordination',
    '探索多机任务分配、协同规划与安全约束。',
    ['Python', 'ROS 2'],
  ],
  [
    'trajectory-mpc',
    'Trajectory Planning and MPC',
    '将动力学、轨迹与约束纳入滚动优化。',
    ['Python', 'MATLAB', 'MPC'],
  ],
  [
    'simulation',
    'Robotics and Simulation',
    '以仿真搭建可复现的机器人学习与验证环境。',
    ['Gazebo', 'Docker', 'ROS 2'],
  ],
  [
    'rl',
    'Reinforcement Learning',
    '探索学习型决策与具身智能的交汇。',
    ['PyTorch', 'Python'],
  ],
] as const;
export const projects: Project[] = topics.map(
  ([slug, name, summary, stack]) => ({
    slug,
    name,
    summary,
    stack: [...stack],
    image: '/images/trajectory.svg',
    status: '研究主题',
    details:
      '当前条目用于介绍关注的研究方向，尚未提供可核实的项目实现、实验数据或开源代码。具体目标、方法与资源将在确认后补充。',
  }),
);
