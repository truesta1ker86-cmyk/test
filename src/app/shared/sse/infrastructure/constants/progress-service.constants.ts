export const PROGRESS_SERVICE_INVENTORY_STAGE_DEFS: { key: string; label: string }[] = [
  { key: 'catalog', label: 'Каталог 1С' },
  { key: 'ka2_pull', label: 'Остатки / себестоимость' },
  { key: 'save', label: 'Запись в БД' },
  { key: 'done', label: 'Завершено' },
];

export const PROGRESS_SERVICE_STAGE_ORDER = ['catalog', 'ka2_pull', 'save', 'done'];

export const PROGRESS_SERVICE_JOB_STORAGE_KEY = 'inventory_job_id';
