// In-memory database for Vercel serverless deployment
// Mimics the better-sqlite3 API using plain JavaScript

type Row = Record<string, any>;

class MemoryTable {
  rows: Row[] = [];
  columns: string[] = [];
}

class PreparedStatement {
  constructor(private db: MemoryDatabase, private sql: string) {}

  run(...params: any[]): { changes: number } {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    return this.db.executeRun(this.sql, flatParams);
  }

  get(...params: any[]): Row | undefined {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const rows = this.db.executeSelect(this.sql, flatParams);
    return rows[0];
  }

  all(...params: any[]): Row[] {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    return this.db.executeSelect(this.sql, flatParams);
  }
}

class MemoryDatabase {
  private tables: Map<string, MemoryTable> = new Map();

  pragma(_: string) { /* no-op */ }

  exec(sql: string) {
    // Parse CREATE TABLE statements to set up tables
    const createRegex = /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(\w+)\s*\(([^;]+?)\)\s*;/gi;
    let match;
    while ((match = createRegex.exec(sql)) !== null) {
      const tableName = match[1];
      if (!this.tables.has(tableName)) {
        this.tables.set(tableName, new MemoryTable());
      }
    }
    // Ensure all tables exist
    for (const name of ['users', 'companies', 'news_articles', 'generated_content', 'waitlist']) {
      if (!this.tables.has(name)) {
        this.tables.set(name, new MemoryTable());
      }
    }
  }

  prepare(sql: string): PreparedStatement {
    return new PreparedStatement(this, sql);
  }

  executeRun(sql: string, params: any[]): { changes: number } {
    const sqlUpper = sql.trim().toUpperCase();

    if (sqlUpper.startsWith('INSERT')) {
      return this.executeInsert(sql, params);
    }
    if (sqlUpper.startsWith('UPDATE')) {
      return this.executeUpdate(sql, params);
    }
    return { changes: 0 };
  }

  private executeInsert(sql: string, params: any[]): { changes: number } {
    const ignoreMode = sql.toUpperCase().includes('OR IGNORE');
    // Extract table name
    const tableMatch = sql.match(/INSERT\s+(?:OR\s+IGNORE\s+)?INTO\s+(\w+)/i);
    if (!tableMatch) return { changes: 0 };
    const tableName = tableMatch[1];
    const table = this.tables.get(tableName);
    if (!table) return { changes: 0 };

    // Extract column names
    const colMatch = sql.match(/\(([^)]+)\)\s*VALUES/i);
    if (!colMatch) return { changes: 0 };
    const columns = colMatch[1].split(',').map(c => c.trim());

    // Build row
    const row: Row = {};
    columns.forEach((col, i) => {
      row[col] = params[i] !== undefined ? params[i] : null;
    });

    // For IGNORE mode, check uniqueness by id or email
    if (ignoreMode) {
      const existingById = row.id ? table.rows.find(r => r.id === row.id) : null;
      const existingByEmail = row.email ? table.rows.find(r => r.email === row.email) : null;
      if (existingById || existingByEmail) return { changes: 0 };
    }

    table.rows.push(row);
    return { changes: 1 };
  }

  private executeUpdate(sql: string, params: any[]): { changes: number } {
    // Extract table name
    const tableMatch = sql.match(/UPDATE\s+(\w+)\s+SET/i);
    if (!tableMatch) return { changes: 0 };
    const table = this.tables.get(tableMatch[1]);
    if (!table) return { changes: 0 };

    // Extract SET clause column names
    const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i);
    if (!setMatch) return { changes: 0 };
    const setCols = setMatch[1].split(',').map(s => {
      const m = s.trim().match(/^(\w+)\s*=/);
      return m ? m[1] : '';
    }).filter(Boolean);

    // Extract WHERE clause
    const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
    if (!whereMatch) return { changes: 0 };
    const whereCol = whereMatch[1];

    // Params: SET values first, then WHERE value
    // Ignore datetime('now') type expressions in SET
    const setExpressions = setMatch[1].split(',').map(s => s.trim());
    let paramIdx = 0;
    const setValues: Record<string, any> = {};
    for (const expr of setExpressions) {
      const colM = expr.match(/^(\w+)\s*=\s*(.*)/);
      if (!colM) continue;
      const col = colM[1];
      const val = colM[2].trim();
      if (val === '?' ) {
        setValues[col] = params[paramIdx++];
      }
      // skip datetime('now') etc
    }
    const whereValue = params[paramIdx] !== undefined ? params[paramIdx] : params[params.length - 1];

    let changes = 0;
    for (const row of table.rows) {
      if (row[whereCol] === whereValue) {
        Object.assign(row, setValues);
        row.updated_at = new Date().toISOString();
        changes++;
      }
    }
    return { changes };
  }

  executeSelect(sql: string, params: any[]): Row[] {
    const sqlUpper = sql.trim().toUpperCase();

    // Handle COUNT
    if (sqlUpper.includes('COUNT(*)')) {
      const tableMatch = sql.match(/FROM\s+(\w+)/i);
      if (!tableMatch) return [{ count: 0 }];
      const table = this.tables.get(tableMatch[1]);
      return [{ count: table ? table.rows.length : 0 }];
    }

    // Extract table name
    const tableMatch = sql.match(/FROM\s+(\w+)/i);
    if (!tableMatch) return [];
    const table = this.tables.get(tableMatch[1]);
    if (!table) return [];

    // Extract selected columns
    const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM/i);
    const selectAll = selectMatch && selectMatch[1].trim() === '*';
    const selectCols = selectAll ? null : selectMatch?.[1].split(',').map(c => c.trim());

    let results = [...table.rows];
    let paramIdx = 0;

    // Handle WHERE clause
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|\s*$)/i);
    if (whereMatch) {
      const whereClause = whereMatch[1].trim();
      results = this.filterRows(results, whereClause, params);
    }

    // Handle ORDER BY
    const orderMatch = sql.match(/ORDER\s+BY\s+(\w+)\s+(ASC|DESC)/i);
    if (orderMatch) {
      const orderCol = orderMatch[1];
      const orderDir = orderMatch[2].toUpperCase();
      results.sort((a, b) => {
        const va = a[orderCol] || '';
        const vb = b[orderCol] || '';
        if (orderDir === 'DESC') return va > vb ? -1 : va < vb ? 1 : 0;
        return va < vb ? -1 : va > vb ? 1 : 0;
      });
    }

    // Handle LIMIT
    const limitMatch = sql.match(/LIMIT\s+\?/i);
    if (limitMatch) {
      // Find the LIMIT param - it's after WHERE params
      const whereParamCount = (whereMatch?.[1]?.match(/\?/g) || []).length;
      const limitVal = params[whereParamCount] || 100;
      results = results.slice(0, limitVal);
    }

    // Project columns if not SELECT *
    if (selectCols) {
      results = results.map(row => {
        const projected: Row = {};
        for (const col of selectCols) {
          projected[col] = row[col];
        }
        return projected;
      });
    }

    return results;
  }

  private filterRows(rows: Row[], whereClause: string, params: any[]): Row[] {
    let paramIdx = 0;

    // Handle IN clause: WHERE id IN (?,?,?)
    const inMatch = whereClause.match(/(\w+)\s+IN\s*\(([^)]+)\)/i);
    if (inMatch) {
      const col = inMatch[1];
      const placeholders = inMatch[2].split(',').map(() => params[paramIdx++]);
      return rows.filter(r => placeholders.includes(r[col]));
    }

    // Split by AND/OR
    const conditions = this.splitConditions(whereClause);
    const hasOr = whereClause.toUpperCase().includes(' OR ');

    return rows.filter(row => {
      const results = conditions.map(cond => {
        // LIKE condition
        const likeMatch = cond.match(/(\w+)\s+LIKE\s+\?/i);
        if (likeMatch) {
          const col = likeMatch[1];
          const pattern = String(params[paramIdx++]).replace(/%/g, '');
          const val = String(row[col] || '').toLowerCase();
          return val.includes(pattern.toLowerCase());
        }

        // Equality condition
        const eqMatch = cond.match(/(\w+)\s*=\s*\?/i);
        if (eqMatch) {
          const col = eqMatch[1];
          return row[col] === params[paramIdx++];
        }

        return true;
      });

      if (hasOr) return results.some(r => r);
      return results.every(r => r);
    });
  }

  private splitConditions(clause: string): string[] {
    // Simple split on AND/OR, not handling nested conditions
    return clause.split(/\s+(?:AND|OR)\s+/i).map(c => c.trim());
  }
}

// Singleton
let db: MemoryDatabase;

function getDb(): MemoryDatabase {
  if (!db) {
    db = new MemoryDatabase();
    db.exec('init'); // Triggers table creation
    seedDemoData(db);
  }
  return db;
}

function seedDemoData(db: MemoryDatabase) {
  // We don't seed users - let people register fresh
  // Demo articles get seeded via the news.ts seedDemoArticles() call
}

export default getDb;
