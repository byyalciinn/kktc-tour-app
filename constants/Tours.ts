/**
 * KKTC (Kuzey Kıbrıs Türk Cumhuriyeti) Tour Data
 */

export interface Tour {
  id: string;
  title: string;
  location: string;
  description: string;
  duration: string;
  rating: number;
  reviewCount: number;
  image: string;
  highlights: string[];
  category: string;
}

export interface Promotion {
  id: string;
  title: string;
  subtitle: string;
  discount: string;
  buttonText: string;
  backgroundColor: string;
  image: string;
}

export const promotions: Promotion[] = [
  {
    id: '1',
    title: '3 Plaj ziyaret et',
    subtitle: '%50 indirim kazan',
    discount: '50%',
    buttonText: 'Kuponu Al',
    backgroundColor: '#E8F4FD',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop',
  },
  {
    id: '2',
    title: 'Tarihi yerler için',
    subtitle: '%30 indirim',
    discount: '30%',
    buttonText: 'Şimdi Rezerve Et',
    backgroundColor: '#1E3A5F',
    image: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=400&h=300&fit=crop',
  },
];

export const featuredTours: Tour[] = [
  {
    id: '1',
    title: 'Bellapais Manastırı',
    location: 'Girne, KKTC',
    description: '13. yüzyıldan kalma gotik mimari harikası manastırı keşfedin. Akdeniz\'in muhteşem manzarası eşliğinde tarihe yolculuk.',
    duration: '2 saat',
    rating: 4.8,
    reviewCount: 1247,
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
    highlights: ['Gotik mimari', 'Panoramik manzara', 'Rehberli tur'],
    category: 'history',
  },
  {
    id: '2',
    title: 'Altın Kum Plajı',
    location: 'Karpaz, KKTC',
    description: 'KKTC\'nin en güzel plajlarından biri. Altın sarısı kumları ve berrak suları ile unutulmaz bir deniz deneyimi.',
    duration: 'Tam gün',
    rating: 4.9,
    reviewCount: 2156,
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop',
    highlights: ['Altın kum', 'Berrak deniz', 'Doğal güzellik'],
    category: 'beach',
  },
  {
    id: '3',
    title: 'Salamis Antik Kenti',
    location: 'Gazimağusa, KKTC',
    description: 'Antik dönemin en önemli liman şehirlerinden biri. Roma hamamları, tiyatro ve gymnasium kalıntıları.',
    duration: '3 saat',
    rating: 4.7,
    reviewCount: 1823,
    image: 'https://images.unsplash.com/photo-1553913861-c0a9e9d5c5e9?w=800&h=600&fit=crop',
    highlights: ['Roma hamamları', 'Antik tiyatro', 'Mozaikler'],
    category: 'history',
  },
  {
    id: '4',
    title: 'Girne Kalesi',
    location: 'Girne, KKTC',
    description: 'Bizans döneminden kalma tarihi kale. İçinde batık gemi müzesi ve muhteşem liman manzarası.',
    duration: '2 saat',
    rating: 4.6,
    reviewCount: 2341,
    image: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800&h=600&fit=crop',
    highlights: ['Batık gemi müzesi', 'Liman manzarası', 'Tarihi surlar'],
    category: 'history',
  },
  {
    id: '5',
    title: 'Beşparmak Dağları',
    location: 'Girne, KKTC',
    description: 'Eşsiz doğa yürüyüşleri ve nefes kesen manzaralar. St. Hilarion Kalesi\'ne tırmanış.',
    duration: '4 saat',
    rating: 4.8,
    reviewCount: 987,
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop',
    highlights: ['Doğa yürüyüşü', 'St. Hilarion', 'Panoramik manzara'],
    category: 'mountain',
  },
  {
    id: '6',
    title: 'Karpaz Eşekleri Safari',
    location: 'Karpaz, KKTC',
    description: 'Karpaz yarımadasının ünlü yabani eşeklerini doğal ortamlarında görün.',
    duration: 'Yarım gün',
    rating: 4.5,
    reviewCount: 654,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
    highlights: ['Yabani eşekler', 'Doğa turu', 'Fotoğraf imkanı'],
    category: 'nature',
  },
];

export const categories = [
  { id: 'all', name: 'Tümü', icon: 'apps-outline' },
  { id: 'beach', name: 'Plaj', icon: 'sunny-outline' },
  { id: 'mountain', name: 'Dağ', icon: 'trail-sign-outline' },
  { id: 'history', name: 'Tarihi', icon: 'library-outline' },
  { id: 'nature', name: 'Doğa', icon: 'leaf-outline' },
];

export const cafes = [
  {
    id: '1',
    name: 'The Soulist Coffee',
    location: 'Girne',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop',
  },
  {
    id: '2',
    name: 'Cafe Nero',
    location: 'Lefkoşa',
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop',
  },
];
