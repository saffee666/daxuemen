---
title: Gurobi 学术许可证（求解器免费 / 商业版万美元级）
pillar: corporate
stage: [在校]
region: 国际
category: 软件与开发
auth_channel: [edu邮箱]
value_level: 学术 Named-User 许可证免费，功能与商业版一致、无模型规模限制（商业许可证为万美元级/年，官方未公开报价）
eligibility: 认可学位授予机构的在校学生、教师、职员，用学校邮箱注册学术账号；仅限教学、课程与学术研究等非商业用途
steps:
  - 在 portal.gurobi.com 用学校邮箱注册 Gurobi 学术账号
  - 官方下载中心下载 Gurobi Optimizer 并按 README 安装
  - 在用户门户申请免费 Academic Named-User License
  - 运行 grbgetkey 激活（需从本校学术网络发起）
  - 有效期最长一年，保持资格可在用户门户再次申请续期
materials: []
official_url: https://www.gurobi.com/academia/academic-program-and-licenses/
deadline_or_validity: 滚动有效；Named-User 许可证单次最长一年，符合资格可续
source_name: Gurobi 官方学术计划页（Always Free for Academics）
verified_date: '2026-10'
status: 有效
difficulty: 易
confidence: 高
risk_tags:
  - 需学籍认证（学校邮箱注册）
  - 激活需校园学术网络
  - 仅限非商业用途
price_history:
  - date: '2026-10'
    price: 0
    months: 12
    note: 学术 Named-User 许可证免费，单次有效期最长一年
faq:
  - q: 国内高校邮箱能申请吗？
    a: 官方资格写的是「认可学位授予机构的师生」，未限定国家；edu.cn 邮箱可注册学术账号。注意首次激活（grbgetkey）需从本校学术网络发起，假期离校前先激活。
  - q: 到期后怎么办？
    a: 许可证单次最长一年；只要仍符合学术资格，回到用户门户重新申请即可，官方明说「按需多次单独申请」。
  - q: 能用来跑商业项目吗？
    a: 不能。官方明确学术许可证仅支持教学、课程作业和学术研究等非商业用途，商用需购买商业许可。
notes: 快报称商业许可证约 $12,000/年；官方页只写「Always Free for Academics」未公开商业报价，value_level 不采用该数字。官方另有「Take Gurobi With You」计划，应届毕业生可申请继续免费用，转正过渡期友好。另有 Web License Service（网页调用）与 Site License（校级部署）两种学术形态，个人走 Named-User。
stacking_tips: 运筹/供应链/机器学习课程作业直接用；和 MATLAB 优化工具箱、Python PuLP 搭配时，Gurobi 负责求解核心，论文里引用它是加分项。
---

工业级数学规划求解器的正确白嫖姿势：学校邮箱注册学术账号，Named-User 许可证功能与商业版完全一致，变量和约束数不设上限——这套东西企业买要万美元级一年。

避坑点：一是**首次激活必须连校园网**（grbgetkey 从学术网络 IP 发起），放假离校前把许可证激活好；二是**只能非商业用途**，接外包咨询别用它跑；三是许可证一年一续，到期前在用户门户再点一次申请就行，别等跑模型时才发现过期。
