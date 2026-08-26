# Vercel 部署指南

## 方式一：CLI 部署（推荐）

1. 安装 Vercel CLI：
```powershell
npm install -g vercel
```

2. 登录 Vercel：
```powershell
cd c:\Users\95369\Desktop\kakarotte_project\frontend
vercel login
```
（会弹出浏览器让你登录/注册 Vercel 账号）

3. 部署上线：
```powershell
vercel --prod
```
（第一次会问你几个问题，全部回车默认即可）

4. 部署完成后会给你一个网址，类似：
```
https://kakarotte-xxx.vercel.app
```
别人用这个网址就能访问你的导航站了！

---

## 方式二：网页部署

1. 打开 https://vercel.com 注册/登录
2. 点击 "New Project"
3. Import 你的 GitHub 仓库（如果没有，先上传到 GitHub）
4. Framework Preset 选 "Vite"
5. 点击 "Deploy" 即可

---

## 说明

- 项目已改为纯静态模式，不需要后端服务器
- 所有数据保存在浏览器的 localStorage 中
- Vercel 免费版提供：100GB/月流量、自动 HTTPS、全球 CDN
