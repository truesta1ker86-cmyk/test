import { Groups } from "../enums/groups";

export const GroupsLabels: Record<Groups, string> = {
    [Groups.current]: 'Текущие',
    [Groups.completed]: 'Завершённые',
    [Groups.available]: 'Доступные',
  };