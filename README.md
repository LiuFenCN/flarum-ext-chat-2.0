# Neon Chat (Flarum 2.0)

[![License](https://img.shields.io/badge/license-CC--BY--NC%204.0-lightgrey.svg)](LICENSE)

**Flarum 2.0 实时聊天室扩展** — 为你的 Flarum 论坛添加原生实时聊天功能。

> 本项目是从 [MissGamerz/Xelson (Neon Chat)](https://github.com/MissGamerz/flarum-ext-chat) Fork 并完全适配 **Flarum 2.0 RC** 的版本。

---

## 功能特性 / Features

- 私聊（PM）与频道（Channel）聊天
- 实时消息推送（需 [Pusher](https://pusher.com) 或 [kyrne/websocket](https://extiverse.com/extension/kyrne/websocket)）
- 声音与浏览器通知
- 消息媒体预览
- 游客屏蔽 / 禁止游客使用
- **消息自动清理**：可分别设置频道和私聊的消息保留天数
- 后台管理设置页
- 玻璃态 UI，支持明暗主题
- 移动端适配

## 效果截图 / Screenshots

### Dark Mode
![Dark Mode](https://i.postimg.cc/RVRtWb46/image.png)

### Light Mode
![Light Mode](https://i.postimg.cc/nr1XQCb9/image.png)

## 安装 / Installation

```bash
composer require acolasialiuliu/flarum-ext-chat
php flarum migrate
php flarum cache:clear
```

开发版本：
```bash
composer require acolasialiuliu/flarum-ext-chat:dev-master
```

确保已启用 WebSocket 扩展（Pusher 或 kyrne/websocket）。

## 更新 / Updating

```bash
composer update acolasialiuliu/flarum-ext-chat
php flarum migrate
php flarum cache:clear
```

## 后台设置 / Admin Settings

| 设置项 | 说明 | 默认值 |
|--------|------|--------|
| 消息字数限制 | 单条消息最大字符数（0=不限） | 0 |
| 默认最小化 | 聊天面板初始状态是否最小化 | 关 |
| 屏蔽游客内容 | 对未登录用户隐藏消息内容 | 开 |
| **禁止游客使用** | 未登录用户完全看不到聊天入口 | **开** |
| **频道消息保留天数** | 超过此天数自动删除（0=永久） | **2 天** |
| **私聊消息保留天数** | 超过此天数自动删除（0=永久） | **30 天** |
| **未读邮件提醒天数** | 未读超 N 天发邮件（0=不提醒） | 0（关） |

## 消息清理 / Message Retention

扩展注册了 `chat:clean` 控制台命令，通过 Flarum 调度器**每日自动执行**：

```bash
# 手动执行
php flarum chat:clean
```

该命令根据后台设置的天数，自动删除过期的频道消息和私聊消息。

## 开发路线图 / Roadmap

- [ ] **Emoji 选择器** — 输入框集成表情选择面板
- [x] **媒体链接自动识别** — 依赖 Flarum 媒体嵌入扩展（如 fof/embed），粘贴/发送含图片/视频 URL 的消息时自动渲染预览

> 以下功能暂不计划（保持轻量）：
> - ~~文件上传~~ — 使用论坛附件功能即可
> - ~~独立窗口聊天~~ — 增加复杂度，收益有限
> - ~~论坛通知集成~~ — 聊天室自有通知体系已满足需求
> - ~~自定义通知声音~~ — 浏览器权限限制多，体验不佳
> - ~~聊天记录搜索~~ — 当前消息量无需全文检索

## 致谢 / Credits

原始项目：[Xelson (Neon Chat)](https://github.com/MissGamerz/flarum-ext-chat) by [MissGamerz](https://networkforgamers.com) / [Xelson](https://neonsky.ru)

Flarum 2.0 适配：[acolasialiuliu](https://github.com/LiuFenCN)

## 许可证 / License

[CC-BY-NC-4.0](LICENSE) — 禁止未经授权的商业使用。

This project is licensed under [CC-BY-NC-4.0](LICENSE). Commercial use requires explicit permission from the copyright holder.
