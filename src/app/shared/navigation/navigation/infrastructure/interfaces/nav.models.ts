export interface NavChildItem {
    label: string;
    workspace: string;
    count?: number;
  }
  
  export interface NavItem {
    label: string;
    tab: string;
    tooltip: string;
    icon: string;
    count?: number;
    children?: NavChildItem[];
  }
  
  export interface MenuGroup {
    title: string;
    marginTop?: number;
    items: NavItem[];
  }
  