export type SseStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed' | 'failed';

export type PageState = 'checking' | 'ready' | 'failed' | 'reconnecting';

export type InventoryStage =
  'start' | 'catalog' | 'read' | 'normalize' | 'save' | 'migrate' | 'ka2_pull' | 'done' | 'error';

export type InventoryStageStatus = 'pending' | 'running' | 'done' | 'failed';
