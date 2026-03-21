# LexiForge

> 提示：本文内容为自动翻译。

LexiForge 是一个用于语言学习的桌面原型，基于 `PySide6`、`Qt WebEngine` 和 HTML/CSS/JavaScript 界面构建。该应用允许学习者描述自己想学习的内容，使用 OpenAI 生成词汇卡片，然后基于所选内容启动课程流程。

## 当前功能

- 通过 OpenAI Responses API 生成词汇卡片
- 包含多种任务类型的课程流程：讲解、匹配、翻译、填空和问答
- 使用本地 JSON 课程计划作为临时课程数据源

## 项目结构

```text
LexiForge/
├─ main.py                         # 应用入口和 dotenv 初始化
├─ backend.py                      # 通过 Qt 信号/槽连接 Python 与 UI
├─ router.py                       # 页面导航和控制器路由
├─ logging_config.py               # 日志配置
├─ answer_matcher.py               # 答案规范化与校验
├─ language_converter.py           # 语言标签和辅助函数
├─ requirements.txt                # Python 依赖
├─ .env                            # 本地环境变量（OpenAI 密钥）
├─ lesson_plans/
│  └─ lesson.json                  # 临时课程数据
├─ llm_gateway/
│  ├─ openai_wrapper.py            # OpenAI Responses API 客户端封装
│  ├─ openai_chat.py               # 聊天会话辅助模块
│  └─ openai_cache.py              # 提示缓存辅助函数/状态
├─ pipeline/
│  └─ vocab.py                     # 词汇卡片生成流程
├─ prompts/
│  └─ en/
│     └─ vocab_setup.txt           # 用于词汇生成的系统提示词
└─ ui/
   ├─ controllers/                 # 用于设置和课程流程的 Python 控制器
   ├─ views/                       # HTML/CSS/JS 页面
   └─ assets/                      # 字体、图标和共享主题文件
```

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/Glebhl/LexiForge.git
cd LexiForge
```

### 2. 创建并激活虚拟环境

```bash
python -m venv venv
venv\Scripts\Activate.ps1
```

### 3. 安装依赖

```bash
pip install -r requirements.txt
```

### 4. 配置环境变量

在项目根目录创建 `.env` 文件，并添加你的 OpenAI API 密钥：

```env
OPENAI_API_KEY=your_openai_api_key_here
```

如果没有 `OPENAI_API_KEY`，词汇卡片生成功能将无法工作。

### 5. 运行应用

```bash
python main.py
```

## 状态

该项目仍处于早期原型阶段。词汇设置流程已经使用 OpenAI，而完整的课程生成流水线目前仍部分依赖临时的 JSON 课程数据。

## 路线图

计划中的下一步包括：

- 基于所选词汇卡片生成完整课程
- 增加对更多语言的支持
- 增加语法支持
- 增加英语之外的本地化支持
- 用完全由 AI 驱动的课程创建替换临时课程模板
- 增加进度跟踪

## 贡献

欢迎提交 issue、建议和 pull request。
