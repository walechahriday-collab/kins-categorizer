export const DEPARTMENTS = ['Ladies Footwears', 'Kids Footwears', 'Mens Footwears'] as const;

export const DEPT_CATEGORIES: Record<string, readonly string[]> = {
  'Ladies Footwears': [
    'Ballerina', 'Boots', 'Bridalshoes', 'Comfortwalker', 'Comfyhomewear',
    'Crocs', 'Floater', 'Jutti', 'Kolhapuri', 'Loafer', 'Mules', 'Pumps',
    'Sandal', 'Slipper', 'Sneakers', 'Sportshoes', 'Vshape',
  ],
  'Kids Footwears': [
    'Ballerinas', 'Booties', 'Boots', 'Bridal Shoes', 'Comfy Home Wear',
    'Crocs', 'Floater', 'Jutti', 'Laceup', 'Loafer', 'Long Boot', 'Moccasin',
    'Mules', 'Peshawari', 'Sandals', 'School Shoes', 'Slipper', 'Sneakers',
    'Sports Shoes', 'Vshape',
  ],
  'Mens Footwears': [
    'Boots', 'Comfyhomewear', 'Crocs', 'Floater', 'Jutti', 'Kohlapuri',
    'Laceup', 'Loafer', 'Moccasin', 'Mules', 'Peshawari', 'Sandal',
    'Slipper', 'Sneakers', 'Sport Shoes', 'Vshape',
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
  'Kids Footwears': [],
  'Mens Footwears': ['Affordable', 'Premium'],
};

export const SEASONS = ['Summer', 'Winter'] as const;

export type ShoeEntry = {
  id?: string;
  created_at?: string;
  picture: string;
  department: string;
  category: string;
  sub_category: string;
  article_no: string;
  heels: string;
  color: string;
  section: string;
  season: string;
  set_qty: string;
  size_set: string;
  pur_price: string;
  notes: string;
  sketch_data: string;
};

export const emptyEntry = (): Omit<ShoeEntry, 'id' | 'created_at'> => ({
  picture: '',
  department: '',
  category: '',
  sub_category: '',
  article_no: '',
  heels: '',
  color: '',
  section: '',
  season: '',
  set_qty: '',
  size_set: '',
  pur_price: '',
  notes: '',
  sketch_data: '',
});
