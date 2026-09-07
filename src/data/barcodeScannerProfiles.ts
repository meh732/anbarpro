// List of Default and Updated Supported Hardware Barcode Scanners in ElectroStock
export interface BarcodeScannerProfile {
  id: string;
  brand: string;
  brandEn: string;
  popularModels: string[];
  connectionTypes: ('USB Cable' | 'Wireless 2.4G' | 'Bluetooth' | 'Serial RS232')[];
  scanEngine: '1D Laser/CCD' | '2D QR & DataMatrix' | '1D/2D Hybrid';
  status: 'Certified' | 'PlugAndPlay' | 'Ready';
  defaultTerminator: 'Enter (CR/LF)' | 'Tab' | 'None';
  description: string;
  descriptionFa: string;
  driverRequirement: 'بدون نیاز به درایور (Plug & Play)' | 'استاندارد HID';
  baudRateOrSpeed: string;
}

export const DEFAULT_BARCODE_SCANNERS: BarcodeScannerProfile[] = [
  {
    id: 'honeywell',
    brand: 'هانی‌ول',
    brandEn: 'Honeywell',
    popularModels: ['Voyager 1200g', 'Voyager 1250g', 'Voyager 1400g (2D)', 'Voyager 1450g', 'Xenon 1900/1950', 'Genesis 7580g', 'Orbit 7120', 'Granit صنعتی'],
    connectionTypes: ['USB Cable', 'Wireless 2.4G', 'Bluetooth', 'Serial RS232'],
    scanEngine: '1D/2D Hybrid',
    status: 'Certified',
    defaultTerminator: 'Enter (CR/LF)',
    description: 'Industrial and commercial grade scanners with extreme accuracy and speed.',
    descriptionFa: 'پرفروش‌ترین و بادوام‌ترین بارکدخوان صنعتی؛ اتصال مستقیم با کابل USB یا پایه شارژر وایرلس بدون نیاز به تنظیمات خاص.',
    driverRequirement: 'بدون نیاز به درایور (Plug & Play)',
    baudRateOrSpeed: 'تاخیر فوق‌سریع کمتر از ۱۰ میلی‌ثانیه'
  },
  {
    id: 'zebra-symbol',
    brand: 'زبرا / موتورولا (سیمبل)',
    brandEn: 'Zebra / Motorola (Symbol)',
    popularModels: ['Symbol LS2208 (استاندارد جهانی)', 'DS2208 (1D/2D)', 'DS4308', 'DS8108', 'LI4278 وایرلس', 'TC21/TC26 صنعتی'],
    connectionTypes: ['USB Cable', 'Wireless 2.4G', 'Bluetooth'],
    scanEngine: '1D/2D Hybrid',
    status: 'Certified',
    defaultTerminator: 'Enter (CR/LF)',
    description: 'The world standard in POS and warehouse barcode scanning.',
    descriptionFa: 'استاندارد طلایی انبارهای جهان؛ مدل LS2208 و DS2208 به محض اتصال به درگاه USB در این سامانه بلافاصله فعال و آماده اسکن است.',
    driverRequirement: 'بدون نیاز به درایور (Plug & Play)',
    baudRateOrSpeed: 'تاخیر فوق‌سریع کمتر از ۱۵ میلی‌ثانیه'
  },
  {
    id: 'datalogic',
    brand: 'دیتا لاجیک',
    brandEn: 'Datalogic',
    popularModels: ['QuickScan QD2100', 'QuickScan QD2400', 'QuickScan QD2500', 'Gryphon I GD4500', 'Touch 65/90 Lite', 'Magellan رومیزی'],
    connectionTypes: ['USB Cable', 'Wireless 2.4G', 'Bluetooth'],
    scanEngine: '1D/2D Hybrid',
    status: 'Certified',
    defaultTerminator: 'Enter (CR/LF)',
    description: 'High-performance imaging and laser scanning technology from Italy.',
    descriptionFa: 'دستگاه‌های ایتالیایی پرقدرت با نشانگر سبز Green Spot برای تایید خواندن بارکد؛ پشتیبانی کامل در حالت USB HID Wedge.',
    driverRequirement: 'بدون نیاز به درایور (Plug & Play)',
    baudRateOrSpeed: 'تاخیر ۲۰ میلی‌ثانیه'
  },
  {
    id: 'netum',
    brand: 'نتوم',
    brandEn: 'Netum',
    popularModels: ['Netum C750 Mini', 'Netum C850', 'Netum W6 تفنگی', 'Netum W8-X دانگل ۲.۴G', 'NT-1228BL بلوتوثی', 'E800 رومیزی'],
    connectionTypes: ['USB Cable', 'Wireless 2.4G', 'Bluetooth'],
    scanEngine: '1D/2D Hybrid',
    status: 'Certified',
    defaultTerminator: 'Enter (CR/LF)',
    description: 'Modern wireless, bluetooth pocket and pistol-grip barcode readers.',
    descriptionFa: 'بارکدخوان‌های پرطرفدار بی‌سیم و بلوتوثی؛ با اتصال دانگل USB ۲.۴G یا اتصال بلوتوث به کامپیوتر یا تبلت درجا شناسایی می‌شود.',
    driverRequirement: 'بدون نیاز به درایور (Plug & Play)',
    baudRateOrSpeed: 'تاخیر ۲۵ میلی‌ثانیه'
  },
  {
    id: 'newland',
    brand: 'نیولند',
    brandEn: 'Newland',
    popularModels: ['HR11+ Aflac', 'HR22 Dorada', 'NLS-HR2081', 'NLS-HR3280', 'BS8060 جیبی', 'FM430 ماژول توکار'],
    connectionTypes: ['USB Cable', 'Wireless 2.4G', 'Bluetooth'],
    scanEngine: '1D/2D Hybrid',
    status: 'Certified',
    defaultTerminator: 'Enter (CR/LF)',
    description: 'High precision CMOS 2D imager barcode scanners.',
    descriptionFa: 'بارکدخوان‌های مدرن با حسگر CMOS قوی برای خواندن بارکدهای ریز قطعات الکترونیکی، متالایز و کدهای روی برد مدار چاپی (PCB).',
    driverRequirement: 'بدون نیاز به درایور (Plug & Play)',
    baudRateOrSpeed: 'تاخیر ۲۰ میلی‌ثانیه'
  },
  {
    id: 'deli',
    brand: 'دلی',
    brandEn: 'Deli',
    popularModels: ['Deli 14881 تفنگی', 'Deli 14882 پایه‌دار', 'Deli 14883 لیزری', 'Deli 14884 دو بعدی CCD', 'Deli E14953'],
    connectionTypes: ['USB Cable', 'Wireless 2.4G'],
    scanEngine: '1D Laser/CCD',
    status: 'PlugAndPlay',
    defaultTerminator: 'Enter (CR/LF)',
    description: 'Affordable, reliable laser barcode scanners for commercial warehouses.',
    descriptionFa: 'بارکدخوان‌های اقتصادی و پرکاربرد بازار ایران؛ کاملاً هماهنگ با سیستم کیبوردی سامانه بدون نیاز به هیچ‌گونه نرم‌افزار جانبی.',
    driverRequirement: 'بدون نیاز به درایور (Plug & Play)',
    baudRateOrSpeed: 'تاخیر ۳۰ میلی‌ثانیه'
  },
  {
    id: 'eyoyo',
    brand: 'آیویو',
    brandEn: 'Eyoyo',
    popularModels: ['Eyoyo Mini Bluetooth', 'Eyoyo 1D/2D Ring Scanner (انگشتی)', 'Eyoyo Wireless 2.4G Pocket', 'Eyoyo EY-015'],
    connectionTypes: ['Bluetooth', 'Wireless 2.4G', 'USB Cable'],
    scanEngine: '1D/2D Hybrid',
    status: 'PlugAndPlay',
    defaultTerminator: 'Enter (CR/LF)',
    description: 'Ultra-portable wearable ring and pocket barcode scanners.',
    descriptionFa: 'اسکنرهای انگشتی و جیبی مناسب اپراتورهای انبارگردانی در حین جابجایی قطعات؛ سازگار با اتصال مستقیم بلوتوث و دانگل.',
    driverRequirement: 'بدون نیاز به درایور (Plug & Play)',
    baudRateOrSpeed: 'تاخیر ۳۰ میلی‌ثانیه'
  },
  {
    id: 'sunlux-mindeo',
    brand: 'سانلوکس و میندئو',
    brandEn: 'Sunlux & Mindeo',
    popularModels: ['Sunlux XL-626A', 'Sunlux XL-9610', 'Mindeo MD6600', 'Mindeo CS2290', 'Posiflex', 'Symcode', 'Trohestar'],
    connectionTypes: ['USB Cable', 'Wireless 2.4G', 'Bluetooth'],
    scanEngine: '1D/2D Hybrid',
    status: 'Ready',
    defaultTerminator: 'Enter (CR/LF)',
    description: 'Robust POS and retail barcode readers widely used across supply chains.',
    descriptionFa: 'سازگار با پروتکل استاندارد USB Keyboard Emulation بدون ایجاد تداخل با زبان صفحه کلید فارسی و انگلیسی.',
    driverRequirement: 'استاندارد HID',
    baudRateOrSpeed: 'تاخیر ۳۰ میلی‌ثانیه'
  },
  {
    id: 'generic-hid',
    brand: 'بارکدخوان‌های عمومی و بی‌نام (استاندارد)',
    brandEn: 'Generic Plug & Play USB Barcode Scanners',
    popularModels: ['تمام بارکدخوان‌های سیمی USB', 'انواع دانگل‌های وایرلس 2.4G', 'انواع بارکدخوان‌های بلوتوثی استاندارد HID'],
    connectionTypes: ['USB Cable', 'Wireless 2.4G', 'Bluetooth'],
    scanEngine: '1D Laser/CCD',
    status: 'PlugAndPlay',
    defaultTerminator: 'Enter (CR/LF)',
    description: 'Universal keyboard wedge compatibility for any brand or model in the market.',
    descriptionFa: '۱۰۰٪ بارکدخوان‌های موجود در بازار با پروتکل استاندارد شبیه‌ساز کیبورد (Keyboard Wedge) کار می‌کنند. هر دستگاهی را وصل کنید فوراً کار خواهد کرد.',
    driverRequirement: 'بدون نیاز به درایور (Plug & Play)',
    baudRateOrSpeed: 'تشخیص خودکار بر اساس شلیک سیگنال'
  }
];
