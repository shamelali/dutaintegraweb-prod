export type DemoChannel = 'direct' | 'referral' | 'social' | 'email' | 'ads';
export type DemoStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

export interface DemoOrderItem {
  product: string;
  sku: string;
  qty: number;
  unitPrice: number; // fen, integer
}

export interface DemoOrder {
  id: string;
  date: string; // YYYY-MM-DD, UTC
  customer: string;
  email: string;
  channel: DemoChannel;
  status: DemoStatus;
  amount: number; // fen, integer = sum(qty * unitPrice)
  items: readonly DemoOrderItem[];
}

export const DEMO_CHANNELS: readonly DemoChannel[] = ['direct', 'referral', 'social', 'email', 'ads'];
export const DEMO_STATUSES: readonly DemoStatus[] = ['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'];

export const DEMO_ORDERS: readonly DemoOrder[] = [
  { id: 'demo-0001', date: '2026-08-21', customer: 'Amanda Tan', email: 'amanda.tan@example.com', channel: 'direct', status: 'delivered', amount: 7900, items: [{ product: 'Wireless Mouse', sku: 'MS-100', qty: 1, unitPrice: 7900 }] },
  { id: 'demo-0002', date: '2026-08-22', customer: 'Budi Setiawan', email: 'budi.s@example.com', channel: 'ads', status: 'paid', amount: 44900, items: [{ product: 'Mechanical Keyboard', sku: 'KB-200', qty: 1, unitPrice: 44900 }] },
  { id: 'demo-0003', date: '2026-08-23', customer: 'Chan Mei Ling', email: 'chan.ml@example.com', channel: 'referral', status: 'shipped', amount: 25800, items: [{ product: 'USB-C Hub', sku: 'HUB-300', qty: 2, unitPrice: 12900 }] },
  { id: 'demo-0004', date: '2026-08-24', customer: 'Dara Ibrahim', email: 'dara.i@example.com', channel: 'social', status: 'delivered', amount: 89900, items: [{ product: '27-inch Monitor', sku: 'MN-400', qty: 1, unitPrice: 89900 }] },
  { id: 'demo-0005', date: '2026-08-25', customer: 'Elias Wong', email: 'elias.w@example.com', channel: 'email', status: 'pending', amount: 19900, items: [{ product: 'Webcam 1080p', sku: 'WC-500', qty: 1, unitPrice: 19900 }] },
  { id: 'demo-0006', date: '2026-08-26', customer: 'Fatimah Yusof', email: 'fatimah.y@example.com', channel: 'direct', status: 'delivered', amount: 43800, items: [{ product: 'Laptop Stand', sku: 'LS-600', qty: 1, unitPrice: 34900 }, { product: 'Desk Lamp', sku: 'DL-800', qty: 1, unitPrice: 8900 }] },
  { id: 'demo-0007', date: '2026-08-28', customer: 'George Lim', email: 'george.l@example.com', channel: 'ads', status: 'cancelled', amount: 44900, items: [{ product: 'Mechanical Keyboard', sku: 'KB-200', qty: 1, unitPrice: 44900 }] },
  { id: 'demo-0008', date: '2026-08-29', customer: 'Hwei Chen', email: 'hwei.c@example.com', channel: 'referral', status: 'delivered', amount: 25800, items: [{ product: 'Noise Headphones', sku: 'HP-700', qty: 2, unitPrice: 12900 }] },
  { id: 'demo-0009', date: '2026-08-30', customer: 'Isabella Ong', email: 'isabella.o@example.com', channel: 'social', status: 'shipped', amount: 23700, items: [{ product: 'Wireless Mouse', sku: 'MS-100', qty: 3, unitPrice: 7900 }] },
  { id: 'demo-0010', date: '2026-09-01', customer: 'Joshua Tan', email: 'joshua.t@example.com', channel: 'email', status: 'paid', amount: 89900, items: [{ product: '27-inch Monitor', sku: 'MN-400', qty: 1, unitPrice: 89900 }] },
  { id: 'demo-0011', date: '2026-09-02', customer: 'Kavitha R', email: 'kavitha.r@example.com', channel: 'direct', status: 'delivered', amount: 32800, items: [{ product: 'USB-C Hub', sku: 'HUB-300', qty: 1, unitPrice: 12900 }, { product: 'Webcam 1080p', sku: 'WC-500', qty: 1, unitPrice: 19900 }] },
  { id: 'demo-0012', date: '2026-09-04', customer: 'Lionel Phoon', email: 'lionel.p@example.com', channel: 'ads', status: 'refunded', amount: 17800, items: [{ product: 'Desk Lamp', sku: 'DL-800', qty: 2, unitPrice: 8900 }] },
  { id: 'demo-0013', date: '2026-09-05', customer: 'Mei Ling Chong', email: 'mei.ling@example.com', channel: 'referral', status: 'paid', amount: 52800, items: [{ product: 'Wireless Mouse', sku: 'MS-100', qty: 1, unitPrice: 7900 }, { product: 'Mechanical Keyboard', sku: 'KB-200', qty: 1, unitPrice: 44900 }] },
  { id: 'demo-0014', date: '2026-09-07', customer: 'Nordin Bin Ali', email: 'nordin.a@example.com', channel: 'social', status: 'shipped', amount: 102800, items: [{ product: '27-inch Monitor', sku: 'MN-400', qty: 1, unitPrice: 89900 }, { product: 'Noise Headphones', sku: 'HP-700', qty: 1, unitPrice: 12900 }] },
  { id: 'demo-0015', date: '2026-09-09', customer: 'Olivia Lim', email: 'olivia.l@example.com', channel: 'email', status: 'delivered', amount: 34900, items: [{ product: 'Laptop Stand', sku: 'LS-600', qty: 1, unitPrice: 34900 }] },
  { id: 'demo-0016', date: '2026-09-10', customer: 'Priya Nair', email: 'priya.n@example.com', channel: 'direct', status: 'pending', amount: 39800, items: [{ product: 'Webcam 1080p', sku: 'WC-500', qty: 2, unitPrice: 19900 }] },
  { id: 'demo-0017', date: '2026-09-12', customer: 'Quentin Ng', email: 'quentin.n@example.com', channel: 'ads', status: 'delivered', amount: 38700, items: [{ product: 'USB-C Hub', sku: 'HUB-300', qty: 3, unitPrice: 12900 }] },
  { id: 'demo-0018', date: '2026-09-14', customer: 'Rina Sari', email: 'rina.s@example.com', channel: 'social', status: 'cancelled', amount: 44900, items: [{ product: 'Mechanical Keyboard', sku: 'KB-200', qty: 1, unitPrice: 44900 }] },
  { id: 'demo-0019', date: '2026-09-16', customer: 'Siti Aminah', email: 'siti.a@example.com', channel: 'email', status: 'paid', amount: 31600, items: [{ product: 'Wireless Mouse', sku: 'MS-100', qty: 4, unitPrice: 7900 }] },
  { id: 'demo-0020', date: '2026-09-18', customer: 'Titus Low', email: 'titus.l@example.com', channel: 'referral', status: 'delivered', amount: 98800, items: [{ product: 'Desk Lamp', sku: 'DL-800', qty: 1, unitPrice: 8900 }, { product: '27-inch Monitor', sku: 'MN-400', qty: 1, unitPrice: 89900 }] },
  { id: 'demo-0021', date: '2026-09-20', customer: 'Ursula Tan', email: 'ursula.t@example.com', channel: 'direct', status: 'shipped', amount: 54800, items: [{ product: 'Webcam 1080p', sku: 'WC-500', qty: 1, unitPrice: 19900 }, { product: 'Laptop Stand', sku: 'LS-600', qty: 1, unitPrice: 34900 }] },
  { id: 'demo-0022', date: '2026-09-22', customer: 'Victor Chia', email: 'victor.c@example.com', channel: 'social', status: 'pending', amount: 44900, items: [{ product: 'Mechanical Keyboard', sku: 'KB-200', qty: 1, unitPrice: 44900 }] },
  { id: 'demo-0023', date: '2026-09-24', customer: 'Wendy Low', email: 'wendy.l@example.com', channel: 'ads', status: 'delivered', amount: 25800, items: [{ product: 'Noise Headphones', sku: 'HP-700', qty: 1, unitPrice: 12900 }, { product: 'USB-C Hub', sku: 'HUB-300', qty: 1, unitPrice: 12900 }] },
  { id: 'demo-0024', date: '2026-09-26', customer: 'Xian Lim', email: 'xian.l@example.com', channel: 'email', status: 'shipped', amount: 15800, items: [{ product: 'Wireless Mouse', sku: 'MS-100', qty: 2, unitPrice: 7900 }] },
  { id: 'demo-0025', date: '2026-09-28', customer: 'Yvonne Ho', email: 'yvonne.h@example.com', channel: 'direct', status: 'cancelled', amount: 89900, items: [{ product: '27-inch Monitor', sku: 'MN-400', qty: 1, unitPrice: 89900 }] },
  { id: 'demo-0026', date: '2026-09-30', customer: 'Zane Lim', email: 'zane.l@example.com', channel: 'referral', status: 'paid', amount: 69800, items: [{ product: 'Laptop Stand', sku: 'LS-600', qty: 2, unitPrice: 34900 }] },
  { id: 'demo-0027', date: '2026-10-02', customer: 'Aaron Tan', email: 'aaron.t@example.com', channel: 'social', status: 'delivered', amount: 28800, items: [{ product: 'Webcam 1080p', sku: 'WC-500', qty: 1, unitPrice: 19900 }, { product: 'Desk Lamp', sku: 'DL-800', qty: 1, unitPrice: 8900 }] },
  { id: 'demo-0028', date: '2026-10-04', customer: 'Bella Ng', email: 'bella.n@example.com', channel: 'email', status: 'shipped', amount: 44900, items: [{ product: 'Mechanical Keyboard', sku: 'KB-200', qty: 1, unitPrice: 44900 }] },
  { id: 'demo-0029', date: '2026-10-06', customer: 'Carlos D', email: 'carlos.d@example.com', channel: 'ads', status: 'pending', amount: 32800, items: [{ product: 'USB-C Hub', sku: 'HUB-300', qty: 1, unitPrice: 12900 }, { product: 'Webcam 1080p', sku: 'WC-500', qty: 1, unitPrice: 19900 }] },
  { id: 'demo-0030', date: '2026-10-08', customer: 'Diana Lim', email: 'diana.l@example.com', channel: 'direct', status: 'delivered', amount: 16800, items: [{ product: 'Wireless Mouse', sku: 'MS-100', qty: 1, unitPrice: 7900 }, { product: 'Desk Lamp', sku: 'DL-800', qty: 1, unitPrice: 8900 }] },
  { id: 'demo-0031', date: '2026-10-10', customer: 'Eric Khoo', email: 'eric.k@example.com', channel: 'social', status: 'shipped', amount: 47800, items: [{ product: 'Laptop Stand', sku: 'LS-600', qty: 1, unitPrice: 34900 }, { product: 'Noise Headphones', sku: 'HP-700', qty: 1, unitPrice: 12900 }] },
  { id: 'demo-0032', date: '2026-10-12', customer: 'Fiona Lee', email: 'fiona.l@example.com', channel: 'email', status: 'refunded', amount: 89900, items: [{ product: '27-inch Monitor', sku: 'MN-400', qty: 1, unitPrice: 89900 }] },
  { id: 'demo-0033', date: '2026-10-14', customer: 'Gavin Tan', email: 'gavin.t@example.com', channel: 'ads', status: 'paid', amount: 59700, items: [{ product: 'Webcam 1080p', sku: 'WC-500', qty: 3, unitPrice: 19900 }] },
  { id: 'demo-0034', date: '2026-10-16', customer: 'Hazel Wong', email: 'hazel.w@example.com', channel: 'referral', status: 'delivered', amount: 70700, items: [{ product: 'USB-C Hub', sku: 'HUB-300', qty: 2, unitPrice: 12900 }, { product: 'Mechanical Keyboard', sku: 'KB-200', qty: 1, unitPrice: 44900 }] },
  { id: 'demo-0035', date: '2026-10-18', customer: 'Ivan Lim', email: 'ivan.l@example.com', channel: 'direct', status: 'cancelled', amount: 26700, items: [{ product: 'Desk Lamp', sku: 'DL-800', qty: 3, unitPrice: 8900 }] },
  { id: 'demo-0036', date: '2026-10-20', customer: 'Jasmine K', email: 'jasmine.k@example.com', channel: 'social', status: 'shipped', amount: 39500, items: [{ product: 'Wireless Mouse', sku: 'MS-100', qty: 5, unitPrice: 7900 }] },
  { id: 'demo-0037', date: '2026-10-22', customer: 'Keith Tan', email: 'keith.t@example.com', channel: 'email', status: 'delivered', amount: 124800, items: [{ product: 'Laptop Stand', sku: 'LS-600', qty: 1, unitPrice: 34900 }, { product: '27-inch Monitor', sku: 'MN-400', qty: 1, unitPrice: 89900 }] },
  { id: 'demo-0038', date: '2026-10-24', customer: 'Laura Chen', email: 'laura.c@example.com', channel: 'ads', status: 'pending', amount: 19900, items: [{ product: 'Webcam 1080p', sku: 'WC-500', qty: 1, unitPrice: 19900 }] },
  { id: 'demo-0039', date: '2026-10-26', customer: 'Marcus Lim', email: 'marcus.l@example.com', channel: 'direct', status: 'paid', amount: 89800, items: [{ product: 'Mechanical Keyboard', sku: 'KB-200', qty: 2, unitPrice: 44900 }] },
  { id: 'demo-0040', date: '2026-10-28', customer: 'Nadia Yusof', email: 'nadia.y@example.com', channel: 'social', status: 'shipped', amount: 21800, items: [{ product: 'Noise Headphones', sku: 'HP-700', qty: 1, unitPrice: 12900 }, { product: 'Desk Lamp', sku: 'DL-800', qty: 1, unitPrice: 8900 }] },
  { id: 'demo-0041', date: '2026-10-30', customer: 'Oscar Tan', email: 'oscar.t@example.com', channel: 'email', status: 'cancelled', amount: 89900, items: [{ product: '27-inch Monitor', sku: 'MN-400', qty: 1, unitPrice: 89900 }] },
  { id: 'demo-0042', date: '2026-11-01', customer: 'Penny Lim', email: 'penny.l@example.com', channel: 'referral', status: 'delivered', amount: 50700, items: [{ product: 'Wireless Mouse', sku: 'MS-100', qty: 2, unitPrice: 7900 }, { product: 'Laptop Stand', sku: 'LS-600', qty: 1, unitPrice: 34900 }] },
  { id: 'demo-0043', date: '2026-11-03', customer: 'Quentin Lee', email: 'quentin.lee@example.com', channel: 'ads', status: 'paid', amount: 32800, items: [{ product: 'Webcam 1080p', sku: 'WC-500', qty: 1, unitPrice: 19900 }, { product: 'Noise Headphones', sku: 'HP-700', qty: 1, unitPrice: 12900 }] },
  { id: 'demo-0044', date: '2026-11-05', customer: 'Rachel Ng', email: 'rachel.n@example.com', channel: 'direct', status: 'delivered', amount: 57800, items: [{ product: 'USB-C Hub', sku: 'HUB-300', qty: 1, unitPrice: 12900 }, { product: 'Mechanical Keyboard', sku: 'KB-200', qty: 1, unitPrice: 44900 }] },
  { id: 'demo-0045', date: '2026-11-07', customer: 'Samuel Tan', email: 'samuel.t@example.com', channel: 'social', status: 'shipped', amount: 17800, items: [{ product: 'Desk Lamp', sku: 'DL-800', qty: 2, unitPrice: 8900 }] },
  { id: 'demo-0046', date: '2026-11-09', customer: 'Tina Lim', email: 'tina.l@example.com', channel: 'email', status: 'pending', amount: 7900, items: [{ product: 'Wireless Mouse', sku: 'MS-100', qty: 1, unitPrice: 7900 }] },
  { id: 'demo-0047', date: '2026-11-11', customer: 'Uma Devi', email: 'uma.d@example.com', channel: 'ads', status: 'delivered', amount: 51600, items: [{ product: 'USB-C Hub', sku: 'HUB-300', qty: 4, unitPrice: 12900 }] },
  { id: 'demo-0048', date: '2026-11-13', customer: 'Victor Lee', email: 'victor.l@example.com', channel: 'direct', status: 'paid', amount: 48700, items: [{ product: 'Webcam 1080p', sku: 'WC-500', qty: 2, unitPrice: 19900 }, { product: 'Desk Lamp', sku: 'DL-800', qty: 1, unitPrice: 8900 }] },
  { id: 'demo-0049', date: '2026-11-15', customer: 'Wendy Tan', email: 'wendy.t@example.com', channel: 'social', status: 'cancelled', amount: 44900, items: [{ product: 'Mechanical Keyboard', sku: 'KB-200', qty: 1, unitPrice: 44900 }] },
  { id: 'demo-0050', date: '2026-11-17', customer: 'Xavier Lim', email: 'xavier.l@example.com', channel: 'email', status: 'delivered', amount: 20800, items: [{ product: 'Wireless Mouse', sku: 'MS-100', qty: 1, unitPrice: 7900 }, { product: 'Noise Headphones', sku: 'HP-700', qty: 1, unitPrice: 12900 }] },
  { id: 'demo-0051', date: '2026-11-19', customer: 'Yvonne Ng', email: 'yvonne.n@example.com', channel: 'referral', status: 'shipped', amount: 34900, items: [{ product: 'Laptop Stand', sku: 'LS-600', qty: 1, unitPrice: 34900 }] },
  { id: 'demo-0052', date: '2026-11-21', customer: 'Zach Tan', email: 'zach.t@example.com', channel: 'ads', status: 'pending', amount: 25800, items: [{ product: 'USB-C Hub', sku: 'HUB-300', qty: 2, unitPrice: 12900 }] },
  { id: 'demo-0053', date: '2026-11-23', customer: 'Amy Lim', email: 'amy.l@example.com', channel: 'direct', status: 'delivered', amount: 89900, items: [{ product: '27-inch Monitor', sku: 'MN-400', qty: 1, unitPrice: 89900 }] },
  { id: 'demo-0054', date: '2026-11-25', customer: 'Brian Tan', email: 'brian.t@example.com', channel: 'email', status: 'paid', amount: 54800, items: [{ product: 'Webcam 1080p', sku: 'WC-500', qty: 1, unitPrice: 19900 }, { product: 'Laptop Stand', sku: 'LS-600', qty: 1, unitPrice: 34900 }] },
];
