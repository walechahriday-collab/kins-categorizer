export const DEPARTMENTS = ['Ladies Footwears', 'Kids Footwears', 'Mens Footwears'] as const;

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
};

export const SUB_CATEGORIES = ['Casualwear', 'Partywear'] as const;

export const COLORS = [
  'ANT', 'ANT/MLT', 'APT', 'BEG', 'BEG/MLT', 'BLK', 'BLK/MLT', 'BLU',
  'BRN', 'BRN/MLT', 'CHP', 'CHP/MLT', 'COF', 'COP', 'CRM', 'CRM/MLT',
  'FUS', 'GLD', 'GLD/MLT', 'GMT', 'GRN', 'GRY', 'KHK', 'L.YEL',
  'LDR', 'MRN', 'MST', 'NAV', 'NTL', 'NUD', 'ORG', 'PNK', 'PPL', 'PST',
  'RED', 'SIL', 'SIL/MLT', 'TAN', 'TAN/MLT', 'WHT', 'WHT/MLT',
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

export type ColorVariant = {
  color: string;
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
  color: '', size_set: '', set_qty: '',
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
  notes: '', sketch_data: '', logo: '',
});
