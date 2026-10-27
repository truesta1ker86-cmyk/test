import { Groups } from "../types/groups";

export const GroupsLabels: Record<Groups, string> = {
    [Groups.current]: 'Текущие',
    [Groups.completed]: 'Завершённые',
    [Groups.available]: 'Доступные',
  };