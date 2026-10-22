---
title: "无人机轨迹规划与模型预测控制（MPC）学习笔记"
description: "从离散模型、预测时域、代价函数与约束出发，梳理无人机轨迹规划中模型预测控制的基本框架及其与 PX4 的关系。"
pubDate: 2026-10-22
category: "Control"
tags: ["MPC", "UAV", "Trajectory Planning", "PX4", "学习笔记"]
draft: false
---

> 本文是一篇学习笔记，用来整理模型预测控制的基本概念与建模方法。文中的代码只演示预测模型的构造，并不是可直接上机的完整控制器；本文也不包含实验结果或性能结论。

模型预测控制（Model Predictive Control, MPC）把“预测未来”和“在线优化”放在同一个反馈回路中。它尤其适合无人机轨迹跟踪：系统状态和输入存在明确限制，而飞行器又需要不断根据最新状态修正未来动作。

![二维轨迹、预测时域与滚动优化示意图](/images/trajectory.svg)

## 1. MPC 的基本思想

在时刻 $k$，控制器读取当前状态 $x_k$，用系统模型预测未来若干步的状态，然后求解一个有限时域优化问题。优化器给出一串候选控制量

$$
U_k^\star = \{u_{k|k}^\star,u_{k+1|k}^\star,\ldots,u_{k+N_c-1|k}^\star\}.
$$

控制器只执行第一项 $u_{k|k}^\star$。到下一个采样时刻，它读取新状态并重新求解。这个闭环过程使预测能够持续吸收状态估计误差和外部扰动的影响。

## 2. 离散状态空间模型

从连续时间线性模型开始：

$$
\dot{x}(t)=A_cx(t)+B_cu(t), \qquad y(t)=C_cx(t)+D_cu(t).
$$

给定采样周期 $T_s$，离散模型可写成

$$
x_{k+1}=Ax_k+Bu_k, \qquad y_k=Cx_k+Du_k.
$$

在零阶保持假设下，精确离散化满足 $A=e^{A_cT_s}$，且

$$
B=\int_0^{T_s}e^{A_c\tau}B_c\,\mathrm d\tau.
$$

对无人机而言，状态可以包含位置、速度、姿态和角速度；输入可以是期望加速度、推力或力矩。具体选择取决于 MPC 位于控制栈的哪一层。若在工作点附近线性化非线性动力学，必须记住模型只在相应范围内近似有效。

下面的 Python 片段用一个二维双积分器展示离散模型与预测矩阵。它没有优化求解、约束处理、状态估计或飞控接口，因此不是完整 MPC 实现。

```python
import numpy as np

dt = 0.1

# x = [px, py, vx, vy]，u = [ax, ay]
A = np.array([
    [1.0, 0.0, dt,  0.0],
    [0.0, 1.0, 0.0, dt ],
    [0.0, 0.0, 1.0, 0.0],
    [0.0, 0.0, 0.0, 1.0],
])
B = np.array([
    [0.5 * dt**2, 0.0],
    [0.0, 0.5 * dt**2],
    [dt, 0.0],
    [0.0, dt],
])


def prediction_matrices(A, B, horizon):
    """构造 X = Phi @ x0 + Gamma @ U。"""
    nx, nu = B.shape
    phi = np.zeros((horizon * nx, nx))
    gamma = np.zeros((horizon * nx, horizon * nu))

    for i in range(horizon):
        phi[i * nx:(i + 1) * nx] = np.linalg.matrix_power(A, i + 1)
        for j in range(i + 1):
            gamma[
                i * nx:(i + 1) * nx,
                j * nu:(j + 1) * nu,
            ] = np.linalg.matrix_power(A, i - j) @ B

    return phi, gamma


Phi, Gamma = prediction_matrices(A, B, horizon=20)
```

## 3. 预测时域与控制时域

预测时域 $N_p$ 决定控制器向前看多少步，覆盖的物理时间是 $N_pT_s$。较长的时域能够看到更远的参考轨迹与约束，但会增加计算量，也会放大模型长期预测误差的影响。

控制时域 $N_c$ 决定优化器独立选择多少个未来控制量，通常满足 $N_c\leq N_p$。当 $i\geq N_c$ 时，可以令后续输入保持为最后一个优化值：

$$
u_{k+i|k}=u_{k+N_c-1|k}.
$$

采样周期、预测时域和控制时域需要一起设计。仅增加步数不一定带来更好的实际效果，因为实时求解必须在下一次控制更新前完成。

## 4. 目标函数

一个常见的二次目标函数是

$$
J = \sum_{i=1}^{N_p}\left\|x_{k+i|k}-x_{k+i}^{\mathrm{ref}}\right\|_Q^2
+ \sum_{i=0}^{N_c-1}\left\|u_{k+i|k}\right\|_R^2
+ \left\|x_{k+N_p|k}-x_{k+N_p}^{\mathrm{ref}}\right\|_P^2,
$$

其中 $\|z\|_Q^2=z^\mathsf{T}Qz$。三部分分别衡量状态跟踪误差、控制消耗和终端误差。工程模型还常加入输入变化率 $\Delta u$ 的惩罚，以降低控制指令的突变：

$$
\sum_{i=0}^{N_c-1}\|u_{k+i|k}-u_{k+i-1|k}\|_S^2.
$$

## 5. Q 和 R 权重矩阵的作用

$Q$ 决定不同状态误差的相对代价，通常要求 $Q\succeq0$；$R$ 决定控制输入的代价，通常取 $R\succ0$。例如，提高位置误差对应的权重会推动优化器更积极地跟踪位置，提高 $R$ 则倾向于使用更平缓、幅值更小的控制输入。

权重是不同目标之间的数值折中，并不代表某个单一物理性能指标。调参前应先统一变量尺度，或使用无量纲归一化，否则单位和数量级会主导优化结果。终端权重 $P$ 还可能与稳定性分析相关，不能总是简单地设为 $Q$。

## 6. 约束条件

MPC 的优势之一是把限制直接放进优化问题。例如：

$$
x_{\min}\leq x_{k+i|k}\leq x_{\max},
$$

$$
u_{\min}\leq u_{k+i|k}\leq u_{\max},
$$

$$
\Delta u_{\min}\leq u_{k+i|k}-u_{k+i-1|k}\leq\Delta u_{\max}.
$$

无人机中的约束可能对应速度、倾角、推力、角速度、安全区域或障碍物边界。硬约束必须满足，但可能使优化问题不可行；软约束通过松弛变量允许有限违反，并对松弛量施加高代价。安全关键约束如何软化需要谨慎设计，不能只依靠增大惩罚系数。

## 7. 滚动优化

滚动时域控制的流程可以概括为：

1. 从状态估计器取得 $x_k$。
2. 更新参考轨迹和随时间变化的约束。
3. 在预测模型约束下求解有限时域优化问题。
4. 应用最优序列的第一个控制量。
5. 令 $k\leftarrow k+1$，重复以上步骤。

实际系统还要处理求解超时、不可行、状态估计失效和通信中断。常见保护包括保留上一可用控制量、设置安全回退控制器、限制求解迭代次数，以及记录求解状态供飞行管理逻辑判断。

## 8. MPC 与 PX4 的关系

“MPC”在 PX4 语境中容易产生歧义。PX4 中模块名 `mc_pos_control` 的核心位置控制器在参数和文档中常使用 `MPC_` 前缀；这里的 MPC 指 **Multicopter Position Control（多旋翼位置控制）**，并不自动等同于本文所说的 **Model Predictive Control（模型预测控制）**。

一种常见研究架构是让外部模型预测控制器根据轨迹和状态估计生成位置、速度、加速度、姿态或推力设定值，再通过 PX4 支持的接口送入飞控。PX4 继续负责状态估计、消息路由、模式管理，以及按接口层级运行位置、姿态或角速度等内环。若外部 MPC 直接输出更底层的量，就必须承担更多动力学、执行器限制和失效保护责任。

因此，“MPC 与 PX4 集成”不是单一结构。需要先明确控制器输出层级、坐标系、单位、时间戳、更新频率，以及失联时的安全行为。可参考 PX4 官方的[控制器结构图](https://docs.px4.io/main/en/flight_stack/controller_diagrams.html)与[外部控制模式说明](https://docs.px4.io/main/en/flight_modes/offboard.html)。

## 9. 后续学习方向

- 从线性二次规划扩展到非线性 MPC，比较实时迭代和序列二次规划等方法。
- 研究终端代价、终端约束与递归可行性、闭环稳定性的关系。
- 学习障碍物规避中的凸化、走廊约束和安全滤波方法。
- 评估模型失配、状态估计延迟和风扰动对预测的影响。
- 在 Gazebo 或其他仿真环境中建立软件在环测试，并覆盖超时与不可行等故障路径。
- 明确 ROS 2、MAVLink 或 uXRCE-DDS 接口中的坐标系和消息时序，再考虑真实飞行测试。

## 参考资料

- [PX4：控制器结构图](https://docs.px4.io/main/en/flight_stack/controller_diagrams.html)
- [PX4：Offboard 模式](https://docs.px4.io/main/en/flight_modes/offboard.html)
- [OSQP：MPC 示例](https://osqp.org/docs/examples/mpc.html)
- [CVXPY：控制问题示例](https://www.cvxpy.org/examples/index.html#control-problems)

