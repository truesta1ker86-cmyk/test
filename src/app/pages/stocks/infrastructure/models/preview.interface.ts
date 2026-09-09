export interface PreviewItem {
    offer_id: string;
    warehouse_id: string;
    before: any;
    after: any;
  }
  
  export interface PreviewResult {
    success: boolean;
    message: string;
    items: PreviewItem[];
  }