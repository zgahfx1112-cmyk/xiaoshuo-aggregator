import { NextRequest, NextResponse } from 'next/server'
import { cacheGet, cacheSet, CacheKeys, CacheTTL } from '@/lib/redis'

// Mock hot novels data
const mockHotNovels: Record<string, Array<{
  id: string
  title: string
  author: string
  cover: string
  category: string
  status: string
  wordCount: number
  rating: number
  rank: number
}>> = {
  '玄幻': [
    { id: '1', title: '斗破苍穹', author: '天蚕土豆', cover: '/covers/1.jpg', category: '玄幻', status: '完结', wordCount: 5300000, rating: 9.2, rank: 1 },
    { id: '2', title: '遮天', author: '辰东', cover: '/covers/2.jpg', category: '玄幻', status: '完结', wordCount: 4500000, rating: 9.0, rank: 2 },
    { id: '3', title: '完美世界', author: '辰东', cover: '/covers/3.jpg', category: '玄幻', status: '完结', wordCount: 4800000, rating: 8.9, rank: 3 },
    { id: '4', title: '凡人修仙传', author: '忘语', cover: '/covers/4.jpg', category: '玄幻', status: '完结', wordCount: 7400000, rating: 9.1, rank: 4 },
    { id: '5', title: '仙逆', author: '耳根', cover: '/covers/5.jpg', category: '玄幻', status: '完结', wordCount: 3800000, rating: 8.8, rank: 5 },
    { id: '6', title: '我欲封天', author: '耳根', cover: '/covers/6.jpg', category: '玄幻', status: '完结', wordCount: 4200000, rating: 8.7, rank: 6 },
    { id: '7', title: '一念永恒', author: '耳根', cover: '/covers/7.jpg', category: '玄幻', status: '完结', wordCount: 4600000, rating: 8.6, rank: 7 },
    { id: '8', title: '大主宰', author: '天蚕土豆', cover: '/covers/8.jpg', category: '玄幻', status: '完结', wordCount: 5100000, rating: 8.5, rank: 8 },
    { id: '9', title: '武动乾坤', author: '天蚕土豆', cover: '/covers/9.jpg', category: '玄幻', status: '完结', wordCount: 4200000, rating: 8.4, rank: 9 },
    { id: '10', title: '元尊', author: '天蚕土豆', cover: '/covers/10.jpg', category: '玄幻', status: '完结', wordCount: 5800000, rating: 8.3, rank: 10 },
  ],
  '都市': [
    { id: '11', title: '超级神基因', author: '十二翼黑暗炽天使', cover: '/covers/11.jpg', category: '都市', status: '完结', wordCount: 4600000, rating: 8.5, rank: 1 },
    { id: '12', title: '重生之财源滚滚', author: '老鹰吃小鸡', cover: '/covers/12.jpg', category: '都市', status: '完结', wordCount: 3200000, rating: 8.4, rank: 2 },
    { id: '13', title: '国民老公带回家', author: '叶非夜', cover: '/covers/13.jpg', category: '都市', status: '完结', wordCount: 2800000, rating: 8.3, rank: 3 },
    { id: '14', title: '天才医生', author: '柳下挥', cover: '/covers/14.jpg', category: '都市', status: '完结', wordCount: 4100000, rating: 8.2, rank: 4 },
    { id: '15', title: '校花的贴身高手', author: '天蚕土豆', cover: '/covers/15.jpg', category: '都市', status: '完结', wordCount: 8200000, rating: 8.1, rank: 5 },
    { id: '16', title: '都市奇门医圣', author: '一念', cover: '/covers/16.jpg', category: '都市', status: '连载', wordCount: 3500000, rating: 8.0, rank: 6 },
    { id: '17', title: '极品全能学生', author: '花都大少', cover: '/covers/17.jpg', category: '都市', status: '完结', wordCount: 5600000, rating: 7.9, rank: 7 },
    { id: '18', title: '重生之都市天仙', author: '万里云', cover: '/covers/18.jpg', category: '都市', status: '连载', wordCount: 2100000, rating: 7.8, rank: 8 },
    { id: '19', title: '都市最强仙尊', author: '九仙', cover: '/covers/19.jpg', category: '都市', status: '连载', wordCount: 1800000, rating: 7.7, rank: 9 },
    { id: '20', title: '超级兵王', author: '邹育', cover: '/covers/20.jpg', category: '都市', status: '完结', wordCount: 4400000, rating: 7.6, rank: 10 },
  ],
  '言情': [
    { id: '21', title: '微微一笑很倾城', author: '顾漫', cover: '/covers/21.jpg', category: '言情', status: '完结', wordCount: 980000, rating: 8.8, rank: 1 },
    { id: '22', title: '何以笙箫默', author: '顾漫', cover: '/covers/22.jpg', category: '言情', status: '完结', wordCount: 750000, rating: 8.7, rank: 2 },
    { id: '23', title: '杉杉来吃', author: '顾漫', cover: '/covers/23.jpg', category: '言情', status: '完结', wordCount: 820000, rating: 8.6, rank: 3 },
    { id: '24', title: '三生三世十里桃花', author: '唐七公子', cover: '/covers/24.jpg', category: '言情', status: '完结', wordCount: 1200000, rating: 8.5, rank: 4 },
    { id: '25', title: '花千骨', author: '果果', cover: '/covers/25.jpg', category: '言情', status: '完结', wordCount: 1500000, rating: 8.4, rank: 5 },
    { id: '26', title: '知否知否应是绿肥红瘦', author: '关心则乱', cover: '/covers/26.jpg', category: '言情', status: '完结', wordCount: 2800000, rating: 8.3, rank: 6 },
    { id: '27', title: '琅琊榜', author: '海宴', cover: '/covers/27.jpg', category: '言情', status: '完结', wordCount: 1800000, rating: 8.2, rank: 7 },
    { id: '28', title: '甄嬛传', author: '流潋紫', cover: '/covers/28.jpg', category: '言情', status: '完结', wordCount: 2400000, rating: 8.1, rank: 8 },
    { id: '29', title: '锦绣未央', author: '秦简', cover: '/covers/29.jpg', category: '言情', status: '完结', wordCount: 1900000, rating: 8.0, rank: 9 },
    { id: '30', title: '楚乔传', author: '潇湘冬儿', cover: '/covers/30.jpg', category: '言情', status: '完结', wordCount: 1600000, rating: 7.9, rank: 10 },
  ],
  '历史': [
    { id: '31', title: '明朝那些事儿', author: '当年明月', cover: '/covers/31.jpg', category: '历史', status: '完结', wordCount: 1700000, rating: 9.5, rank: 1 },
    { id: '32', title: '赘婿', author: '愤怒的香蕉', cover: '/covers/32.jpg', category: '历史', status: '连载', wordCount: 5800000, rating: 9.0, rank: 2 },
    { id: '33', title: '唐砖', author: '孑与2', cover: '/covers/33.jpg', category: '历史', status: '完结', wordCount: 3200000, rating: 8.8, rank: 3 },
    { id: '34', title: '庆余年', author: '猫腻', cover: '/covers/34.jpg', category: '历史', status: '完结', wordCount: 3800000, rating: 8.7, rank: 4 },
    { id: '35', title: '大明文魁', author: '幸福来敲门', cover: '/covers/35.jpg', category: '历史', status: '完结', wordCount: 2600000, rating: 8.6, rank: 5 },
    { id: '36', title: '汉乡', author: '孑与2', cover: '/covers/36.jpg', category: '历史', status: '完结', wordCount: 4200000, rating: 8.5, rank: 6 },
    { id: '37', title: '银狐', author: '孑与2', cover: '/covers/37.jpg', category: '历史', status: '完结', wordCount: 3800000, rating: 8.4, rank: 7 },
    { id: '38', title: '大宋的智慧', author: '孑与2', cover: '/covers/38.jpg', category: '历史', status: '完结', wordCount: 3400000, rating: 8.3, rank: 8 },
    { id: '39', title: '秦吏', author: '七月新番', cover: '/covers/39.jpg', category: '历史', status: '完结', wordCount: 2900000, rating: 8.2, rank: 9 },
    { id: '40', title: '战国明月', author: '七月新番', cover: '/covers/40.jpg', category: '历史', status: '完结', wordCount: 2400000, rating: 8.1, rank: 10 },
  ],
  '科幻': [
    { id: '41', title: '三体', author: '刘慈欣', cover: '/covers/41.jpg', category: '科幻', status: '完结', wordCount: 880000, rating: 9.6, rank: 1 },
    { id: '42', title: '球状闪电', author: '刘慈欣', cover: '/covers/42.jpg', category: '科幻', status: '完结', wordCount: 320000, rating: 9.0, rank: 2 },
    { id: '43', title: '流浪地球', author: '刘慈欣', cover: '/covers/43.jpg', category: '科幻', status: '完结', wordCount: 260000, rating: 8.8, rank: 3 },
    { id: '44', title: '超新星纪元', author: '刘慈欣', cover: '/covers/44.jpg', category: '科幻', status: '完结', wordCount: 450000, rating: 8.7, rank: 4 },
    { id: '45', title: '银河帝国基地', author: '艾萨克·阿西莫夫', cover: '/covers/45.jpg', category: '科幻', status: '完结', wordCount: 520000, rating: 8.6, rank: 5 },
    { id: '46', title: '沙丘', author: '弗兰克·赫伯特', cover: '/covers/46.jpg', category: '科幻', status: '完结', wordCount: 680000, rating: 8.5, rank: 6 },
    { id: '47', title: '海伯利安', author: '丹·西蒙斯', cover: '/covers/47.jpg', category: '科幻', status: '完结', wordCount: 540000, rating: 8.4, rank: 7 },
    { id: '48', title: '安德的游戏', author: '奥森·斯科特·卡德', cover: '/covers/48.jpg', category: '科幻', status: '完结', wordCount: 380000, rating: 8.3, rank: 8 },
    { id: '49', title: '火星救援', author: '安迪·威尔', cover: '/covers/49.jpg', category: '科幻', status: '完结', wordCount: 420000, rating: 8.2, rank: 9 },
    { id: '50', title: '神经漫游者', author: '威廉·吉布森', cover: '/covers/50.jpg', category: '科幻', status: '完结', wordCount: 360000, rating: 8.1, rank: 10 },
  ],
}

const categories = ['玄幻', '都市', '言情', '历史', '科幻']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || '玄幻'

    // Validate category
    if (!categories.includes(category)) {
      return NextResponse.json(
        { success: false, error: 'Invalid category' },
        { status: 400 }
      )
    }

    // Try to get from cache first
    const cacheKey = CacheKeys.hotNovels(category, 'daily')
    const cached = await cacheGet<Array<{
      id: string
      title: string
      author: string
      cover: string
      category: string
      status: string
      wordCount: number
      rating: number
      rank: number
    }>>(cacheKey)

    if (cached) {
      return NextResponse.json({
        success: true,
        data: { novels: cached },
      })
    }

    // Get mock data
    const novels = mockHotNovels[category] || []

    // Cache for 1 hour
    await cacheSet(cacheKey, novels, CacheTTL.MEDIUM)

    return NextResponse.json({
      success: true,
      data: { novels },
    })
  } catch (error) {
    console.error('Hot novels API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch hot novels' },
      { status: 500 }
    )
  }
}