export interface Material {
  id: string;
  stId?: string;
  code: string;
  name: string;
  cost: number;
  unit?: string;
}

// Material from API may have optional id
export interface MaterialInput {
  id?: string;
  stId?: string;
  code: string;
  name: string;
  cost: number;
  unit?: string;
}

export interface KitMaterialItem {
  id: string;
  materialId: string;
  quantity: number;
  groupId?: string | null;
  material?: Material;
}

export interface KitGroup {
  id: string;
  name: string;
  color: string;
  collapsed: boolean;
}

export interface Kit {
  id?: string;
  name: string;
  description?: string;
  categoryPath: string[];
  items?: KitMaterialItem[];
  groups?: KitGroup[];
  includedKitIds?: string[];
}
