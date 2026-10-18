export interface NavChildItem {
  label: string;
  workspace: string;
  count?: number;
  queryParams?: Record<string, string>;
  path?: string;
}

export interface NavItem {
  label: string;
  tab: string;
  tooltip: string;
  icon: string;
  count?: number;
  children?: NavChildItem[];
  path?: string;
  exact?: boolean;
}

export interface MenuGroup {
  title: string;
  marginTop?: number;
  items: NavItem[];
}
