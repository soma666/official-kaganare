# 部署到 Vercel

本项目已经配置好可直接部署到 Vercel。以下是部署步骤：

## 部署步骤

1. 将代码推送到 GitHub 仓库
2. 登录 [Vercel](https://vercel.com) 并连接您的 GitHub 账户
3. 点击 "New Project"
4. 选择此仓库
5. Vercel 会自动检测到这是一个静态网站项目并应用正确的构建设置
6. 点击 "Deploy" 开始部署

## 配置说明

项目包含 `vercel.json` 配置文件，定义了：

- 静态文件构建设置，包括 HTML、CSS、JavaScript 和其他静态资源
- 路由规则：
  - `/` 指向 `index.html`
  - `/zero-cost-skzlive` 指向 `zero-cost-skzlive.html`
  - 通配符路由确保所有静态资源正确加载

## 自定义域名

如果需要使用自定义域名：

1. 在 Vercel 项目设置中添加自定义域名
2. 按照指示在 DNS 提供商处添加相应的 DNS 记录

## 注意事项

- 所有资源引用都使用相对路径，确保在 Vercel 上正确加载
- 导航链接已优化为不带 .html 扩展名的友好 URL