export interface PreflightCheck {
    name: string;
    status: 'готово' | 'ошибка' | 'ожидание';
    duration: number;
    sample: number;
  }
  