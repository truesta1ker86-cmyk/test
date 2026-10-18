import { HttpErrorResponse } from '@angular/common/http';

export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const detail: unknown = error.error?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail))
      return detail.map((value) => String(value.msg || 'Проверьте значение')).join('; ');
    if (error.status === 0) return 'Сервер недоступен. Проверьте соединение и повторите попытку.';
    if (error.status === 403) return 'У вас нет доступа к этим данным.';
  }
  return error instanceof Error ? error.message : 'Не удалось загрузить данные. Повторите попытку.';
}

export async function downloadErrorMessage(error: unknown): Promise<string> {
  if (error instanceof HttpErrorResponse && error.error instanceof Blob) {
    try {
      const body: unknown = JSON.parse(await error.error.text());
      return errorMessage(
        new HttpErrorResponse({
          error: body,
          status: error.status,
          headers: error.headers,
          url: error.url || undefined,
        }),
      );
    } catch {
      return 'Не удалось подготовить файл. Повторите выгрузку или уточните период.';
    }
  }
  return errorMessage(error);
}
