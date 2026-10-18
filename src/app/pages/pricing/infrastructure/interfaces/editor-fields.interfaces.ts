export interface EditorField {
  key: string;
  label: string;
  kind: 'text' | 'number' | 'integer' | 'rate' | 'scheme' | 'boolean';
  nullable: boolean;
}
