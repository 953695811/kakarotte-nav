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
    if (url.includes('/categories')) {
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
      config.adapter = async () => ({
        data: { code: 200, data: merged },
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      })
    } else if (url.includes('/navigation/search')) {
      const keyword = config.params?.keyword || ''
      const navItems = JSON.parse(localStorage.getItem('kakarotte_local_nav_items') || '[]')
      const results = navItems.filter(item =>
        item.name?.toLowerCase().includes(keyword.toLowerCase()) ||
        item.url?.toLowerCase().includes(keyword.toLowerCase()) ||
        item.description?.toLowerCase().includes(keyword.toLowerCase())
      )
      config.adapter = async () => ({
        data: { code: 200, data: results },
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      })
    } else if (url.startsWith('/navigation')) {
      const parts = url.split('/').filter(Boolean)
      const category = parts[1] || ''
      const navItems = JSON.parse(localStorage.getItem('kakarotte_local_nav_items') || '[]')
      const defaultItems = getDefaultNavigation(category)
      const localItems = navItems.filter(i => i.category === category)
      const merged = [...defaultItems, ...localItems.filter(i => !defaultItems.find(d => d.nav_id === i.nav_id))]
      config.adapter = async () => ({
        data: { code: 200, data: merged },
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      })
    }
    return config
  })
}

function getDefaultNavigation(category) {
  const defaults = {
    hot: [
      { nav_id: 'baidu', name: '百度', url: 'https://www.baidu.com', description: '中文搜索引擎', icon: '🔍', category: 'hot' },
      { nav_id: 'taobao', name: '淘宝', url: 'https://www.taobao.com', description: '电商购物平台', icon: '🛒', category: 'hot' },
      { nav_id: 'jd', name: '京东', url: 'https://www.jd.com', description: '综合网购平台', icon: '📦', category: 'hot' },
      { nav_id: 'zhihu', name: '知乎', url: 'https://www.zhihu.com', description: '问答社区', icon: '❓', category: 'hot' },
      { nav_id: 'weibo', name: '微博', url: 'https://weibo.com', description: '社交平台', icon: '📱', category: 'hot' },
      { nav_id: 'bilibili', name: '哔哩哔哩', url: 'https://www.bilibili.com', description: '弹幕视频网站', icon: '📺', category: 'hot' },
      { nav_id: 'douyin', name: '抖音', url: 'https://www.douyin.com', description: '短视频平台', icon: '🎬', category: 'hot' },
      { nav_id: 'weixin', name: '微信', url: 'https://weixin.qq.com', description: '即时通讯', icon: '💬', category: 'hot' },
      { nav_id: 'alipay', name: '支付宝', url: 'https://www.alipay.com', description: '第三方支付', icon: '💳', category: 'hot' },
      { nav_id: 'meituan', name: '美团', url: 'https://www.meituan.com', description: '生活服务平台', icon: '🍔', category: 'hot' },
      { nav_id: 'netease-music-hot', name: '网易云音乐', url: 'https://music.163.com', description: '音乐平台', icon: '🎵', category: 'hot' },
      { nav_id: 'tencent-video', name: '腾讯视频', url: 'https://v.qq.com', description: '在线视频平台', icon: '📹', category: 'hot' },
      { nav_id: 'ctrip', name: '携程', url: 'https://www.ctrip.com', description: '旅行预订平台', icon: '✈️', category: 'hot' },
      { nav_id: 'didi', name: '滴滴', url: 'https://www.didi.com', description: '出行打车平台', icon: '🚗', category: 'hot' },
      { nav_id: 'juejin', name: '掘金', url: 'https://juejin.cn', description: '开发者技术社区', icon: '⛏️', category: 'hot' }
    ],
    frontend: [
      { nav_id: 'vuejs', name: 'Vue.js', url: 'https://vuejs.org', description: '渐进式 JavaScript 框架', icon: 'V', category: 'frontend' },
      { nav_id: 'react', name: 'React', url: 'https://react.dev', description: '用于构建用户界面的库', icon: 'R', category: 'frontend' },
      { nav_id: 'vite', name: 'Vite', url: 'https://vitejs.dev', description: '下一代前端构建工具', icon: 'Vi', category: 'frontend' },
      { nav_id: 'element-plus', name: 'Element Plus', url: 'https://element-plus.org', description: 'Vue 3 的组件库', icon: 'EP', category: 'frontend' },
      { nav_id: 'ant-design', name: 'Ant Design', url: 'https://ant.design', description: '企业级 UI 设计语言', icon: 'AD', category: 'frontend' },
      { nav_id: 'mdn', name: 'MDN Web Docs', url: 'https://developer.mozilla.org', description: 'Web 开发者文档', icon: 'MDN', category: 'frontend' },
      { nav_id: 'tailwind', name: 'Tailwind CSS', url: 'https://tailwindcss.com', description: '实用优先的 CSS 框架', icon: 'T', category: 'frontend' },
      { nav_id: 'typescript', name: 'TypeScript', url: 'https://www.typescriptlang.org', description: 'JavaScript 的超集', icon: 'TS', category: 'frontend' },
      { nav_id: 'pinia', name: 'Pinia', url: 'https://pinia.vuejs.org', description: 'Vue 的状态管理库', icon: 'P', category: 'frontend' },
      { nav_id: 'vue-router', name: 'Vue Router', url: 'https://router.vuejs.org', description: 'Vue.js 官方路由', icon: 'VR', category: 'frontend' },
      { nav_id: 'nextjs', name: 'Next.js', url: 'https://nextjs.org', description: 'React 全栈框架', icon: 'N', category: 'frontend' },
      { nav_id: 'nuxtjs', name: 'Nuxt.js', url: 'https://nuxt.com', description: 'Vue 全栈框架', icon: 'Nu', category: 'frontend' }
    ],
    design: [
      { nav_id: 'figma', name: 'Figma', url: 'https://figma.com', description: '协作式界面设计工具', icon: 'F', category: 'design' },
      { nav_id: 'dribbble', name: 'Dribbble', url: 'https://dribbble.com', description: '设计师灵感社区', icon: 'D', category: 'design' },
      { nav_id: 'behance', name: 'Behance', url: 'https://behance.net', description: '创意作品展示平台', icon: 'B', category: 'design' },
      { nav_id: 'sketch', name: 'Sketch', url: 'https://sketch.com', description: '矢量绘图工具', icon: 'S', category: 'design' },
      { nav_id: 'adobe-xd', name: 'Adobe XD', url: 'https://xd.adobe.com', description: '原型设计工具', icon: 'XD', category: 'design' },
      { nav_id: 'iconfont', name: 'Iconfont', url: 'https://iconfont.cn', description: '阿里巴巴矢量图标库', icon: 'IF', category: 'design' }
    ],
    backend: [
      { nav_id: 'nodejs', name: 'Node.js', url: 'https://nodejs.org', description: 'JavaScript 运行时', icon: 'N', category: 'backend' },
      { nav_id: 'python', name: 'Python', url: 'https://python.org', description: '通用编程语言', icon: 'Py', category: 'backend' },
      { nav_id: 'golang', name: 'Go', url: 'https://go.dev', description: 'Google 开发的编程语言', icon: 'Go', category: 'backend' },
      { nav_id: 'rust', name: 'Rust', url: 'https://rust-lang.org', description: '系统级编程语言', icon: 'Rs', category: 'backend' },
      { nav_id: 'docker', name: 'Docker', url: 'https://docker.com', description: '容器化部署平台', icon: 'Dk', category: 'backend' },
      { nav_id: 'kubernetes', name: 'Kubernetes', url: 'https://kubernetes.io', description: '容器编排系统', icon: 'K8s', category: 'backend' }
    ],
    movie: [
      { nav_id: 'youtube', name: 'YouTube', url: 'https://youtube.com', description: '视频分享平台', icon: 'YT', category: 'movie' },
      { nav_id: 'bilibili', name: '哔哩哔哩', url: 'https://bilibili.com', description: '弹幕视频网站', icon: 'B', category: 'movie' },
      { nav_id: 'netflix', name: 'Netflix', url: 'https://netflix.com', description: '在线流媒体服务', icon: 'N', category: 'movie' },
      { nav_id: 'iqiyi', name: '爱奇艺', url: 'https://iqiyi.com', description: '在线视频网站', icon: 'iQ', category: 'movie' },
      { nav_id: 'tencent-video', name: '腾讯视频', url: 'https://v.qq.com', description: '在线视频平台', icon: 'Tx', category: 'movie' }
    ],
    music: [
      { nav_id: 'netease-music', name: '网易云音乐', url: 'https://music.163.com', description: '在线音乐平台', icon: 'N', category: 'music' },
      { nav_id: 'qq-music', name: 'QQ音乐', url: 'https://y.qq.com', description: '在线音乐播放器', icon: 'Q', category: 'music' },
      { nav_id: 'spotify', name: 'Spotify', url: 'https://spotify.com', description: '全球音乐流媒体', icon: 'S', category: 'music' },
      { nav_id: 'kuwo', name: '酷我音乐', url: 'https://kuwo.cn', description: '在线音乐服务', icon: 'K', category: 'music' }
    ]
  }
  return defaults[category] || []
}

export default request
