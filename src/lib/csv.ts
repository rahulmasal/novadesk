import type { Ticket } from '@/lib/store';

export function ticketsToCSV(tickets: Ticket[]): string {
  const headers = [
    'id',
    'title',
    'description',
    'priority',
    'category',
    'status',
    'createdBy',
    'username',
    'hostname',
    'laptopSerial',
    'department',
    'dueDate',
    'createdAt',
    'updatedAt',
  ];
  const rows = tickets.map((t) =>
    [
      t.id,
      t.title,
      t.description,
      t.priority,
      t.category,
      t.status,
      t.createdBy,
      t.username,
      t.hostname,
      t.laptopSerial,
      t.department,
      t.dueDate,
      t.createdAt,
      t.updatedAt,
    ]
      .map((v) => (typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v))
      .join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}
