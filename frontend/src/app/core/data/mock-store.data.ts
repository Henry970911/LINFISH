import { CatalogFilterGroup, Category, OrderSummary, Product } from '../models/store.models';

export const CATEGORIES: Category[] = [
  { id: 1, slug: 'fish', name: '觀賞魚類', icon: '🐠', description: '燈科、鼠魚、孔雀魚與特色魚種', accent: '#dff5f1', itemCount: 126 },
  { id: 2, slug: 'equipment', name: '水族用具', icon: '🦐', description: '米蝦、藻蝦與精選水晶蝦', accent: '#fff0db', itemCount: 28 },
  { id: 3, slug: 'food', name: '飼料', icon: '🌿', description: '陰性草、莫斯與自然造景素材', accent: '#e8f3d9', itemCount: 42 },
];

export const CATALOG_FILTER_GROUPS: CatalogFilterGroup[] = [
  {
    slug: 'fish',
    name: '觀賞魚類',
    itemCount: 25,
    description: '依魚種特色與飼養習性挑選適合的觀賞魚。',
    options: [
      { slug: 'special-fish', name: '特殊魚、珍稀魚、大型魚', itemCount: 0 },
      { slug: 'cichlids', name: '慈鯛科', itemCount: 0 },
      { slug: 'koi', name: '錦鯉、蝴蝶鯉、龍鯉', itemCount: 0 },
      { slug: 'livebearers', name: '球魚、孔雀魚', itemCount: 0 },
      { slug: 'small-fish', name: '燈科魚、小型魚', itemCount: 0 },
      { slug: 'goldfish', name: '金魚', itemCount: 0 },
      { slug: 'angelfish', name: '神仙魚', itemCount: 0 },
      { slug: 'bottom-dwellers', name: '底棲魚、鼠魚、蝦', itemCount: 0 },
    ],
  },
  {
    slug: 'equipment',
    name: '水族用具',
    itemCount: 38,
    description: '過濾、控溫、照明與水質管理所需用品。',
    options: [
      { slug: 'filter-media', name: '濾材類', itemCount: 0 },
      { slug: 'filters', name: '過濾器', itemCount: 0 },
      { slug: 'heaters', name: '加溫器', itemCount: 0 },
      { slug: 'lights', name: '燈具、增豔燈', itemCount: 0 },
      { slug: 'pumps', name: '馬達', itemCount: 0 },
      { slug: 'air-pumps', name: '打氣機', itemCount: 0 },
      { slug: 'reptile', name: '烏龜爬蟲類', itemCount: 0 },
      { slug: 'water-care', name: '水質管理', itemCount: 0 },
      { slug: 'equipment-other', name: '其他', itemCount: 0 },
    ],
  },
  {
    slug: 'food',
    name: '飼料',
    itemCount: 18,
    description: '依魚種、食性與顆粒大小選擇日常飼料。',
    options: [
      { slug: 'best-sellers', name: '熱銷冠軍推薦飼料', itemCount: 0 },
      { slug: 'carnivore-food', name: '龍魚飼料、肉食性魚種飼料', itemCount: 0 },
      { slug: 'small-fish-food', name: '小型魚飼料', itemCount: 0 },
      { slug: 'goldfish-food', name: '金魚飼料', itemCount: 0 },
      { slug: 'koi-food', name: '錦鯉、蝴蝶鯉、溪魚飼料', itemCount: 0 },
      { slug: 'turtle-food', name: '澤龜、陸龜飼料', itemCount: 0 },
      { slug: 'tropical-food', name: 'Tropical', itemCount: 0 },
      { slug: 'bulk-refill', name: '公斤補充包', itemCount: 0 },
    ],
  },
];

export const PRODUCTS: Product[] = [
  { id: 1, slug: 'super-red-tetra', name: '超級紅魔鬼燈', scientificName: 'Hyphessobrycon sp.', categorySlug: 'tropical-fish', groupSlug: 'fish', subcategorySlug: 'small-fish', price: 320, compareAtPrice: 380, badge: '人氣 TOP 1', emoji: '🐟', gradient: 'linear-gradient(145deg,#f8ddd5,#f59b88)', description: '體色飽和、群游效果亮眼，適合草缸中前景活動。', careLevel: '中等', size: '3–4 cm', temperature: '23–28°C', stock: 24, featured: true },
  { id: 2, slug: 'golden-molly', name: '黃金檸檬琴尾茉莉', scientificName: 'Poecilia sphenops', categorySlug: 'tropical-fish', groupSlug: 'fish', subcategorySlug: 'livebearers', price: 180, badge: '本週新品', emoji: '🐠', gradient: 'linear-gradient(145deg,#fff1bc,#f7c84c)', description: '明亮金黃色澤與優雅琴尾，活潑且容易飼養。', careLevel: '入門', size: '4–5 cm', temperature: '24–28°C', stock: 38, featured: true, isNew: true },
  { id: 3, slug: 'corydoras-panda', name: '熊貓鼠魚', scientificName: 'Corydoras panda', categorySlug: 'tropical-fish', groupSlug: 'fish', subcategorySlug: 'bottom-dwellers', price: 160, badge: '店長推薦', emoji: '🐟', gradient: 'linear-gradient(145deg,#edf0eb,#aab6a3)', description: '個性溫和的底層魚，適合小群飼養，模樣討喜。', careLevel: '入門', size: '3–4 cm', temperature: '22–26°C', stock: 16, featured: true },
  { id: 4, slug: 'blue-dream-shrimp', name: '極火藍夢米蝦', scientificName: 'Neocaridina davidi', categorySlug: 'shrimp', groupSlug: 'fish', subcategorySlug: 'bottom-dwellers', price: 120, emoji: '🦐', gradient: 'linear-gradient(145deg,#d8eff6,#71b8d0)', description: '深藍色系的除藻小幫手，適合穩定水質的草缸。', careLevel: '中等', size: '1.5–2 cm', temperature: '20–26°C', stock: 54, featured: true, isNew: true },
  { id: 5, slug: 'anubias-nana', name: '迷你小榕沉木組', categorySlug: 'plants', groupSlug: 'equipment', subcategorySlug: 'equipment-other', price: 260, compareAtPrice: 300, badge: '免 CO₂', emoji: '🌿', gradient: 'linear-gradient(145deg,#dff2d6,#7ebc68)', description: '耐陰好照顧，已固定於小型沉木，可直接入缸。', careLevel: '入門', size: '8–12 cm', temperature: '20–28°C', stock: 12, featured: true },
  { id: 6, slug: 'micro-pellet', name: '高蛋白小型魚主食', categorySlug: 'food', groupSlug: 'food', subcategorySlug: 'small-fish-food', price: 220, emoji: '🥣', gradient: 'linear-gradient(145deg,#f7ead8,#c89062)', description: '緩沉型細顆粒配方，適合燈科、孔雀魚與小型魚。', careLevel: '入門', size: '45 g', temperature: '常溫保存', stock: 42, featured: true },
  { id: 7, slug: 'nano-filter', name: '靜音迷你外掛過濾器', categorySlug: 'equipment', groupSlug: 'equipment', subcategorySlug: 'filters', price: 580, badge: '熱銷', emoji: '⚙️', gradient: 'linear-gradient(145deg,#e3ecf8,#87a4c3)', description: '可調式流量，適用 20–35 公分小缸，維護方便。', careLevel: '入門', size: '5 W', temperature: '淡海水皆可', stock: 9, featured: true },
  { id: 8, slug: 'dragon-stone', name: '青龍石造景組', categorySlug: 'aquascape', groupSlug: 'equipment', subcategorySlug: 'equipment-other', price: 450, emoji: '🪨', gradient: 'linear-gradient(145deg,#e9e4dd,#9d9489)', description: '紋理自然的精選造景石，已搭配大中小尺寸。', careLevel: '入門', size: '約 3 kg', temperature: '使用前清洗', stock: 18, isNew: true },
  { id: 9, slug: 'red-white-ranchu', name: '進口紅白蘭壽', categorySlug: 'tropical-fish', groupSlug: 'fish', subcategorySlug: 'goldfish', price: 1280, badge: '限量', emoji: '🐡', gradient: 'linear-gradient(145deg,#fff1ed,#e98470)', description: '紅白分明、背線流暢，每尾花色皆不相同。', careLevel: '進階', size: '6–8 cm', temperature: '20–26°C', stock: 4, isNew: true },
  { id: 10, slug: 'christmas-moss', name: '聖誕莫斯網片', categorySlug: 'plants', groupSlug: 'equipment', subcategorySlug: 'equipment-other', price: 150, emoji: '🌱', gradient: 'linear-gradient(145deg,#e6f2d8,#6f9d59)', description: '層次分明的莫斯品種，適合蝦缸與前景配置。', careLevel: '入門', size: '5 × 5 cm', temperature: '20–27°C', stock: 32, isNew: true },
];

export const ORDERS: OrderSummary[] = [
  { id: 'LF20261118001', date: '2026/11/18', status: '處理中', total: 980, itemCount: 3 },
  { id: 'LF20261027006', date: '2026/10/27', status: '已完成', total: 1460, itemCount: 5 },
  { id: 'LF20260914002', date: '2026/09/14', status: '已完成', total: 720, itemCount: 2 },
];

