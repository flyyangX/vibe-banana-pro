<div align="center">

<img width="256" src="https://github.com/user-attachments/assets/6f9e4cf9-912d-4faa-9d37-54fb676f547e">

*Vibe your slides like vibing code.*

**中文**

<p>

[![GitHub Stars](https://img.shields.io/github/stars/flyyangX/vibe-banana-pro?style=square)](https://github.com/flyyangX/vibe-banana-pro/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/flyyangX/vibe-banana-pro?style=square)](https://github.com/flyyangX/vibe-banana-pro/network)
[![GitHub Watchers](https://img.shields.io/github/watchers/flyyangX/vibe-banana-pro?style=square)](https://github.com/flyyangX/vibe-banana-pro/watchers)

[![Version](https://img.shields.io/badge/version-dev-4CAF50.svg)](https://github.com/flyyangX/vibe-banana-pro)
![Docker](https://img.shields.io/badge/Docker-Build-2496ED?logo=docker&logoColor=white)
[![GitHub issues](https://img.shields.io/github/issues-raw/flyyangX/vibe-banana-pro)](https://github.com/flyyangX/vibe-banana-pro/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr-raw/flyyangX/vibe-banana-pro)](https://github.com/flyyangX/vibe-banana-pro/pulls)


</p> 

<b>vibe-banana-pro：一个基于 nano banana🍌 的“多风格”AI PPT 生成应用。<br></b>
<b>支持无模板生成（自动选风格并保持一致）、模板/风格描述混合控制、素材增强与自然语言迭代。</b>

<b>🎯 降低PPT制作门槛，让每个人都能快速创作出美观专业的演示文稿</b>

<br>

*如果该项目对你有用, 欢迎 star🌟 & fork🍴*

<br>

</p>

</div>

## 📌 派生说明 / Attribution
本项目为二次开发版，基于开源项目 [`Anionex/banana-slides`](https://github.com/Anionex/banana-slides) 演进而来。

- **上游项目**：提供了完整的 AI PPT 生成基础能力（解析/生成/导出/编辑等）。
- **本项目定位**：面向“风格化/内容分发”的长期演进版本，围绕“无模板自动风格 + 可扩展风格包（如小红书风格）”做产品化增强。
- **许可证与署名**：请遵循仓库内 `LICENSE` 的条款（包括署名、使用限制、再分发要求等）。

## ✨ 我的心得（这次改造为什么这样做）
- **模板选择是摩擦点**：很多用户并不想先“挑模板”，而是希望先把内容跑通；所以更合理的默认是“能生成”，模板作为增强项。
- **风格一致性必须落在项目级**：只在单页 prompt 里写“保持一致”不够稳定；更可靠的是生成一次 `template_style` 并写入项目，后续复用。
- **交互反馈比算法更能提升体验**：无模板模式下生成前置步骤更重（例如生成风格/提示词），如果没有即时反馈，用户会反复点按钮导致重复任务。
- **“风格包”是可持续方向**：小红书风格、本地化社媒风、信息卡片风、极简学术风……都可以抽象为可复用的风格描述模板 + 少量参数。


## ✨ 项目缘起
你是否也曾陷入这样的困境：明天就要汇报，但PPT还是一片空白；脑中有无数精彩的想法，却被繁琐的排版和设计消磨掉所有热情？

我(们)渴望能快速创作出既专业又具设计感的演示文稿，传统的AI PPT生成app，虽然大体满足“快”这一需求，却还存在以下问题：

- 1️⃣只能选择预设模版，无法灵活调整风格
- 2️⃣自由度低，多轮改动难以进行 
- 3️⃣成品观感相似，同质化严重
- 4️⃣素材质量较低，缺乏针对性
- 5️⃣图文排版割裂，设计感差

以上这些缺陷，让传统的AI ppt生成器难以同时满足我们“快”和“美”的两大PPT制作需求。即使自称Vibe PPT，但是在我的眼中还远不够“Vibe”。

但是，nano banana🍌模型的出现让一切有了转机。我尝试使用🍌pro进行ppt页面生成，发现生成的结果无论是质量、美感还是一致性，都做的非常好，且几乎能精确渲染prompt要求的所有文字+遵循参考图的风格。那为什么不基于🍌pro，做一个原生的"Vibe PPT"应用呢？

## 👨‍💻 适用场景

1. **小白**：零门槛快速生成美观PPT，无需设计经验，减少模板选择烦恼
2. **PPT专业人士**：参考AI生成的布局和图文元素组合，快速获取设计灵感
3. **教育工作者**：将教学内容快速转换为配图教案PPT，提升课堂效果
4. **学生**：快速完成作业Pre，把精力专注于内容而非排版美化
5. **职场人士**：商业提案、产品介绍快速可视化，多场景快速适配


## 🎨 结果案例


<div align="center">

| | |
|:---:|:---:|
| <img src="https://github.com/user-attachments/assets/d58ce3f7-bcec-451d-a3b9-ca3c16223644" width="500" alt="案例3"> | <img src="https://github.com/user-attachments/assets/c64cd952-2cdf-4a92-8c34-0322cbf3de4e" width="500" alt="案例2"> |
| **软件开发最佳实践** | **DeepSeek-V3.2技术展示** |
| <img src="https://github.com/user-attachments/assets/383eb011-a167-4343-99eb-e1d0568830c7" width="500" alt="案例4"> | <img src="https://github.com/user-attachments/assets/1a63afc9-ad05-4755-8480-fc4aa64987f1" width="500" alt="案例1"> |
| **预制菜智能产线装备研发和产业化** | **钱的演变：从贝壳到纸币的旅程** |

</div>

更多案例可在上游项目中查看：<a href="https://github.com/Anionex/banana-slides/issues/2" > 使用案例（上游） </a>


## 🎯 功能介绍

### 1. 灵活多样的创作路径
支持**想法**、**大纲**、**页面描述**三种起步方式，满足不同创作习惯。
- **一句话生成**：输入一个主题，AI 自动生成结构清晰的大纲和逐页内容描述。
- **自然语言编辑**：支持以 Vibe 形式口头修改大纲或描述（如"把第三页改成案例分析"），AI 实时响应调整。
- **大纲/描述模式**：既可一键批量生成，也可手动调整细节。

<img width="2000" height="1125" alt="image" src="https://github.com/user-attachments/assets/7fc1ecc6-433d-4157-b4ca-95fcebac66ba" />


### 2. 强大的素材解析能力
- **多格式支持**：上传 PDF/Docx/MD/Txt 等文件，后台自动解析内容。
- **智能提取**：自动识别文本中的关键点、图片链接和图表信息，为生成提供丰富素材。
- **风格参考**：支持上传参考图片或模板，定制 PPT 风格。

<img width="1920" height="1080" alt="文件解析与素材处理" src="https://github.com/user-attachments/assets/8cda1fd2-2369-4028-b310-ea6604183936" />

### 3. "Vibe" 式自然语言修改
不再受限于复杂的菜单按钮，直接通过**自然语言**下达修改指令。
- **局部重绘**：对不满意的区域进行口头式修改（如"把这个图换成饼图"）。
- **整页优化**：基于 nano banana pro🍌 生成高清、风格统一的页面。

<img width="2000" height="1125" alt="image" src="https://github.com/user-attachments/assets/929ba24a-996c-4f6d-9ec6-818be6b08ea3" />


### 4. 开箱即用的格式导出
- **多格式支持**：一键导出标准 **PPTX** 或 **PDF** 文件。
- **完美适配**：默认 16:9 比例，排版无需二次调整，直接演示。

<img width="1000" alt="image" src="https://github.com/user-attachments/assets/3e54bbba-88be-4f69-90a1-02e875c25420" />
<img width="1748" height="538" alt="PPT与PDF导出" src="https://github.com/user-attachments/assets/647eb9b1-d0b6-42cb-a898-378ebe06c984" />

### 5. 可自由编辑的pptx导出（Beta迭代中）
- **导出图像为高还原度、背景干净的、可自由编辑图像和文字的PPT页面**
- 相关更新见（上游）：https://github.com/Anionex/banana-slides/issues/121
<img width="1000"  alt="image" src="https://github.com/user-attachments/assets/a85d2d48-1966-4800-a4bf-73d17f914062" />

<br>

**🌟和notebooklm slide deck功能对比**
| 功能 | notebooklm | 本项目 | 
| --- | --- | --- |
| 页数上限 | 15页 | **无限制** | 
| 二次编辑 | 不支持 | **框选编辑+口头编辑** |
| 素材添加 | 生成后无法添加 | **生成后自由添加** |
| 导出格式 | 仅支持导出为 PDF | **导出为PDF、(可编辑)pptx** |
| 水印 | 免费版有水印 | **无水印，自由增删元素** |

> 注：随着新功能添加,对比可能过时



## 🔥 近期更新
- 【2026-01-22】无模板模式与模板管理优化：
  * 生成 PPT 图片不再强制选择模板：无模板资源时可直接生成，并自动生成/锁定 `template_style` 保持全局风格一致
  * “更换模板”里支持**取消当前模板**，一键切换到无模板模式
  * 优化“更换模板”弹窗：内容区可滚动、底部操作区固定可见，避免按钮被遮挡
  * 优化“重新生成本页”交互：点击后即时提示并防重复提交，避免用户误以为未触发
- 【1-4】 : v0.3.0发布：可编辑pptx导出全面升级：
  * 支持最大程度还原图片中文字的字号、颜色、加粗等样式；
  * 支持了识别表格中的文字内容；
  * 更精确的文字大小和文字位置还原逻辑
  * 优化导出工作流，大大减少了导出后背景图残留文字的现象；
  * 支持页面多选逻辑，灵活选择需要生成和导出的具体页面。
  * **详细效果和使用方法见 https://github.com/Anionex/banana-slides/issues/121**

- 【12-27】: 加入了对无图片模板模式的支持和较高质量的文字预设，现在可以通过纯文字描述的方式来控制ppt页面风格
- 【12-24】: main分支加入了基于nano-banana-pro背景提取的可编辑pptx导出方法（目前Beta）


## 🗺️ 开发计划

| 状态 | 里程碑 |
| --- | --- |
| ✅ 已完成 | 从想法、大纲、页面描述三种路径创建 PPT |
| ✅ 已完成 | 解析文本中的 Markdown 格式图片 |
| ✅ 已完成 | PPT 单页添加更多素材 |
| ✅ 已完成 | PPT 单页框选区域Vibe口头编辑 |
| ✅ 已完成 | 素材模块: 素材生成、上传等 |
| ✅ 已完成 | 支持多种文件的上传+解析 |
| ✅ 已完成 | 支持Vibe口头调整大纲和描述 |
| ✅ 已完成 | 初步支持可编辑版本pptx文件导出 |
| 🔄 进行中 | 支持多层次、精确抠图的可编辑pptx导出 |
| 🔄 进行中 | 网络搜索 |
| 🔄 进行中 | Agent 模式 |
| 🧭 规划中 | 风格包（Style Packs）：小红书风格/信息卡片风/学术报告风/品牌风格等 |
| 🧭 规划中 | 风格包管理：预览、版本、导入导出、项目级锁定与复用 |
| 🧭 规划中 | 优化前端加载速度与生成反馈（避免重复提交、任务队列可视化） |
| 🧭 规划中 | 在线播放功能 |
| 🧭 规划中 | 简单的动画和页面切换效果 |
| 🧭 规划中 | 多语种支持 |
| 🧭 规划中 | 用户系统 |

## 📦 使用方法

### 使用 Docker Compose🐳（推荐）
这是最简单的部署方式，可以一键启动前后端服务。

<details>
  <summary>📒Windows用户说明</summary>

如果你使用 Windows, 请先安装 Windows Docker Desktop，检查系统托盘中的 Docker 图标，确保 Docker 正在运行，然后使用相同的步骤操作。

> **提示**：如果遇到问题，确保在 Docker Desktop 设置中启用了 WSL 2 后端（推荐），并确保端口 3000 和 5000 未被占用。

</details>

0. **克隆代码仓库**
```bash
git clone https://github.com/flyyangX/vibe-banana-pro
cd vibe-banana-pro
```

1. **配置环境变量**

创建 `.env` 文件（参考 `.env.example`）：
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置必要的环境变量：
> 提示：项目支持多种兼容的模型接口配置（Gemini/OpenAI/Vertex 等），你可以按自己的 API 服务商填写 `.env`。
```env
# AI Provider格式配置 (gemini / openai / vertex)
AI_PROVIDER_FORMAT=gemini

# Gemini 格式配置（当 AI_PROVIDER_FORMAT=gemini 时使用）
GOOGLE_API_KEY=your-api-key-here
GOOGLE_API_BASE=https://generativelanguage.googleapis.com
# 代理示例: https://aihubmix.com/gemini

# OpenAI 格式配置（当 AI_PROVIDER_FORMAT=openai 时使用）
OPENAI_API_KEY=your-api-key-here
OPENAI_API_BASE=https://api.openai.com/v1
# 代理示例: https://aihubmix.com/v1

# Vertex AI 格式配置（当 AI_PROVIDER_FORMAT=vertex 时使用）
# 需要 GCP 服务账户，可使用 GCP 免费额度
# VERTEX_PROJECT_ID=your-gcp-project-id
# VERTEX_LOCATION=global
# GOOGLE_APPLICATION_CREDENTIALS=./gcp-service-account.json
...
```

<details>
  <summary>📒 使用 GRSAI（nano-banana 专用接口说明）</summary>

当你在使用 GRSAI 的 nano-banana 系列能力时，接口行为和原生 Gemini/OpenAI 有一些差异（本项目已做了自动兼容）：

- **图片生成**：当 `GOOGLE_API_BASE` 包含 `grsai` 且 `IMAGE_MODEL` 为 `nano-banana*` 时，会自动走 GRSAI 专用接口 `POST /v1/draw/nano-banana`，并轮询 `POST /v1/draw/result` 获取最终图片（不是原生 Gemini/OpenAI 的图片接口）。
- **文本生成**：GRSAI 的 Gemini 代理在部分场景下返回结构与官方 SDK 不完全一致，因此当检测到 `GOOGLE_API_BASE` 包含 `grsai` 时，会自动切换为 OpenAI Chat API 方式调用（`/v1/chat/completions`）。

推荐 `.env` 配置示例：

```env
AI_PROVIDER_FORMAT=gemini
GOOGLE_API_KEY=your-grsai-api-key-here
# 关键：填“域名根”，不要带 /v1 或 /v1beta（否则图片接口会变成 /v1/v1/draw/...）
GOOGLE_API_BASE=https://grsai.dakka.com.cn

# 选择 nano-banana 系列图片模型（触发 GRSAI 专用 draw 接口）
IMAGE_MODEL=nano-banana-pro-cl

# 如你的 GRSAI 文本模型名不同，可在这里调整（或在网页「设置」页调整）
# TEXT_MODEL=...
```

支持的 `IMAGE_MODEL`（nano-banana）示例：`nano-banana-fast`、`nano-banana`、`nano-banana-pro`、`nano-banana-pro-vt`、`nano-banana-pro-cl`、`nano-banana-pro-vip`、`nano-banana-pro-4k-vip`。
</details>

**使用新版可编辑导出配置方法，获得更好的可编辑导出效果**: 需在[百度智能云平台](https://console.bce.baidu.com/iam/#/iam/apikey/list)中获取API KEY，填写在.env文件中的BAIDU_OCR_API_KEY字段（有充足的免费使用额度）。详见https://github.com/Anionex/banana-slides/issues/121 中的说明


<details>
  <summary>📒 使用 Vertex AI（GCP 免费额度）</summary>

如果你想使用 Google Cloud Vertex AI（可使用 GCP 新用户赠金），需要额外配置：

1. 在 [GCP Console](https://console.cloud.google.com/) 创建服务账户并下载 JSON 密钥文件
2. 将密钥文件重命名为 `gcp-service-account.json` 放在项目根目录
3. 编辑 `.env` 文件：
   ```env
   AI_PROVIDER_FORMAT=vertex
   VERTEX_PROJECT_ID=your-gcp-project-id
   VERTEX_LOCATION=global
   ```
4. 编辑 `docker-compose.yml`，取消以下注释：
   ```yaml
   # environment:
   #   - GOOGLE_APPLICATION_CREDENTIALS=/app/gcp-service-account.json
   # ...
   # - ./gcp-service-account.json:/app/gcp-service-account.json:ro
   ```

> **注意**：`gemini-3-*` 系列模型需要设置 `VERTEX_LOCATION=global`

</details>

2. **启动服务**

```bash
docker compose up -d
```
更新：项目也在dockerhub提供了构建好的前端和后端镜像（同步主分支最新版本），名字分别为：
1. anoinex/banana-slides-frontend
2. anoinex/banana-slides-backend


> [!TIP]
> 如遇网络问题，可在 `.env` 文件中取消镜像源配置的注释, 再重新运行启动命令：
> ```env
> # 在 .env 文件中取消以下注释即可使用国内镜像源
> DOCKER_REGISTRY=docker.1ms.run/
> GHCR_REGISTRY=ghcr.nju.edu.cn/
> APT_MIRROR=mirrors.aliyun.com
> PYPI_INDEX_URL=https://mirrors.cloud.tencent.com/pypi/simple
> NPM_REGISTRY=https://registry.npmmirror.com/
> ```


3. **访问应用**

- 前端：http://localhost:3000
- 后端 API：http://localhost:5000

4. **查看日志**

```bash
# 查看后端日志（实时查看最后50行）
sudo docker compose logs -f --tail 50 backend

# 查看所有服务日志（后200行）
sudo docker compose logs -f --tail 200

# 查看前端日志
sudo docker compose logs -f --tail 50 frontend
```

5. **停止服务**

```bash
docker compose down
```

6. **更新项目**

拉取最新代码并重新构建和启动服务：

```bash
git pull
docker compose down
docker compose build --no-cache
docker compose up -d
```

**注：感谢优秀开发者朋友 [@ShellMonster](https://github.com/ShellMonster/) 提供了[新人部署教程](https://github.com/ShellMonster/banana-slides/blob/docs-deploy-tutorial/docs/NEWBIE_DEPLOYMENT.md)，专为没有任何服务器部署经验的新手设计，可[点击链接](https://github.com/ShellMonster/banana-slides/blob/docs-deploy-tutorial/docs/NEWBIE_DEPLOYMENT.md)查看。**

### 从源码部署

#### 环境要求
- Python 3.10 或更高版本
- [uv](https://github.com/astral-sh/uv) - Python 包管理器
- Node.js 16+ 和 npm
- 有效的 Google Gemini API 密钥

#### 后端安装

0. **克隆代码仓库**
```bash
git clone https://github.com/flyyangX/vibe-banana-pro
cd vibe-banana-pro
```

1. **安装 uv（如果尚未安装）**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

2. **安装依赖**

在项目根目录下运行：
```bash
uv sync
```

这将根据 `pyproject.toml` 自动安装所有依赖。

3. **配置环境变量**

复制环境变量模板：
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置你的 API 密钥：
> 提示：项目支持多种兼容的模型接口配置（Gemini/OpenAI/Vertex 等），你可以按自己的 API 服务商填写 `.env`。
```env
# AI Provider格式配置 (gemini / openai / vertex)
AI_PROVIDER_FORMAT=gemini

# Gemini 格式配置（当 AI_PROVIDER_FORMAT=gemini 时使用）
GOOGLE_API_KEY=your-api-key-here
GOOGLE_API_BASE=https://generativelanguage.googleapis.com
# 代理示例: https://aihubmix.com/gemini

# OpenAI 格式配置（当 AI_PROVIDER_FORMAT=openai 时使用）
OPENAI_API_KEY=your-api-key-here
OPENAI_API_BASE=https://api.openai.com/v1
# 代理示例: https://aihubmix.com/v1

# Vertex AI 格式配置（当 AI_PROVIDER_FORMAT=vertex 时使用）
# 需要 GCP 服务账户，可使用 GCP 免费额度
# VERTEX_PROJECT_ID=your-gcp-project-id
# VERTEX_LOCATION=global
# GOOGLE_APPLICATION_CREDENTIALS=./gcp-service-account.json

BACKEND_PORT=5000
...
```

#### 前端安装

1. **进入前端目录**
```bash
cd frontend
```

2. **安装依赖**
```bash
npm install
```

3. **配置API地址**

前端会自动连接到 `http://localhost:5000` 的后端服务。如需修改，请编辑 `src/api/client.ts`。


#### 启动后端服务
> （可选）如果本地已有重要数据，升级前建议先备份数据库：  
> `cp backend/instance/database.db backend/instance/database.db.bak`

```bash
cd backend
uv run alembic upgrade head && uv run python app.py
```

后端服务将在 `http://localhost:5000` 启动。

访问 `http://localhost:5000/health` 验证服务是否正常运行。

#### 启动前端开发服务器

```bash
cd frontend
npm run dev
```

前端开发服务器将在 `http://localhost:3000` 启动。

打开浏览器访问即可使用应用。


## 🛠️ 技术架构

### 前端技术栈
- **框架**：React 18 + TypeScript
- **构建工具**：Vite 5
- **状态管理**：Zustand
- **路由**：React Router v6
- **UI组件**：Tailwind CSS
- **拖拽功能**：@dnd-kit
- **图标**：Lucide React
- **HTTP客户端**：Axios

### 后端技术栈
- **语言**：Python 3.10+
- **框架**：Flask 3.0
- **包管理**：uv
- **数据库**：SQLite + Flask-SQLAlchemy
- **AI能力**：Google Gemini API
- **PPT处理**：python-pptx
- **图片处理**：Pillow
- **并发处理**：ThreadPoolExecutor
- **跨域支持**：Flask-CORS

## 📁 项目结构

> 💡 **详细架构文档**：查看 [`docs/structure.md`](./docs/structure.md) 了解完整的模块说明与依赖关系

```
banana-slides/
├── frontend/                       # React 前端应用
│   └── src/
│       ├── api/                    # API 层（按功能模块化）
│       │   ├── client.ts           # Axios 客户端
│       │   ├── project.ts          # 项目 API
│       │   ├── material.ts         # 素材 API
│       │   ├── export.ts           # 导出 API
│       │   ├── generation.ts       # 生成 API
│       │   └── ...
│       │
│       ├── pages/                  # 页面模块（按功能拆分）
│       │   ├── Home/               # 首页
│       │   │   ├── components/     # 页面专用组件
│       │   │   ├── hooks/          # 页面专用逻辑
│       │   │   └── index.tsx
│       │   ├── OutlineEditor/      # 大纲编辑
│       │   ├── DetailEditor/       # 详细描述编辑
│       │   ├── SlidePreview/       # 幻灯片预览
│       │   ├── InfographicPreview/ # 信息图预览
│       │   ├── XhsPreview/         # 小红书卡片预览
│       │   ├── Settings/           # 设置
│       │   ├── History/            # 历史记录
│       │   └── ProjectMaterials/   # 项目素材
│       │
│       ├── components/             # UI 组件
│       │   ├── shared/             # 共享组件
│       │   │   ├── MaterialSelector/    # 素材选择器（模块化）
│       │   │   ├── ReferenceFileSelector/ # 文件选择器（模块化）
│       │   │   ├── TemplateSelector/    # 模板选择器（模块化）
│       │   │   ├── Button.tsx
│       │   │   ├── Modal.tsx
│       │   │   └── ...
│       │   ├── outline/            # 大纲组件
│       │   ├── preview/            # 预览组件
│       │   └── history/            # 历史组件
│       │
│       ├── store/                  # 状态管理（Zustand）
│       │   ├── slices/             # 状态切片（模块化）
│       │   │   ├── projectSlice.ts
│       │   │   ├── generationSlice.ts
│       │   │   ├── exportSlice.ts
│       │   │   └── ...
│       │   └── useProjectStore.ts  # 主 Store
│       │
│       ├── hooks/                  # 共享 Hooks
│       │   ├── useAsyncAction.ts   # 异步操作封装
│       │   ├── useBoolean.ts       # 布尔状态
│       │   └── ...
│       │
│       ├── types/                  # TypeScript 类型
│       ├── utils/                  # 工具函数
│       └── config/                 # 配置文件
│
├── backend/                        # Flask 后端应用
│   ├── app.py                      # Flask 入口
│   ├── config.py                   # 配置文件
│   │
│   ├── models/                     # 数据库模型
│   │   ├── project.py
│   │   ├── page.py
│   │   ├── material.py
│   │   ├── user_template.py
│   │   └── ...
│   │
│   ├── services/                   # 服务层
│   │   ├── ai_service.py           # AI 生成核心
│   │   ├── project_service.py      # 项目服务
│   │   ├── export_service.py       # 导出服务
│   │   ├── tasks/                  # 任务拆分模块（按领域）
│   │   ├── task_manager.py         # 任务管理兼容入口
│   │   │
│   │   ├── ai_providers/           # AI 提供商（统一接口）
│   │   │   ├── text/               # 文本生成
│   │   │   ├── image/              # 图像生成
│   │   │   └── ocr/                # OCR 服务
│   │   │
│   │   ├── prompts/                # 提示词模块（模块化）
│   │   │   ├── outline_prompts.py
│   │   │   ├── image_prompts.py
│   │   │   ├── xhs_prompts.py
│   │   │   └── ...
│   │   │
│   │   └── image_editability/      # 可编辑导出
│   │       ├── service.py
│   │       ├── extractors.py
│   │       └── ...
│   │
│   ├── controllers/                # API 控制器
│   │   ├── project_controller.py
│   │   ├── page_controller.py
│   │   ├── export_controller.py
│   │   └── ...
│   │
│   ├── utils/                      # 工具函数
│   ├── migrations/                 # 数据库迁移
│   └── tests/                      # 后端测试
│
├── docs/                           # 文档目录
│   └── structure.md                # 结构说明
│
├── scripts/                        # 工具脚本
├── tests/                          # 端到端测试
├── docker-compose.yml              # Docker Compose
├── pyproject.toml                  # Python 配置
└── README.md                       # 本文件
```

**关键模块说明**：
- **前端**：React + TypeScript + Zustand，页面按 `components/` + `hooks/` 模块化
- **后端**：Flask + SQLAlchemy，服务层按功能域拆分（AI、导出、文件等）
- **任务执行**：`backend/services/tasks/` 按领域拆分，`task_manager.py` 兼容入口
- **状态管理**：Zustand 切片（`projectSlice`、`generationSlice`、`exportSlice` 等）
- **可编辑导出**：独立 `image_editability` 模块（OCR + AI + 背景重绘）

**常见问题**
1.  **支持免费层级的 Gemini API Key 吗？**
    *   免费层级只支持文本生成，不支持图片生成。
2.  **生成内容时提示 503 错误或 Retry Error**
    *   可以根据 README 中的命令查看 Docker 内部日志，定位 503 问题的详细报错，一般是模型配置不正确导致。
3.  **.env 中设置了 API Key 之后，为什么不生效？**
    1.  运行时编辑.env需要重启 Docker 容器以应用更改。
    2.  如果曾在网页设置页中设置，会覆盖 `.env` 中参数，可通过“还原默认设置”还原到 `.env`。
4.  **生成页面文字有乱码**
    *   可以尝试更高分辨率的输出（openai格式可能不支持调高分辨率）
    *   确保在页面描述中包含具体要渲染的文字内容
  

## 🤝 贡献指南

欢迎通过
[Issue](https://github.com/flyyangX/vibe-banana-pro/issues)
和
[Pull Request](https://github.com/flyyangX/vibe-banana-pro/pulls)
为本项目贡献力量！

## 📄 许可证

本项目采用 CC BY-NC-SA 4.0 协议进行开源，

可自由用于个人学习、研究、试验、教育或非营利科研活动等非商业用途；

<details> 

<summary> 详情 </summary>
本项目开源协议为非商业许可（CC BY-NC-SA），  
任何商业使用均需取得商业授权。

**商业使用**包括但不限于以下场景：

1. 企业或机构内部使用：

2. 对外服务：

3. 其他营利目的使用：

**非商业使用示例**（无需商业授权）：

- 个人学习、研究、试验、教育或非营利科研活动；
- 开源社区贡献、个人作品展示等不产生经济收益的用途。

> 注：若对使用场景有疑问，请联系作者获取授权许可。

</details>



## 致谢

- 上游项目：[`Anionex/banana-slides`](https://github.com/Anionex/banana-slides)
- 社区与贡献者：感谢所有在上游与本仓库贡献代码、建议与反馈的朋友们
  
