---
name: Ozon × 1С — Angular v2
description: Рабочее пространство оператора магазина в изолированной копии.
colors:
  brand: "#005bff"
  brand-soft: "#eff4ff"
  background: "#fafafb"
  surface: "#ffffff"
  surface-muted: "#f4f5f7"
  text: "#101828"
  text-secondary: "#475467"
  muted: "#667085"
  border: "#e4e7ec"
  control-border: "#b2bccb"
  control-hover-border: "#98a2b3"
  success: "#067647"
  warning: "#934400"
  error: "#b42318"
  error-surface: "#fef3f2"
typography:
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "28px"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.7px"
  title:
    fontSize: "16px"
    fontWeight: 650
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "14px"
    lineHeight: 1.5
  label:
    fontSize: "12px"
  control:
    fontSize: "13px"
  caption:
    fontSize: "11px"
  editor-title:
    fontSize: "23px"
  dialog-title:
    fontSize: "20px"
  mobile-headline:
    fontSize: "24px"
  mobile-editor-title:
    fontSize: "21px"
rounded:
  compact: "8px"
  field: "10px"
  panel: "14px"
  button: "10px"
spacing:
  compact: "8px"
  field: "12px"
  group: "16px"
  panel: "20px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
    rounded: "{rounded.button}"
    padding: "9px 14px"
    height: "38px"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.field}"
    padding: "8px 10px"
---

# Design System: Ozon × 1С v2

Источником функционала, композиции и эстетики служит собственная работающая v1. Внешние репозитории test и scand — только технические примеры Angular/TypeScript и C++. Они не задают вид экранов или бизнес-процесс.

Проверенный исходник v1: static/index.html из работающего o1c_broker, SHA256 96ec56bed8be0dfc0905356c6112393384358430d03f6d951749a723d7e4dd00, снимок 15.10.2026. Серверный исходник не редактируется в рамках переноса v2.

Светлый фон #fafafb, белые панели, синий #005BFF. Системный шрифт SF Pro / -apple-system / Segoe UI. Боковое меню 248 px, свёрнутое 80 px. Липкая шапка 56 px: rgba(250,250,251,.85), blur 12 px. Панели 14 px, основные поля и кнопки 10 px, высота 38 px, компактные поля матрицы 32 px.

Измеримое рабочее движение: переход раздела fade + translateY(8px) за 300 ms; состояния контролов 160 ms, cubic-bezier(.16,1,.3,1). Счётчики показывают фактические данные и мягко меняются за 400 ms. prefers-reduced-motion отключает движение. Стекло используется в липкой шапке и панели массовых действий; фон таблицы остаётся читаемым.

В остатках первичные действия — общий остаток и распределение по складам. Матрица содержит товары строками и склады столбцами, отдельные массовые настройки каждого склада и редактирование ячеек. Проценты точные, доля без верхнего бизнес-ограничения, фиксированное количество и кратность сохранены. Отборы, упаковки, защита заказами после снимка, предварительный расчёт, сохранение, отмена и история соответствуют v1.

Таблица прокручивается внутри контейнера; товар и заголовки закреплены. На узком экране меню скрывается, показатели перестраиваются в две колонки. Максимум 12 видимых складов ограничивает только представление: скрытие столбца не удаляет правил и черновиков.

Новая версия работает в отдельной базе и не отправляет изменения в Ozon. Это состояние видно рядом с рабочим контекстом. Не подменять факт переноса появлением страницы: нативная серверная логика, доступность действий и результаты браузерных проверок фиксируются отдельно для каждого раздела.

Таблицы используют общую основу Виталия из `ii_test/fa067ad`: один renderer
PrimeNG, серверный источник страниц либо строки текущего раздела через `[data]`.
Не добавлять вторую пагинацию к уже загруженному массиву без явного запроса.
Ошибки загрузки видимы и имеют повтор; выделение сохраняется между страницами.
Aura не подключается. Поля, раскрытые списки, календарь, чекбоксы и пагинация
оформляются в `shared/ui/styles/controls.css` через переменные проекта под
`body.o1c-ui`; маскировать лицензионные сообщения стилями запрещено.
