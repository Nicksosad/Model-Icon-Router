# Model Icon Router

SillyTavern 扩展，根据模型名称自动匹配并显示对应的 API 图标。

## 功能

- 根据模型名称中的关键词自动识别对应的 API 供应商
- 为 Claude 和 Gemini 提供高质量的自定义 SVG 图标
- 自动更新已有消息和新增消息的图标
- 匹配规则可自定义

## 匹配规则

| 关键词 | API 供应商 |
|--------|-----------|
| `claude`, `anthropic` | claude |
| `deepseek` | deepseek |
| `mistral` | mistralai |
| `grok`, `xai` | xai |
| `glm`, `zai` | zai |
| `cohere`, `command-r` | cohere |
| `perplexity`, `sonar` | perplexity |
| `azure` | azure_openai |
| `gemini`, `google`, `gemma`, `learnlm` | gemini |

## 安装

将 `model-icon-router` 文件夹放入 SillyTavern 的 `data/default-user/extensions/` 目录，然后在扩展面板中启用。

## 自定义图标

将 SVG 文件放入 `assets/` 目录，然后在 `index.js` 中的 `CUSTOM_ICON_SOURCES` 对象里添加对应的映射。
