/**
 * Mock for drizzle-orm.
 * This provides mock versions of the operators used in route files
 * that produce objects compatible with the @workspace/db mock.
 */

function toField(field: string | { name?: string } | undefined): string {
  return typeof field === "string" ? field : (field?.name ?? "");
}

function mockEq(field: string | { name?: string }, value: any) {
  return { _field: toField(field), _value: value, operator: "eq" };
}

function mockDesc(field: string | { name?: string }) {
  return { _field: toField(field), _dir: "desc" as const };
}

function mockAsc(field: string | { name?: string }) {
  return { _field: toField(field), _dir: "asc" as const };
}

function mockCount() {
  return { _field: "count(*)", operator: "count" };
}

function mockInArray(field: string | { name?: string }, values: any[]) {
  return { _field: toField(field), _values: values, operator: "in" };
}

function mockGte(field: string | { name?: string }, value: any) {
  return { _field: toField(field), _value: value, operator: "gte" };
}

function mockLte(field: string | { name?: string }, value: any) {
  return { _field: toField(field), _value: value, operator: "lte" };
}

function mockLt(field: string | { name?: string }, value: any) {
  return { _field: toField(field), _value: value, operator: "lt" };
}

function mockAnd(...conditions: any[]) {
  return { _and: conditions, operator: "and" };
}

function mockSql(strings: TemplateStringsArray, ...values: any[]) {
  return { _sql: strings.join("?"), _values: values };
}

export {
  mockEq as eq,
  mockDesc as desc,
  mockAsc as asc,
  mockCount as count,
  mockInArray as inArray,
  mockGte as gte,
  mockLte as lte,
  mockLt as lt,
  mockAnd as and,
  mockSql as sql,
};

export default {};
