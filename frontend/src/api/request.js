import axios from 'axios'

// 纯静态模式：始终使用 localStorage + 默认数据，不依赖后端 API
const STATIC_MODE = true

const request = axios.create({
  baseURL: '/api',
  timeout: 10000
})

request.interceptors.response.use(
  response => response.data,
  error => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

if (STATIC_MODE) {
  request.interceptors.request.use(async (config) => {
    const url = config.url || ''
    console.log('[STATIC] intercepting request:', url, '| baseURL:', config.baseURL)

    // 归一化 URL（去掉前面的 /api 前缀，防止 baseURL 拼接后匹配失败）
    const normUrl = url.replace(/^\/api/, '')

    if (normUrl.includes('/categories')) {
      const cats = JSON.parse(localStorage.getItem('kakarotte_local_categories') || '[]')
      const defaultCats = [
        { key: 'hot', name: '热门导航', icon: 'Opportunity' },
        { key: 'frontend', name: '前端导航', icon: '💻' },
        { key: 'design', name: '设计导航', icon: '🎨' },
        { key: 'backend', name: '后端导航', icon: '⚙️' },
        { key: 'movie', name: '电影导航', icon: '🎬' },
        { key: 'music', name: '音乐导航', icon: '🎵' }
      ]
      const merged = [...defaultCats, ...cats.filter(c => !defaultCats.find(d => d.key === c.key))]
      console.log('[STATIC] /categories → returning', merged.length, 'categories')
      config.adapter = async () => ({
        data: { code: 200, data: merged },
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      })
    } else if (normUrl.includes('/navigation/search')) {
      const keyword = config.params?.keyword || ''
      const navItems = JSON.parse(localStorage.getItem('kakarotte_local_nav_items') || '[]')
      const results = navItems.filter(item =>
        item.name?.toLowerCase().includes(keyword.toLowerCase()) ||
        item.url?.toLowerCase().includes(keyword.toLowerCase()) ||
        item.description?.toLowerCase().includes(keyword.toLowerCase())
      )
      console.log('[STATIC] /navigation/search keyword=', keyword, '→ results=', results.length)
      config.adapter = async () => ({
        data: { code: 200, data: results },
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      })
    } else if (normUrl.includes('/navigation')) {
      const parts = normUrl.split('/').filter(Boolean)
      const category = parts[1] || ''
      console.log('[STATIC] /navigation category=', category, '| parts=', parts)
      const navItems = JSON.parse(localStorage.getItem('kakarotte_local_nav_items') || '[]')
      const defaultItems = getDefaultNavigation(category)
      const localItems = navItems.filter(i => i.category === category)
      const merged = [...defaultItems, ...localItems.filter(i => !defaultItems.find(d => d.nav_id === i.nav_id))]
      console.log('[STATIC] merged count =', merged.length, '| defaultItems=', defaultItems.length, '| localItems=', localItems.length)
      config.adapter = async () => ({
        data: { code: 200, data: merged },
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      })
    } else {
      console.warn('[STATIC] no rule matched for URL:', url, '| normUrl:', normUrl)
    }
    return config
  })
}

function getDefaultNavigation(category) {
  // favicon CDN: https://favicon.cccyun.cc/{domain} 国内稳定无防盗链
  const F = (domain) => `https://favicon.cccyun.cc/${domain}`
  const defaults = {
    // ==================== 热门导航 (18) —— 前 17 项按用户指定顺序，抖音后插入 DeepSeek ====================
    hot: [
      { nav_id: 'douyin', name: '抖音', url: 'https://www.douyin.com', description: '短视频平台', icon: F('douyin.com'), category: 'hot' },
      { nav_id: 'deepseek', name: 'DeepSeek', url: 'https://www.deepseek.com', description: 'AI 对话助手', icon: F('deepseek.com'), category: 'hot' },
      { nav_id: 'bilibili', name: '哔哩哔哩', url: 'https://www.bilibili.com', description: '弹幕视频网站', icon: F('bilibili.com'), category: 'hot' },
      { nav_id: 'xiaohongshu', name: '小红书', url: 'https://www.xiaohongshu.com', description: '生活方式社区', icon: F('xiaohongshu.com'), category: 'hot' },
      { nav_id: 'qqmail', name: 'QQ邮箱', url: 'https://mail.qq.com', description: 'QQ 邮箱服务', icon: F('qq.com'), category: 'hot' },
      { nav_id: 'mail163', name: '网易邮箱', url: 'https://mail.163.com', description: '网易邮箱服务', icon: F('163.com'), category: 'hot' },
      { nav_id: 'netease-music-hot', name: '网易云音乐', url: 'https://music.163.com', description: '音乐平台', icon: F('163.com'), category: 'hot' },
      { nav_id: 'kugou', name: '酷狗音乐', url: 'https://www.kugou.com', description: '音乐播放与下载', icon: F('kugou.com'), category: 'hot' },
      { nav_id: 'baidu', name: '百度', url: 'https://www.baidu.com', description: '中文搜索引擎', icon: F('baidu.com'), category: 'hot' },
      { nav_id: 'youdao-fanyi', name: '有道翻译', url: 'https://fanyi.youdao.com', description: '在线翻译工具', icon: F('youdao.com'), category: 'hot' },
      { nav_id: 'baidu-fanyi', name: '百度翻译', url: 'https://fanyi.baidu.com', description: '百度翻译服务', icon: F('baidu.com'), category: 'hot' },
      { nav_id: 'lanhu', name: '蓝湖', url: 'https://lanhu.cn', description: '设计协作平台', icon: F('lanhu.cn'), category: 'hot' },
      { nav_id: 'youdao-note', name: '有道云笔记', url: 'https://note.youdao.com', description: '云端笔记工具', icon: F('youdao.com'), category: 'hot' },
      { nav_id: 'element-ui', name: 'ElementUI', url: 'https://element.eleme.io', description: 'Vue 2 组件库', icon: F('element.eleme.io'), category: 'hot' },
      { nav_id: 'vant-ui', name: 'VantUI', url: 'https://vant-ui.github.io/vant/', description: '移动端 Vue 组件库', icon: F('vant-ui.github.io'), category: 'hot' },
      { nav_id: 'speedtest', name: '测网速', url: 'https://www.speedtest.cn', description: '网络测速工具', icon: F('speedtest.cn'), category: 'hot' },
      { nav_id: 'runoob', name: '菜鸟教程', url: 'https://www.runoob.com', description: '编程学习教程', icon: F('runoob.com'), category: 'hot' },
      { nav_id: 'yuque', name: '语雀', url: 'https://www.yuque.com', description: '知识管理平台', icon: F('yuque.com'), category: 'hot' },
    ],
    // ==================== 前端导航 (20) ====================
    frontend: [
      { nav_id: 'vuejs', name: 'Vue.js', url: 'https://vuejs.org', description: '渐进式 JavaScript 框架', icon: F('vuejs.org'), category: 'frontend' },
      { nav_id: 'react', name: 'React', url: 'https://react.dev', description: '构建用户界面的库', icon: F('react.dev'), category: 'frontend' },
      { nav_id: 'vite', name: 'Vite', url: 'https://vitejs.dev', description: '下一代前端构建工具', icon: F('vitejs.dev'), category: 'frontend' },
      { nav_id: 'element-plus', name: 'Element Plus', url: 'https://element-plus.org', description: 'Vue 3 组件库', icon: F('element-plus.org'), category: 'frontend' },
      { nav_id: 'ant-design', name: 'Ant Design', url: 'https://ant.design', description: '企业级 UI 设计语言', icon: F('ant.design'), category: 'frontend' },
      { nav_id: 'mdn', name: 'MDN Web Docs', url: 'https://developer.mozilla.org', description: 'Web 开发者文档', icon: F('developer.mozilla.org'), category: 'frontend' },
      { nav_id: 'tailwind', name: 'Tailwind CSS', url: 'https://tailwindcss.com', description: '实用优先的 CSS 框架', icon: F('tailwindcss.com'), category: 'frontend' },
      { nav_id: 'typescript', name: 'TypeScript', url: 'https://www.typescriptlang.org', description: 'JavaScript 的超集', icon: F('typescriptlang.org'), category: 'frontend' },
      { nav_id: 'pinia', name: 'Pinia', url: 'https://pinia.vuejs.org', description: 'Vue 状态管理库', icon: F('pinia.vuejs.org'), category: 'frontend' },
      { nav_id: 'vue-router', name: 'Vue Router', url: 'https://router.vuejs.org', description: 'Vue.js 官方路由', icon: F('router.vuejs.org'), category: 'frontend' },
      { nav_id: 'nextjs', name: 'Next.js', url: 'https://nextjs.org', description: 'React 全栈框架', icon: F('nextjs.org'), category: 'frontend' },
      { nav_id: 'nuxtjs', name: 'Nuxt.js', url: 'https://nuxt.com', description: 'Vue 全栈框架', icon: F('nuxt.com'), category: 'frontend' },
      { nav_id: 'npm', name: 'npm', url: 'https://www.npmjs.com', description: 'Node 包管理器', icon: F('npmjs.com'), category: 'frontend' },
      { nav_id: 'pnpm', name: 'pnpm', url: 'https://pnpm.io', description: '快速磁盘高效包管理器', icon: F('pnpm.io'), category: 'frontend' },
      { nav_id: 'webpack', name: 'Webpack', url: 'https://webpack.js.org', description: '模块打包工具', icon: F('webpack.js.org'), category: 'frontend' },
      { nav_id: 'sass', name: 'Sass', url: 'https://sass-lang.com', description: 'CSS 预处理器', icon: F('sass-lang.com'), category: 'frontend' },
      { nav_id: 'eslint', name: 'ESLint', url: 'https://eslint.org', description: 'JavaScript/TS Lint 工具', icon: F('eslint.org'), category: 'frontend' },
      { nav_id: 'prettier', name: 'Prettier', url: 'https://prettier.io', description: '代码格式化工具', icon: F('prettier.io'), category: 'frontend' },
      { nav_id: 'babel', name: 'Babel', url: 'https://babeljs.io', description: 'JS 编译器', icon: F('babeljs.io'), category: 'frontend' },
      { nav_id: 'svelte', name: 'Svelte', url: 'https://svelte.dev', description: '无虚拟 DOM 前端框架', icon: F('svelte.dev'), category: 'frontend' }
    ],
    // ==================== 设计导航 (20) ====================
    design: [
      { nav_id: 'figma', name: 'Figma', url: 'https://figma.com', description: '协作式界面设计工具', icon: F('figma.com'), category: 'design' },
      { nav_id: 'dribbble', name: 'Dribbble', url: 'https://dribbble.com', description: '设计师灵感社区', icon: F('dribbble.com'), category: 'design' },
      { nav_id: 'behance', name: 'Behance', url: 'https://behance.net', description: '创意作品展示平台', icon: F('behance.net'), category: 'design' },
      { nav_id: 'sketch', name: 'Sketch', url: 'https://sketch.com', description: '矢量绘图工具', icon: F('sketch.com'), category: 'design' },
      { nav_id: 'adobe-xd', name: 'Adobe XD', url: 'https://xd.adobe.com', description: '原型设计工具', icon: F('adobe.com'), category: 'design' },
      { nav_id: 'iconfont', name: 'Iconfont', url: 'https://iconfont.cn', description: '阿里巴巴矢量图标库', icon: F('iconfont.cn'), category: 'design' },
      { nav_id: 'photoshop', name: 'Adobe Photoshop', url: 'https://adobe.com/cn/products/photoshop.html', description: '专业图像处理软件', icon: F('adobe.com'), category: 'design' },
      { nav_id: 'illustrator', name: 'Adobe Illustrator', url: 'https://adobe.com/cn/products/illustrator.html', description: '矢量绘图软件', icon: F('adobe.com'), category: 'design' },
      { nav_id: 'canva', name: 'Canva 可画', url: 'https://www.canva.cn', description: '在线平面设计平台', icon: F('canva.cn'), category: 'design' },
      { nav_id: 'unsplash', name: 'Unsplash', url: 'https://unsplash.com', description: '免费高清图片素材', icon: F('unsplash.com'), category: 'design' },
      { nav_id: 'pexels', name: 'Pexels', url: 'https://www.pexels.com', description: '免费高质量图库', icon: F('pexels.com'), category: 'design' },
      { nav_id: 'pixabay', name: 'Pixabay', url: 'https://pixabay.com', description: '免费图片/插画/视频', icon: F('pixabay.com'), category: 'design' },
      { nav_id: 'invision', name: 'InVision', url: 'https://www.invisionapp.com', description: '原型协作工具', icon: F('invisionapp.com'), category: 'design' },
      { nav_id: 'zeplin', name: 'Zeplin', url: 'https://zeplin.io', description: '设计稿协作交付', icon: F('zeplin.io'), category: 'design' },
      { nav_id: 'uplabs', name: 'UpLabs', url: 'https://www.uplabs.com', description: 'UI/UX 设计灵感', icon: F('uplabs.com'), category: 'design' },
      { nav_id: 'codrops', name: 'Codrops', url: 'https://tympanus.net/codrops/', description: '前端交互设计教程', icon: F('tympanus.net'), category: 'design' },
      { nav_id: 'lottiefiles', name: 'LottieFiles', url: 'https://lottiefiles.com', description: 'Lottie 动画素材库', icon: F('lottiefiles.com'), category: 'design' },
      { nav_id: 'iconmonstr', name: 'Iconmonstr', url: 'https://iconmonstr.com', description: '免费单色图标库', icon: F('iconmonstr.com'), category: 'design' },
      { nav_id: 'flaticon', name: 'Flaticon', url: 'https://www.flaticon.com', description: '海量矢量图标库', icon: F('flaticon.com'), category: 'design' },
      { nav_id: 'undraw', name: 'unDraw', url: 'https://undraw.co', description: '免费 SVG 插画库', icon: F('undraw.co'), category: 'design' }
    ],
    // ==================== 后端导航 (20) ====================
    backend: [
      { nav_id: 'nodejs', name: 'Node.js', url: 'https://nodejs.org', description: 'JavaScript 运行时', icon: F('nodejs.org'), category: 'backend' },
      { nav_id: 'python', name: 'Python', url: 'https://python.org', description: '通用编程语言', icon: F('python.org'), category: 'backend' },
      { nav_id: 'golang', name: 'Go', url: 'https://go.dev', description: 'Google 开发的编程语言', icon: F('go.dev'), category: 'backend' },
      { nav_id: 'rust', name: 'Rust', url: 'https://rust-lang.org', description: '系统级编程语言', icon: F('rust-lang.org'), category: 'backend' },
      { nav_id: 'docker', name: 'Docker', url: 'https://docker.com', description: '容器化部署平台', icon: F('docker.com'), category: 'backend' },
      { nav_id: 'kubernetes', name: 'Kubernetes', url: 'https://kubernetes.io', description: '容器编排系统', icon: F('kubernetes.io'), category: 'backend' },
      { nav_id: 'java', name: 'Java', url: 'https://www.java.com', description: '企业级编程语言', icon: F('java.com'), category: 'backend' },
      { nav_id: 'spring', name: 'Spring', url: 'https://spring.io', description: 'Java 企业级框架', icon: F('spring.io'), category: 'backend' },
      { nav_id: 'mysql', name: 'MySQL', url: 'https://www.mysql.com', description: '关系型数据库', icon: F('mysql.com'), category: 'backend' },
      { nav_id: 'postgresql', name: 'PostgreSQL', url: 'https://www.postgresql.org', description: '高级开源数据库', icon: F('postgresql.org'), category: 'backend' },
      { nav_id: 'mongodb', name: 'MongoDB', url: 'https://www.mongodb.com', description: '文档型 NoSQL 数据库', icon: F('mongodb.com'), category: 'backend' },
      { nav_id: 'redis', name: 'Redis', url: 'https://redis.io', description: '内存数据存储/缓存', icon: F('redis.io'), category: 'backend' },
      { nav_id: 'rabbitmq', name: 'RabbitMQ', url: 'https://www.rabbitmq.com', description: '消息队列服务', icon: F('rabbitmq.com'), category: 'backend' },
      { nav_id: 'kafka', name: 'Apache Kafka', url: 'https://kafka.apache.org', description: '高吞吐消息流平台', icon: F('apache.org'), category: 'backend' },
      { nav_id: 'nginx', name: 'Nginx', url: 'https://nginx.org', description: 'Web 服务器/反向代理', icon: F('nginx.org'), category: 'backend' },
      { nav_id: 'github', name: 'GitHub', url: 'https://github.com', description: '代码托管与协作', icon: F('github.com'), category: 'backend' },
      { nav_id: 'gitlab', name: 'GitLab', url: 'https://gitlab.com', description: '一体化 DevOps 平台', icon: F('gitlab.com'), category: 'backend' },
      { nav_id: 'ubuntu', name: 'Ubuntu', url: 'https://ubuntu.com', description: '流行 Linux 发行版', icon: F('ubuntu.com'), category: 'backend' },
      { nav_id: 'jenkins', name: 'Jenkins', url: 'https://www.jenkins.io', description: '自动化 CI/CD 服务器', icon: F('jenkins.io'), category: 'backend' },
      { nav_id: 'elasticsearch', name: 'Elasticsearch', url: 'https://www.elastic.co', description: '分布式搜索引擎', icon: F('elastic.co'), category: 'backend' }
    ],
    // ==================== 电影/视频导航 (20) ====================
    movie: [
      { nav_id: 'youtube', name: 'YouTube', url: 'https://youtube.com', description: '全球视频分享平台', icon: F('youtube.com'), category: 'movie' },
      { nav_id: 'bilibili', name: '哔哩哔哩', url: 'https://bilibili.com', description: '弹幕视频网站', icon: F('bilibili.com'), category: 'movie' },
      { nav_id: 'netflix', name: 'Netflix', url: 'https://netflix.com', description: '流媒体服务', icon: F('netflix.com'), category: 'movie' },
      { nav_id: 'iqiyi', name: '爱奇艺', url: 'https://iqiyi.com', description: '综合视频网站', icon: F('iqiyi.com'), category: 'movie' },
      { nav_id: 'tencent-video', name: '腾讯视频', url: 'https://v.qq.com', description: '在线视频平台', icon: F('qq.com'), category: 'movie' },
      { nav_id: 'youku', name: '优酷', url: 'https://www.youku.com', description: '视频播放平台', icon: F('youku.com'), category: 'movie' },
      { nav_id: 'mgtv', name: '芒果 TV', url: 'https://www.mgtv.com', description: '湖南广电视频平台', icon: F('mgtv.com'), category: 'movie' },
      { nav_id: 'sohu-video', name: '搜狐视频', url: 'https://tv.sohu.com', description: '综合视频平台', icon: F('sohu.com'), category: 'movie' },
      { nav_id: 'douban-movie', name: '豆瓣电影', url: 'https://movie.douban.com', description: '电影评分与社区', icon: F('douban.com'), category: 'movie' },
      { nav_id: 'maoyan', name: '猫眼电影', url: 'https://maoyan.com', description: '电影资讯与购票', icon: F('maoyan.com'), category: 'movie' },
      { nav_id: 'taopiaopiao', name: '淘票票', url: 'https://taopiaopiao.com', description: '电影票在线购买', icon: F('taobao.com'), category: 'movie' },
      { nav_id: 'imdb', name: 'IMDb', url: 'https://www.imdb.com', description: '全球电影评分数据库', icon: F('imdb.com'), category: 'movie' },
      { nav_id: 'rottentomatoes', name: 'Rotten Tomatoes', url: 'https://rottentomatoes.com', description: '电影影评聚合', icon: F('rottentomatoes.com'), category: 'movie' },
      { nav_id: 'hbo', name: 'HBO Max', url: 'https://www.hbo.com', description: '原创剧集平台', icon: F('hbo.com'), category: 'movie' },
      { nav_id: 'disney', name: 'Disney+', url: 'https://www.disneyplus.com', description: '迪士尼流媒体', icon: F('disneyplus.com'), category: 'movie' },
      { nav_id: 'primevideo', name: 'Prime Video', url: 'https://www.primevideo.com', description: '亚马逊流媒体', icon: F('amazon.com'), category: 'movie' },
      { nav_id: 'appletv', name: 'Apple TV+', url: 'https://tv.apple.com', description: '苹果原创视频', icon: F('apple.com'), category: 'movie' },
      { nav_id: 'm1905', name: '1905 电影网', url: 'https://www.1905.com', description: '电影频道官方平台', icon: F('1905.com'), category: 'movie' },
      { nav_id: 'acfun', name: 'AcFun', url: 'https://www.acfun.cn', description: '弹幕视频平台', icon: F('acfun.cn'), category: 'movie' },
      { nav_id: 'xigua', name: '西瓜视频', url: 'https://www.ixigua.com', description: '中视频平台', icon: F('ixigua.com'), category: 'movie' }
    ],
    // ==================== 音乐导航 (20) ====================
    music: [
      { nav_id: 'netease-music', name: '网易云音乐', url: 'https://music.163.com', description: '在线音乐平台', icon: F('163.com'), category: 'music' },
      { nav_id: 'qq-music', name: 'QQ 音乐', url: 'https://y.qq.com', description: '腾讯在线音乐', icon: F('qq.com'), category: 'music' },
      { nav_id: 'spotify', name: 'Spotify', url: 'https://spotify.com', description: '全球音乐流媒体', icon: F('spotify.com'), category: 'music' },
      { nav_id: 'kuwo', name: '酷我音乐', url: 'https://kuwo.cn', description: '在线音乐服务', icon: F('kuwo.cn'), category: 'music' },
      { nav_id: 'kugou', name: '酷狗音乐', url: 'https://www.kugou.com', description: '数字音乐平台', icon: F('kugou.com'), category: 'music' },
      { nav_id: 'apple-music', name: 'Apple Music', url: 'https://music.apple.com', description: '苹果订阅音乐', icon: F('apple.com'), category: 'music' },
      { nav_id: 'migu', name: '咪咕音乐', url: 'https://music.migu.cn', description: '移动咪咕音乐', icon: F('migu.cn'), category: 'music' },
      { nav_id: 'soundcloud', name: 'SoundCloud', url: 'https://soundcloud.com', description: '独立音乐人平台', icon: F('soundcloud.com'), category: 'music' },
      { nav_id: 'tidal', name: 'TIDAL', url: 'https://tidal.com', description: '高保真音乐流媒体', icon: F('tidal.com'), category: 'music' },
      { nav_id: 'deezer', name: 'Deezer', url: 'https://www.deezer.com', description: '全球音乐流媒体', icon: F('deezer.com'), category: 'music' },
      { nav_id: 'pandora', name: 'Pandora', url: 'https://www.pandora.com', description: '智能音乐电台', icon: F('pandora.com'), category: 'music' },
      { nav_id: 'bandcamp', name: 'Bandcamp', url: 'https://bandcamp.com', description: '独立音乐发行平台', icon: F('bandcamp.com'), category: 'music' },
      { nav_id: 'douban-music', name: '豆瓣音乐', url: 'https://music.douban.com', description: '音乐评分与推荐', icon: F('douban.com'), category: 'music' },
      { nav_id: 'amazon-music', name: 'Amazon Music', url: 'https://music.amazon.com', description: '亚马逊音乐', icon: F('amazon.com'), category: 'music' },
      { nav_id: 'youtube-music', name: 'YouTube Music', url: 'https://music.youtube.com', description: '谷歌音乐流媒体', icon: F('youtube.com'), category: 'music' },
      { nav_id: 'changba', name: '唱吧', url: 'https://changba.com', description: '手机 K 歌社区', icon: F('changba.com'), category: 'music' },
      { nav_id: 'quanmink', name: '全民 K 歌', url: 'https://kg.qq.com', description: '腾讯 K 歌平台', icon: F('qq.com'), category: 'music' },
      { nav_id: '5sing', name: '5sing 原创音乐', url: 'https://5sing.kugou.com', description: '原创音乐基地', icon: F('kugou.com'), category: 'music' },
      { nav_id: 'mixcloud', name: 'Mixcloud', url: 'https://www.mixcloud.com', description: 'DJ 混音/电台', icon: F('mixcloud.com'), category: 'music' },
      { nav_id: 'qianqian', name: '千千音乐', url: 'https://music.taihe.com', description: '太合音乐平台', icon: F('taihe.com'), category: 'music' }
    ]
  }
  return defaults[category] || []
}

export default request
