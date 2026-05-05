/**
 * ============================================================================
 * CSV EXPORT UTILITY - Convert Ticket Data to CSV Format
 * ============================================================================
 *
 * This module converts ticket data into CSV (Comma-Separated Values) format
 * for export and email reporting purposes.
 *
 * WHAT IS CSV?
 * - CSV is a simple text format where data is separated by commas
 * - Example: id,title,priority\n1,"VPN Issue",High\n2,"Laptop Broke",Urgent
 * - Can be opened in Excel, Google Sheets, or any text editor
 *
 * BEGINNER NOTES:
 * - CSV is NOT the same as JSON - it's simpler and more portable
 * - Excel and Google Sheets can both import CSV files easily
 * - Each line is a row, commas separate columns
 *
 * @module /lib/csv
 */

import type { Ticket } from "@/lib/store";

/**
 * Converts an array of tickets into CSV (Comma-Separated Values) format
 *
 * WHAT IT DOES:
 * 1. Defines the column headers for the CSV
 * 2. Maps each ticket to a row of values
 * 3. Escapes any quotes in string values (important for CSV validity!)
 * 4. Joins headers and rows with newlines
 *
 * CSV FORMAT EXAMPLE:
 * id,title,description,priority,category,status,createdBy,username,hostname,laptopSerial,department,dueDate,createdAt,updatedAt
 * 1,"VPN Issue","VPN keeps dropping",High,Network,In Progress,admin@novadesk.com,john.doe,HOST-1234,SN-2024-001,IT,2024-01-15T10:00:00Z,2024-01-14T09:00:00Z,2024-01-14T12:00:00Z
 *
 * ESCAPING QUOTES:
 * - If a string contains quotes, they must be doubled (" becomes "")
 * - This ensures the CSV parser knows the quote is part of the data, not a delimiter
 *
 * @param {Ticket[]} tickets - Array of ticket objects to convert
 * @returns {string} CSV-formatted string with headers and rows
 *
 * @example
 * const csv = ticketsToCSV(tickets);
 * // csv = "id,title,priority\n1,My Ticket,High"
 */
export function ticketsToCSV(tickets: Ticket[]): string {
  // Step 1: Define column headers (column order matters!)
  // These become the first row of the CSV file
  const headers = [
    "id",
    "title",
    "description",
    "priority",
    "category",
    "status",
    "createdBy",
    "username",
    "hostname",
    "laptopSerial",
    "department",
    "dueDate",
    "createdAt",
    "updatedAt",
  ];

  // Step 2: Convert each ticket to an array of string values
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
      // Step 3: Escape quotes in string values
      // - typeof v === 'string' checks if value is text
      // - v.replace(/"/g, '""') doubles any quotes inside the string
      // - Surround string values with quotes to handle commas in the data
      .map((v) => (typeof v === "string" ? `"${v.replace(/"/g, '""')}"` : v))
      // Step 4: Join values with commas to create a row
      .join(","),
  );

  // Step 5: Combine headers and rows with newline characters
  // First element is headers, rest are data rows
  return [headers.join(","), ...rows].join("\n");
}
