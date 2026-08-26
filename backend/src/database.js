import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, '..', 'kakarotte.db')

let db = null

const defaultCategories = [
  { key: 'hot', name: '热门导航', icon: 'Opportunity', is_default: 1, sort_order: 0 },
  { key: 'frontend', name: '前端导航', icon: 'Monitor', is_default: 1, sort_order: 1 },
  { key: 'design', name: '设计导航', icon: 'Brush', is_default: 1, sort_order: 2 },
  { key: 'backend', name: '后端导航', icon: 'Cpu', is_default: 1, sort_order: 3 },
  { key: 'movie', name: '电影导航', icon: 'Film', is_default: 1, sort_order: 4 },
  { key: 'music', name: '音乐导航', icon: 'Headset', is_default: 1, sort_order: 5 },
]

const defaultNavigation = [
  // 前端
  { name: 'Vue.js', url: 'https://vuejs.org', description: '渐进式 JavaScript 框架', category: 'frontend', icon: 'https://vuejs.org/logo.svg', sort_order: 0, is_default: 1 },
  { name: 'React', url: 'https://react.dev', description: '用于构建用户界面的库', category: 'frontend', icon: 'https://react.dev/favicon.ico', sort_order: 1, is_default: 1 },
  { name: 'Vite', url: 'https://vitejs.dev', description: '下一代前端构建工具', category: 'frontend', icon: 'https://vitejs.dev/logo.svg', sort_order: 2, is_default: 1 },
  { name: 'Element Plus', url: 'https://element-plus.org', description: '基于 Vue 3 的组件库', category: 'frontend', icon: 'https://element-plus.org/images/element-plus-logo.svg', sort_order: 3, is_default: 1 },
  { name: 'Ant Design', url: 'https://ant.design', description: '企业级 UI 设计语言', category: 'frontend', icon: 'https://ant.design/favicon.ico', sort_order: 4, is_default: 1 },
  { name: 'MDN Web Docs', url: 'https://developer.mozilla.org', description: 'Web 开发者文档', category: 'frontend', icon: 'https://developer.mozilla.org/favicon-48x48.png', sort_order: 5, is_default: 1 },
  { name: 'Tailwind CSS', url: 'https://tailwindcss.com', description: '实用优先的 CSS 框架', category: 'frontend', icon: 'https://tailwindcss.com/favicon.svg', sort_order: 6, is_default: 1 },
  { name: 'TypeScript', url: 'https://www.typescriptlang.org', description: 'JavaScript 的超集', category: 'frontend', icon: 'https://www.typescriptlang.org/favicon-32x32.png', sort_order: 7, is_default: 1 },
  { name: 'Pinia', url: 'https://pinia.vuejs.org', description: 'Vue 的状态管理库', category: 'frontend', icon: 'https://pinia.vuejs.org/logo.svg', sort_order: 8, is_default: 1 },
  { name: 'Vue Router', url: 'https://router.vuejs.org', description: 'Vue.js 官方路由', category: 'frontend', icon: 'https://router.vuejs.org/logo.svg', sort_order: 9, is_default: 1 },
  { name: 'Next.js', url: 'https://nextjs.org', description: 'React 全栈框架', category: 'frontend', icon: 'https://nextjs.org/favicon.ico', sort_order: 10, is_default: 1 },
  { name: 'Nuxt.js', url: 'https://nuxt.com', description: 'Vue 全栈框架', category: 'frontend', icon: 'https://nuxt.com/favicon.ico', sort_order: 11, is_default: 1 },
  // 设计
  { name: 'Dribbble', url: 'https://dribbble.com', description: '设计师作品分享平台', category: 'design', icon: 'https://cdn.dribbble.com/assets/favicon-b38525134603b9513174ec887944bdeae9d573f1926e2b2cad562e936a30f0ce.png', sort_order: 0, is_default: 1 },
  { name: 'Figma', url: 'https://www.figma.com', description: '在线协作设计工具', category: 'design', icon: 'https://static.figma.com/app/icon/1/favicon.svg', sort_order: 1, is_default: 1 },
  { name: 'Unsplash', url: 'https://unsplash.com', description: '免费高清图片素材', category: 'design', icon: 'https://unsplash.com/favicon.ico', sort_order: 2, is_default: 1 },
  { name: 'Iconfont', url: 'https://www.iconfont.cn', description: '阿里巴巴矢量图标库', category: 'design', icon: 'https://img.alicdn.com/imgextra/i4/O1CN01Z5paLz1cjJrZMe6cp_!!6000000003635-2-tps-112-112.png', sort_order: 3, is_default: 1 },
  { name: 'Coolors', url: 'https://coolors.co', description: '配色方案生成器', category: 'design', icon: 'https://coolors.co/favicon.ico', sort_order: 4, is_default: 1 },
  { name: 'Google Fonts', url: 'https://fonts.google.com', description: 'Google 字体库', category: 'design', icon: 'https://www.google.com/favicon.ico', sort_order: 5, is_default: 1 },
  { name: 'Lucide', url: 'https://lucide.dev', description: '开源图标库', category: 'design', icon: 'https://lucide.dev/favicon.ico', sort_order: 6, is_default: 1 },
  { name: 'Heroicons', url: 'https://heroicons.com', description: 'Tailwind 团队图标库', category: 'design', icon: 'https://heroicons.com/favicon-32x32.png', sort_order: 7, is_default: 1 },
  { name: 'Pexels', url: 'https://www.pexels.com', description: '免费图片视频素材', category: 'design', icon: 'https://www.pexels.com/favicon.ico', sort_order: 8, is_default: 1 },
  { name: 'Awwwards', url: 'https://www.awwwards.com', description: '网页设计奖项平台', category: 'design', icon: 'https://www.awwwards.com/favicon.ico', sort_order: 9, is_default: 1 },
  // 后端
  { name: 'Node.js', url: 'https://nodejs.org', description: 'JavaScript 运行时', category: 'backend', icon: 'https://nodejs.org/favicon.ico', sort_order: 0, is_default: 1 },
  { name: 'Express', url: 'https://expressjs.com', description: 'Node.js Web 框架', category: 'backend', icon: 'https://expressjs.com/images/favicon.png', sort_order: 1, is_default: 1 },
  { name: 'NPM', url: 'https://www.npmjs.com', description: 'Node 包管理器', category: 'backend', icon: 'https://www.npmjs.com/favicon.ico', sort_order: 2, is_default: 1 },
  { name: 'MongoDB', url: 'https://www.mongodb.com', description: 'NoSQL 数据库', category: 'backend', icon: 'https://www.mongodb.com/favicon.ico', sort_order: 3, is_default: 1 },
  { name: 'PostgreSQL', url: 'https://www.postgresql.org', description: '开源关系型数据库', category: 'backend', icon: 'https://www.postgresql.org/favicon.ico', sort_order: 4, is_default: 1 },
  { name: 'Redis', url: 'https://redis.io', description: '内存数据结构存储', category: 'backend', icon: 'https://redis.io/favicon.ico', sort_order: 5, is_default: 1 },
  { name: 'Docker', url: 'https://www.docker.com', description: '容器化平台', category: 'backend', icon: 'https://www.docker.com/favicon.ico', sort_order: 6, is_default: 1 },
  { name: 'GitHub', url: 'https://github.com', description: '代码托管平台', category: 'backend', icon: 'https://github.githubassets.com/favicons/favicon.svg', sort_order: 7, is_default: 1 },
  { name: 'Stack Overflow', url: 'https://stackoverflow.com', description: '开发者问答社区', category: 'backend', icon: 'https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico', sort_order: 8, is_default: 1 },
  { name: 'Postman', url: 'https://www.postman.com', description: 'API 开发测试工具', category: 'backend', icon: 'https://www.postman.com/favicon.ico', sort_order: 9, is_default: 1 },
  { name: 'Nginx', url: 'https://nginx.org', description: '高性能 Web 服务器', category: 'backend', icon: 'https://nginx.org/favicon.ico', sort_order: 10, is_default: 1 },
  { name: 'NestJS', url: 'https://nestjs.com', description: 'Node.js 企业级框架', category: 'backend', icon: 'https://nestjs.com/favicon.ico', sort_order: 11, is_default: 1 },
  { name: 'GraphQL', url: 'https://graphql.org', description: 'API 查询语言', category: 'backend', icon: 'https://graphql.org/favicon.ico', sort_order: 12, is_default: 1 },
  { name: 'Prisma', url: 'https://www.prisma.io', description: '下一代 ORM', category: 'backend', icon: 'https://www.prisma.io/favicon.ico', sort_order: 13, is_default: 1 },
  // 电影
  { name: '豆瓣电影', url: 'https://movie.douban.com', description: '电影评分与评论', category: 'movie', icon: 'https://movie.douban.com/favicon.ico', sort_order: 0, is_default: 1 },
  { name: 'IMDb', url: 'https://www.imdb.com', description: '全球电影数据库', category: 'movie', icon: 'https://www.imdb.com/favicon.ico', sort_order: 1, is_default: 1 },
  { name: '烂番茄', url: 'https://www.rottentomatoes.com', description: '电影评分聚合', category: 'movie', icon: 'https://www.rottentomatoes.com/assets/pizza-server/images/favicon.ico', sort_order: 2, is_default: 1 },
  { name: '时光网', url: 'https://www.mtime.com', description: '电影资讯与评论', category: 'movie', icon: 'https://www.mtime.com/favicon.ico', sort_order: 3, is_default: 1 },
  { name: '猫眼电影', url: 'https://www.maoyan.com', description: '电影票务与评分', category: 'movie', icon: 'https://www.maoyan.com/favicon.ico', sort_order: 4, is_default: 1 },
  { name: '1905电影网', url: 'https://www.1905.com', description: '央视电影网', category: 'movie', icon: 'https://www.1905.com/favicon.ico', sort_order: 5, is_default: 1 },
  { name: '爱奇艺', url: 'https://www.iqiyi.com', description: '在线视频平台', category: 'movie', icon: 'https://www.iqiyi.com/favicon.ico', sort_order: 6, is_default: 1 },
  { name: '优酷', url: 'https://www.youku.com', description: '在线视频平台', category: 'movie', icon: 'https://www.youku.com/favicon.ico', sort_order: 7, is_default: 1 },
  { name: '腾讯视频', url: 'https://v.qq.com', description: '在线视频平台', category: 'movie', icon: 'https://v.qq.com/favicon.ico', sort_order: 8, is_default: 1 },
  { name: '哔哩哔哩', url: 'https://www.bilibili.com', description: '弹幕视频网站', category: 'movie', icon: 'https://www.bilibili.com/favicon.ico', sort_order: 9, is_default: 1 },
  { name: 'Netflix', url: 'https://www.netflix.com', description: '全球流媒体平台', category: 'movie', icon: 'https://www.netflix.com/favicon.ico', sort_order: 10, is_default: 1 },
  { name: 'Disney+', url: 'https://www.disneyplus.com', description: '迪士尼流媒体', category: 'movie', icon: 'https://www.disneyplus.com/favicon.ico', sort_order: 11, is_default: 1 },
  // 音乐
  { name: '网易云音乐', url: 'https://music.163.com', description: '音乐发现与分享', category: 'music', icon: 'https://s1.music.126.net/style/favicon.ico', sort_order: 0, is_default: 1 },
  { name: 'QQ音乐', url: 'https://y.qq.com', description: '腾讯音乐平台', category: 'music', icon: 'https://y.qq.com/favicon.ico', sort_order: 1, is_default: 1 },
  { name: '酷狗音乐', url: 'https://www.kugou.com', description: '音乐播放与下载', category: 'music', icon: 'https://www.kugou.com/favicon.ico', sort_order: 2, is_default: 1 },
  { name: '酷我音乐', url: 'https://www.kuwo.cn', description: '在线音乐平台', category: 'music', icon: 'https://www.kuwo.cn/favicon.ico', sort_order: 3, is_default: 1 },
  { name: 'Spotify', url: 'https://www.spotify.com', description: '全球音乐流媒体', category: 'music', icon: 'https://www.spotify.com/favicon.ico', sort_order: 4, is_default: 1 },
  { name: 'Apple Music', url: 'https://music.apple.com', description: '苹果音乐服务', category: 'music', icon: 'https://music.apple.com/favicon.ico', sort_order: 5, is_default: 1 },
  { name: 'SoundCloud', url: 'https://soundcloud.com', description: '音频创作分享', category: 'music', icon: 'https://a-v2.sndcdn.com/assets/images/sc-icons/favicon-2cadd14b.ico', sort_order: 6, is_default: 1 },
  { name: 'YouTube Music', url: 'https://music.youtube.com', description: 'YouTube 音乐', category: 'music', icon: 'https://music.youtube.com/favicon.ico', sort_order: 7, is_default: 1 },
  { name: 'Last.fm', url: 'https://www.last.fm', description: '音乐推荐与记录', category: 'music', icon: 'https://www.last.fm/favicon.ico', sort_order: 8, is_default: 1 },
  { name: '咪咕音乐', url: 'https://music.migu.cn', description: '中国移动音乐', category: 'music', icon: 'https://music.migu.cn/favicon.ico', sort_order: 9, is_default: 1 },
  { name: '汽水音乐', url: 'https://music.douyin.com', description: '抖音音乐平台', category: 'music', icon: 'https://music.douyin.com/favicon.ico', sort_order: 10, is_default: 1 },
  { name: 'AZLyrics', url: 'https://www.azlyrics.com', description: '英文歌词库', category: 'music', icon: 'https://www.azlyrics.com/favicon.ico', sort_order: 11, is_default: 1 },
  // 热门（国内）
  { name: '百度', url: 'https://www.baidu.com', description: '中文搜索引擎', category: 'hot', icon: 'https://www.baidu.com/favicon.ico', sort_order: 0, is_default: 1 },
  { name: '淘宝', url: 'https://www.taobao.com', description: '电商购物平台', category: 'hot', icon: 'https://www.taobao.com/favicon.ico', sort_order: 1, is_default: 1 },
  { name: '京东', url: 'https://www.jd.com', description: '综合网购平台', category: 'hot', icon: 'https://www.jd.com/favicon.ico', sort_order: 2, is_default: 1 },
  { name: '知乎', url: 'https://www.zhihu.com', description: '问答社区', category: 'hot', icon: 'https://static.zhihu.com/heifetz/favicon.ico', sort_order: 3, is_default: 1 },
  { name: '微博', url: 'https://weibo.com', description: '社交平台', category: 'hot', icon: 'https://weibo.com/favicon.ico', sort_order: 4, is_default: 1 },
  { name: '哔哩哔哩', url: 'https://www.bilibili.com', description: '弹幕视频网站', category: 'hot', icon: 'https://www.bilibili.com/favicon.ico', sort_order: 5, is_default: 1 },
  { name: '抖音', url: 'https://www.douyin.com', description: '短视频平台', category: 'hot', icon: 'https://www.douyin.com/favicon.ico', sort_order: 6, is_default: 1 },
  { name: '微信', url: 'https://weixin.qq.com', description: '即时通讯', category: 'hot', icon: 'https://weixin.qq.com/favicon.ico', sort_order: 7, is_default: 1 },
  { name: '支付宝', url: 'https://www.alipay.com', description: '第三方支付', category: 'hot', icon: 'https://www.alipay.com/favicon.ico', sort_order: 8, is_default: 1 },
  { name: '美团', url: 'https://www.meituan.com', description: '生活服务平台', category: 'hot', icon: 'https://www.meituan.com/favicon.ico', sort_order: 9, is_default: 1 },
  { name: '网易云音乐', url: 'https://music.163.com', description: '音乐平台', category: 'hot', icon: 'https://music.163.com/favicon.ico', sort_order: 10, is_default: 1 },
  { name: '腾讯视频', url: 'https://v.qq.com', description: '在线视频平台', category: 'hot', icon: 'https://v.qq.com/favicon.ico', sort_order: 11, is_default: 1 },
  { name: '携程', url: 'https://www.ctrip.com', description: '旅行预订平台', category: 'hot', icon: 'https://www.ctrip.com/favicon.ico', sort_order: 12, is_default: 1 },
  { name: '滴滴', url: 'https://www.didi.com', description: '出行打车平台', category: 'hot', icon: 'https://www.didi.com/favicon.ico', sort_order: 13, is_default: 1 },
  { name: '掘金', url: 'https://juejin.cn', description: '开发者技术社区', category: 'hot', icon: 'https://juejin.cn/favicon.ico', sort_order: 14, is_default: 1 },
]

const initDB = async () => {
  const SQL = await initSqlJs()

  // 如果数据库文件存在，加载它；否则新建
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  // ===== 公共表：官方分类 + 官方导航（is_default = 1，不可被用户编辑/删除）=====
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      icon TEXT,
      is_default INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS navigation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      category TEXT NOT NULL,
      is_default INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // ===== 用户表 =====
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wechat_openid TEXT UNIQUE,
      wechat_unionid TEXT UNIQUE,
      nickname TEXT,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 兼容已存在数据库：补充账号密码登录所需字段
  const tryAlter = (sql) => { try { db.run(sql) } catch (_) {} }
  tryAlter('ALTER TABLE users ADD COLUMN username TEXT')
  tryAlter('ALTER TABLE users ADD COLUMN password_hash TEXT')
  tryAlter('ALTER TABLE users ADD COLUMN phone TEXT')
  tryAlter("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'")
  // username / phone 唯一索引（允许 NULL 不冲突）
  try { db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL') } catch (_) {}
  try { db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL') } catch (_) {}

  // ===== 登录失败记录（防撞库）=====
  db.run(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identifier TEXT,
      ip TEXT,
      success INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // ===== 短信验证码 =====
  db.run(`
    CREATE TABLE IF NOT EXISTS sms_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      purpose TEXT DEFAULT 'register',
      used INTEGER DEFAULT 0,
      expires_at TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // ===== 图片验证码会话 =====
  db.run(`
    CREATE TABLE IF NOT EXISTS captcha_sessions (
      token TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      verified INTEGER DEFAULT 0,
      ip TEXT,
      expires_at TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // ===== 用户自定义分类（category key 格式：u_{user_id}_{自定义key}）=====
  db.run(`
    CREATE TABLE IF NOT EXISTS user_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      icon TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // ===== 用户自定义导航 =====
  db.run(`
    CREATE TABLE IF NOT EXISTS user_navigation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      category TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // ===== 微信扫码登录 临时状态（轮询二维码状态）=====
  db.run(`
    CREATE TABLE IF NOT EXISTS wechat_login_sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER,
      openid TEXT,
      status TEXT DEFAULT 'pending',
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 用户自定义的「官方导航排序」
  db.run(`
    CREATE TABLE IF NOT EXISTS user_nav_order (
      user_id INTEGER NOT NULL,
      nav_id INTEGER NOT NULL,
      sort_order INTEGER NOT NULL,
      PRIMARY KEY (user_id, nav_id)
    )
  `)

  // 分类排序（用户自定义分类排序 + 官方分类用户自定义排序）
  db.run(`
    CREATE TABLE IF NOT EXISTS user_cat_order (
      user_id INTEGER NOT NULL,
      cat_key TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      PRIMARY KEY (user_id, cat_key)
    )
  `)

  // 填充默认分类（增量：缺失的才插入；已存在的更新图标）
  defaultCategories.forEach((c) => {
    const exists = db.prepare('SELECT id FROM categories WHERE key = ?').get([c.key])
    if (exists) {
      const updStmt = db.prepare('UPDATE categories SET icon = ?, sort_order = ? WHERE key = ?')
      updStmt.run([c.icon, c.sort_order, c.key])
      updStmt.free()
    } else {
      const insStmt = db.prepare('INSERT INTO categories (key, name, icon, is_default, sort_order) VALUES (?, ?, ?, ?, ?)')
      insStmt.run([c.key, c.name, c.icon, c.is_default, c.sort_order])
      insStmt.free()
    }
  })

  // 热门导航：先清空旧数据再重新插入（确保始终是最新的国内版本）
  db.run("DELETE FROM navigation WHERE category = 'hot'")
  const hotStmt = db.prepare(
    'INSERT INTO navigation (name, url, description, icon, category, is_default, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  defaultNavigation.filter((n) => n.category === 'hot').forEach((n) => {
    hotStmt.run([n.name, n.url, n.description, n.icon, n.category, n.is_default, n.sort_order])
  })
  hotStmt.free()

  // 填充默认导航（增量：缺失的才插入，排除热门已处理）
  defaultNavigation.filter((n) => n.category !== 'hot').forEach((n) => {
    const selStmt = db.prepare('SELECT id FROM navigation WHERE name = ? AND category = ? LIMIT 1')
    selStmt.bind([n.name, n.category])
    let exists = false
    if (selStmt.step()) {
      exists = true
    }
    selStmt.free()
    if (!exists) {
      const insStmt = db.prepare(
        'INSERT INTO navigation (name, url, description, icon, category, is_default, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      insStmt.run([n.name, n.url, n.description, n.icon, n.category, n.is_default, n.sort_order])
      insStmt.free()
    }
  })

  saveDB()
}

const saveDB = () => {
  if (db) {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
  }
}

const getDB = () => {
  if (!db) throw new Error('Database not initialized. Call initDB first.')
  return db
}

export { initDB, saveDB, getDB }
