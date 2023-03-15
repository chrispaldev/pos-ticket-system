import { formatDate } from './basic.utils';
import { write } from 'fast-csv';
import { Response } from 'express';

export const exportCSV = (rows: any, filename: string, response: Response) => {
  response.set('Content-disposition', 'attachment; filename=' + formatDate() + `_${filename}.csv`);
  response.set('Content-Type', 'text/csv');
  write(rows, { headers: true }).pipe(response);
}