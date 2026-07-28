export const DEPARTMENTS = ['Ladies Footwears', 'Kids Footwears', 'Mens Footwears', 'Acc Kids', 'Acc Ladies', 'Acc Mens'] as const;

export const SUPPLIER_CODES: Record<string, string> = {
  'AARTI SALES': 'ARS',
  'AARUSHI TRADERS': 'AAR',
  'AARVIK FOOTWEAR': 'NY',
  'ABHISHEK FOOTWEAR': 'BRF',
  'AL GHANI ENTERPRISES': 'AGE',
  'ALION FOOTWEARS': 'ANF',
  'ALLURE POLYPLAST PVT. LTD.': 'APP',
  'AMAN FOOTWEAR': 'TOK-AM',
  'AMARAVATHI IMPORTS AND EXPORTS': 'AME',
  'ANJALI ENTERPRISES': 'GOP-G',
  'ANS FOOTWEAR': 'ANS',
  'AQDUS ENTERPRISES': 'ADE',
  'AQIB SHOE': 'AQS',
  'ATLAS COLLECTION': 'ATS',
  'B.K. SHOE CO. (AGRA)': 'BK',
  'BEST FOOTWEAR': 'BSF',
  'BIMAL TRADERS (AGRA)': 'VM',
  'BOMBAY TOUCH FOOTWEAR': 'BTF',
  'CHAUHAN FOOTWEAR': 'CHF',
  'CHITRA FOOTWEAR': 'CTF',
  'CINDRELLA FASHION': 'MDX',
  'CLASSIC FOOTWEAR': 'ATL',
  'CPM SPORTS': 'CPM',
  'CREATIVE IMPEX': 'CM',
  'CUTIE FEET': 'UM',
  'DNY FOOTWEAR PRIVATE LIMITED': 'DY',
  'ELEEGANCE BAGS PVT. LTD.': 'EL',
  'EMPRESS FOOTWEAR LLP': 'EMF',
  'FOOT LAND': 'FTL',
  'FOOT STAR': 'FS',
  'FORWARD FOOTWEARS': 'FF',
  'GANESH ENTERPRISES': 'GES',
  'GANPATI ENTERPRISES': 'GE',
  'Garden Shoes': 'GS',
  'GH FOOTWEAR': 'GHF',
  'GIANT ENTERPRISES': 'MHS',
  'GORAV FOOTWEAR PRIVATE LIMITED': 'JSH',
  'GV MANUFACTURING': 'GVM',
  'I. F. ENTERPRISES': 'IFE',
  'INSADDLERS FOOTWEAR': 'ANJ',
  'JONES INTERNATIONAL': 'JS',
  'JONY ENTERPRISES PRIVATE LIMITED': 'JNE',
  'JYOTIKA ENTERPRISES': 'BHU',
  'K K FOOTWEAR': 'HK',
  'KHAN BROTHERS': 'KHB',
  'KIDS KRAFT': 'RIN-KK',
  'KM SALES': 'KMS',
  'KRISH FOOTWEAR': 'KRF',
  'KUNDRA SHOE TECH': 'KS',
  'LALIT KUMAR': 'LTK',
  'LOTUS OVERSEAS': 'LO',
  'M K FOOTWEAR': 'MHO',
  'M. D. ENTERPRISES': 'MDE',
  'MADHAV LIFE STYLE PRIVATE LIMITED': 'MLS',
  'MAXIN SHOES': 'MXS',
  'MAXX FOOTWEAR': 'TIR',
  'MSC GLOBAL': 'MSC',
  'MYSTEVA': 'MYS',
  'NAGAR SHOES': 'NGS',
  'NEW NARANG FOOTWEAR': 'RN',
  'NIVIK SALES ': 'CLM',
  'NOSHEEN ENTERPRISES (MUJIB JI)': 'MUJ',
  'OM SONS': 'OMS',
  'OWSOME FOOTWEAR': 'OSM',
  'PANDEY FOOTWEARS': 'MTH',
  'PARUL SALES': 'PS',
  'PEARL FOOTWEAR': 'PRL',
  'POSH SHOES': 'NON',
  'R.G. SALES': 'RGS-RN',
  'RAMNI ENTERPRISES': 'BHU',
  'REFLECTION SHOES': 'RFS',
  'RENOWN FASHION': 'RGS-RN',
  'ROMELLO OVERSEAS PRIVATE LIMITED': 'MN',
  'RONIK FOOTWEAR': 'RKF',
  'S.K. FOOTWEAR': 'SKF',
  'S.R. FOOTWEAR': 'SRF',
  'S.S ENTERPRISES': 'SSE',
  'SABA ENTERPRISES': 'SBE',
  'SANDEEP ENTERPRISES': 'GDL',
  'Sapphire Traders': 'SPT',
  'SEERAT SALES': 'SES-SW',
  'SHAMA FOOTWEAR': 'SMF',
  'SHERRIF SHOES': 'SRR-BJ',
  'SHIVANI ENTERPRISE': 'BND',
  'SHOE GAME INDIA': 'SGI',
  'SK FOOTWEAR (Madipur)': 'SKR',
  'SNAWAP': 'SVP-SP',
  'STEP STYLE': 'SPL',
  'STYCOM ENTERPRISES': 'STM',
  'STYLE WALK': 'STW',
  'TANVISH ENTERPRISES': 'TN',
  'THE SHOE BELLE': 'TSB',
  'TOUCH WALK': 'TWK',
  'UPPER KLASS': 'UPK',
  'VANDANA TRADERS': 'VAS',
  'VEEGEE INTERNATIONAL': 'VGI',
  'Y.R. TRADING CO.': 'YR',
  'ZAFARSTYLE ENTERPRISES': 'SPT',
  'ZHOOM FOOTWEAR': 'ZMF-KT',
  'ZLF ENTERPRISES': 'ZLF',
};

const ACC_CATEGORIES = [
  'Backpack', 'Belt', 'Clutch', 'Framebag', 'Handbag', 'Ladieswallet',
  'Mensbag', 'Mensling', 'Menswallet', 'Metal', 'Miniature', 'Mobilecover',
  'Mobilesling', 'Potli', 'Slingbag', 'Small_Bag', 'Totebag', 'Trolley_Bag',
] as const;

export const DEPT_CATEGORIES: Record<string, readonly string[]> = {
  'Ladies Footwears': [
    'Ballerina', 'Boots', 'Bridalshoes', 'Comfortwalker', 'Comfyhomewear',
    'Crocs', 'Floater', 'Jutti', 'Kolhapuri', 'Loafer', 'Mules', 'Pumps',
    'Sandal', 'Slipper', 'Sneaker', 'Sportshoes', 'Vshape',
  ],
  'Kids Footwears': [
    'Ballerinas', 'Booties', 'Boots', 'Bridal Shoes', 'Comfy Home Wear',
    'Crocs', 'Floater', 'Jutti', 'Laceup', 'Loafer', 'Long Boot', 'Moccasin',
    'Mules', 'Peshawari', 'Sandals', 'School Shoes', 'Slipper', 'Sneaker',
    'Sports Shoes', 'Vshape',
  ],
  'Mens Footwears': [
    'Boots', 'Comfyhomewear', 'Crocs', 'Floater', 'Jutti', 'Kohlapuri',
    'Laceup', 'Loafer', 'Moccasin', 'Mules', 'Peshawari', 'Sandal',
    'Slipper', 'Sneaker', 'Sport Shoes', 'Vshape',
  ],
  'Acc Kids':   ACC_CATEGORIES,
  'Acc Ladies': ACC_CATEGORIES,
  'Acc Mens':   ACC_CATEGORIES,
};

export const SUB_CATEGORIES = ['Casualwear', 'Partywear'] as const;

export const COLORS = [
  'GLD', 'ANT', 'CHP', 'SIL', 'GMT', 'COP',
  'ANT/MLT', 'APT', 'BEG', 'BEG/MLT', 'BLK', 'BLK/MLT', 'BLU',
  'BRN', 'BRN/MLT', 'CHP/MLT', 'COF', 'CRM', 'CRM/MLT',
  'FUS', 'GLD/MLT', 'GRN', 'GRY', 'KHK', 'L.YEL',
  'LDR', 'MRN', 'MST', 'NAV', 'NTL', 'NUD', 'ORG', 'PNK', 'PPL', 'PST',
  'RED', 'SIL/MLT', 'TAN', 'TAN/MLT', 'WHT', 'WHT/MLT',
] as const;

export const DEPT_HEELS: Record<string, readonly string[]> = {
  'Ladies Footwears': [
    'Flat', 'Short Heel', 'Medium Heel', 'High Heel',
    'Short Platform', 'Medium Platform', 'High Platform',
    'Short Wedge', 'Medium Wedge', 'High Wedge',
  ],
  'Kids Footwears': [
    'Flat', 'Short Heel', 'Medium Heel',
    'Short Platform', 'Medium Platform', 'Medium Wedges',
  ],
  'Mens Footwears': ['Flat', 'Heels'],
};

export const DEPT_SECTIONS: Record<string, readonly string[]> = {
  'Ladies Footwears': ['MB', 'SB'],
  'Kids Footwears': ['MB'],
  'Mens Footwears': ['Affordable', 'Premium'],
};

export const DEPT_SIZES: Record<string, number[]> = {
  'Ladies Footwears': [35, 36, 37, 38, 39, 40, 41, 42],
  'Mens Footwears':   [39, 40, 41, 42, 43, 44, 45, 46, 47],
};

export const KIDS_SIZES = ['XS', 'S', 'M', 'L', 'XL'] as const;

export const KIDS_SIZE_RANGES: Record<string, number[]> = {
  'XS': [15, 16, 17, 18, 19, 20],
  'S':  [21, 22, 23, 24, 25],
  'M':  [26, 27, 28, 29, 30],
  'L':  [31, 32, 33, 34, 35, 36],
  'XL': [37, 38, 39, 40, 41, 42],
};

export const SEASONS = ['Summer', 'Winter'] as const;

export const LOGO_OPTIONS = ['Ket Importa and Kins', 'Kins', 'Ket Importa'] as const;

export const DELIVERY_DATE_OPTIONS = ['30', '45', '60', '90'] as const;

export const SUPPLIER_NAMES = [
  'A JAIN AND CO',
  'AAKASH AND CO.',
  'AAKASH AND CO. (ZOOM)',
  'AAKASH AND COMPANY (H.R)',
  'AAR BEE TRADERS',
  'AARTI SALES',
  'AARUSHI TRADERS',
  'AARVIK FOOTWEAR',
  'ABHISHEK FOOTWEAR',
  'AL GHANI ENTERPRISES',
  'ALION FOOTWEARS',
  'ALLURE POLYPLAST PVT. LTD.',
  'AMAN FOOTWEAR',
  'AMARAVATHI IMPORTS AND EXPORTS',
  'ANAND FOOTWEAR',
  'ANJALI ENTERPRISES',
  'ANJU ENTERPRISES',
  'ANS FOOTWEAR',
  'AQDUS ENTERPRISES',
  'AQIB SHOE',
  'ASHAY AGENCIES',
  'ASIAN FABRICS',
  'ATLAS COLLECTION',
  'AVYASHI ENTERPRISES',
  'B.K. SHOE CO. (AGRA)',
  'BALAJI ENTERPRISES',
  'BEST FOOTWEAR',
  'BIMAL TRADERS (AGRA)',
  'BOLD SHOES',
  'BOMBAY TOUCH FOOTWEAR',
  'CHASHNI ENTERPRISES',
  'CHAUHAN FOOTWEAR',
  'CHITRA FOOTWEAR',
  'CINDRELLA FASHION',
  'CLASSIC FOOTWEAR',
  'COBBLERZ SHOES',
  'COSMO FOOTWEAR',
  'CPM SPORTS',
  'CREATIVE IMPEX',
  'CUTIE FEET',
  'DAMMY SHOES AND ACCESSORIES',
  'DNY FOOTWEAR PRIVATE LIMITED',
  'ELEEGANCE BAGS PVT. LTD.',
  'EMPRESS FOOTWEAR LLP',
  'FASHION FLOOR',
  'FIRST FLOOR BAGS',
  'FOOT LAND',
  'FOOT STAR',
  'FORWARD FOOTWEARS',
  'G D INTERNATIONAL',
  'GANESH ENTERPRISES',
  'GANPATI ENTERPRISES',
  'Garden Shoes',
  'GDA SHOES',
  'GH FOOTWEAR',
  'GIANT ENTERPRISES',
  'GL TRADERS',
  'GLANSA INTERNATIONAL',
  'Global Marketing',
  'GNM FOOTWEAR',
  'GORAV FOOTWEAR PRIVATE LIMITED',
  'GOYAL INTERNATIONAL',
  'GV MANUFACTURING',
  'H PLUS SHOE COMPONENTS',
  'HARSH TRADERS',
  'HEER BAGS',
  'HEER BAGS NX',
  'Hero Shoes',
  'I. F. ENTERPRISES',
  'INSADDLERS FOOTWEAR',
  'Jay Kay Footcare',
  'JINDAL MARKETING',
  'JJ SHOE INDUSTRIES',
  'JO S Enterprises',
  'JONES INTERNATIONAL',
  'JONES SHOE COMPANY',
  'JONY ENTERPRISES PRIVATE LIMITED',
  'JYOTIKA ENTERPRISES',
  'K K FOOTWEAR',
  'K. V. FOOTWEAR',
  'K.S PRINTER',
  'KARTIK FOOTWEAR',
  'KHAN BROTHERS',
  'KHURSHID AHMAD',
  'KIDS KRAFT',
  'KM SALES',
  'KRISH FOOTWEAR',
  'KRISH IMPEX',
  'KRISHNA HEEL MANUFACTURING CO.',
  'KUNDRA SHOE TECH',
  'LALIT KUMAR',
  'LAXMI ENTERPRISES',
  'LE BAG',
  'LEATHER POINT',
  'LG ENTERPRISES',
  'LIFETIME CREATIONS',
  'LOTUS OVERSEAS',
  'LOTUS SHOE CO.',
  'M BLING PRIVATE LIMITED',
  'M K FOOTWEAR',
  'M. D. ENTERPRISES',
  'MADHAV LIFE STYLE PRIVATE LIMITED',
  'MAGNO WORLD PRIVATE LIMITED',
  'MALHOTRA LEATHERITES',
  'MAX PLUS JEWELS',
  'MAXIN SHOES',
  'MAXX FOOTWEAR',
  'MOOL MAYA AND CO.',
  'MSC GLOBAL',
  'MYSTEVA',
  'NAGAR SHOES',
  'NANDINI PUNJABI JUTTI',
  'NEW FRIENDS UNITED',
  'NEW KHOOBSURAT JUTTI PALACE',
  'NEW NARANG FOOTWEAR',
  'NIKHIL FOOT-ART',
  'NIVIK SALES',
  'NOSHEEN ENTERPRISES (MUJIB JI)',
  'NU ENTERPRISES',
  'OM SONS',
  'OWSOME FOOTWEAR',
  'PAISSION INTERNATIONAL',
  'PANDEY FOOTWEARS',
  'PARUL CREATIONS',
  'PARUL SALES',
  'PARUL SALES AGRA',
  'PEARL FOOTWEAR',
  'POPWORK OVERSEAS',
  'POSH SHOES',
  'PPR SHIVAY INDUSTRIES PRIVATE LIMITED',
  'Purple United Sales Limited',
  'QUAKER',
  'R.G. SALES',
  'R.K.FOOTWEAR',
  'R.S. INDUSTRIES',
  'R.S. LEATHERS',
  'RAKESH CHAPPAL STORE PVT. LTD.',
  'RAMNI ENTERPRISES',
  'RANBIR OVERSEAS',
  'RAUNAK COLLECTIONS',
  'REFLECTION SHOES',
  'RENOWN FASHION',
  'ROMELLO OVERSEAS PRIVATE LIMITED',
  'RONAK PLUS LLP',
  'RONIK FOOTWEAR',
  'S.K. FOOTWEAR',
  'S.R. FOOTWEAR',
  'S.S CREATIONS',
  'S.S ENTERPRISES',
  'SABA ENTERPRISES',
  'SANDEEP ENTERPRISES',
  'SANSAM ENTERPRISES',
  'SAPANA ENTERPRISES',
  'Sapphire Traders',
  'SAVLA WESTERN LIFESTYLE LLP',
  'SEERAT SALES',
  'SEHHAJ MARKETINGG',
  'SHAMA FOOTWEAR',
  'SHARMA ENTERPRISES',
  'SHERRIF SHOES',
  'SHIVANI ENTERPRISE',
  'SHOE GAME INDIA',
  'SHOEMAKERS (Purchase)',
  'SHREE J. NIRMAL EXPORT',
  'SHREE SHYAM IMPEX',
  'SHRI RADHEY TRADERS',
  'Shubh Footwear Moti Nagar',
  'SIFAT TRADERS',
  'SILVER ROSE IMPEX PRIVATE LIMITED',
  'SK FOOTWEAR (Madipur)',
  'SNAWAP',
  'SONY ENTERPRISES',
  'SONY SONS',
  'SPIRO FOOTWEAR',
  'STEP STYLE',
  'STYCOM ENTERPRISES',
  'STYLE WALK',
  'SUNDER BAGZEE',
  'SWEET FASHION',
  'TANEJA PRODUCTS',
  'TANVISH ENTERPRISES',
  'THE FASHION STYLE',
  'THE SHOE BELLE',
  'TOUCH WALK',
  'UNIQUE SOLE',
  'UNITECH UDYOG PRIVATE LIMITED',
  'UPPER CIRCUIT TRADING LLP',
  'UPPER KLASS',
  'V.K. ENTERPRISES',
  'V.R ENTERPRISES',
  'VANDANA TRADERS',
  'VC BAGS AND ACCESSORIES',
  'VEEGEE INTERNATIONAL',
  'VIAM',
  'VIJAY PURSE HOUSE',
  'VINAYAK INTERNATIONAL',
  'VIRALI BAGS',
  'Y.R. TRADING CO.',
  'ZAFARSTYLE ENTERPRISES',
  'ZHOOM FOOTWEAR',
  'ZLF ENTERPRISES',
  'ZUDIC EXPORT',
] as const;

export type ColorVariant = {
  color: string;
  set_type: string;
  size_set: string;
  set_qty: string;
  qty_15: string; qty_16: string; qty_17: string; qty_18: string; qty_19: string;
  qty_20: string; qty_21: string; qty_22: string; qty_23: string; qty_24: string;
  qty_25: string; qty_26: string; qty_27: string; qty_28: string; qty_29: string;
  qty_30: string; qty_31: string; qty_32: string; qty_33: string; qty_34: string;
  qty_35: string; qty_36: string; qty_37: string; qty_38: string; qty_39: string;
  qty_40: string; qty_41: string; qty_42: string; qty_43: string; qty_44: string;
  qty_45: string; qty_46: string; qty_47: string;
};

export const emptyVariant = (): ColorVariant => ({
  color: '', set_type: '', size_set: '', set_qty: '',
  qty_15: '', qty_16: '', qty_17: '', qty_18: '', qty_19: '',
  qty_20: '', qty_21: '', qty_22: '', qty_23: '', qty_24: '',
  qty_25: '', qty_26: '', qty_27: '', qty_28: '', qty_29: '',
  qty_30: '', qty_31: '', qty_32: '', qty_33: '', qty_34: '',
  qty_35: '', qty_36: '', qty_37: '', qty_38: '', qty_39: '',
  qty_40: '', qty_41: '', qty_42: '', qty_43: '', qty_44: '',
  qty_45: '', qty_46: '', qty_47: '',
});

export type ShoeEntry = {
  id?: string;
  created_at?: string;
  deleted_at?: string | null;
  voice_note_url?: string;
  picture: string;
  department: string;
  category: string;
  sub_category: string;
  article_no: string;
  heels: string;
  color: string;       // legacy / variant[0].color mirror
  section: string;
  season: string;
  pur_price: string;
  size_set: string;    // legacy
  set_qty: string;     // legacy
  kids_size: string;
  // Size quantities 15–47 (legacy flat fields, mirrored from variant 0)
  qty_15: string; qty_16: string; qty_17: string; qty_18: string; qty_19: string;
  qty_20: string; qty_21: string; qty_22: string; qty_23: string; qty_24: string;
  qty_25: string; qty_26: string; qty_27: string; qty_28: string; qty_29: string;
  qty_30: string; qty_31: string; qty_32: string; qty_33: string; qty_34: string;
  qty_35: string; qty_36: string; qty_37: string; qty_38: string; qty_39: string;
  qty_40: string; qty_41: string; qty_42: string; qty_43: string; qty_44: string;
  qty_45: string; qty_46: string; qty_47: string;
  color_variants: string; // JSON-stringified ColorVariant[]
  notes: string;
  sketch_data: string;
  logo: string;
  supplier_name: string;
  delivery_date: string;
};

export type OrderPlan = {
  id?: string;
  department: string;
  category: string;
  planned_qty: number;
  period_start: string | null;
};

export type OrderPlanDetail = {
  department: string;
  category: string;
  sub_category: string;
  heels: string;
  planned_qty: number;
};

export const emptyEntry = (): Omit<ShoeEntry, 'id' | 'created_at'> => ({
  picture: '', department: '', category: '', sub_category: '',
  article_no: '', heels: '', color: '', section: '', season: '',
  pur_price: '', size_set: '', set_qty: '', kids_size: '',
  qty_15: '', qty_16: '', qty_17: '', qty_18: '', qty_19: '',
  qty_20: '', qty_21: '', qty_22: '', qty_23: '', qty_24: '',
  qty_25: '', qty_26: '', qty_27: '', qty_28: '', qty_29: '',
  qty_30: '', qty_31: '', qty_32: '', qty_33: '', qty_34: '',
  qty_35: '', qty_36: '', qty_37: '', qty_38: '', qty_39: '',
  qty_40: '', qty_41: '', qty_42: '', qty_43: '', qty_44: '',
  qty_45: '', qty_46: '', qty_47: '',
  color_variants: JSON.stringify([emptyVariant()]),
  notes: '', sketch_data: '', logo: '', supplier_name: '', delivery_date: '',
});
