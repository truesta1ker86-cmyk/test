import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';

import { PreloaderService } from './preloader.service';

export const preloaderInterceptor: HttpInterceptorFn = (req, next) => {
  const preloader = inject(PreloaderService);

  // Пропускаем запросы, помеченные как «без прелоадера»
  if (req.headers.has('X-Skip-Preloader')) {
    return next(req);
  }

  preloader.show();
  return next(req).pipe(finalize(() => preloader.hide()));
};
