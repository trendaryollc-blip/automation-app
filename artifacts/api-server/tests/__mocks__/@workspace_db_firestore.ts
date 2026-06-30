import {
  aiSettingsRepo,
  getTableData,
  getDatabaseMode,
  isFirestoreMode,
  resetDb,
  seedTable,
} from "./@workspace_db";

export {
  aiSettingsRepo,
  getTableData,
  getDatabaseMode,
  isFirestoreMode,
  resetDb,
  seedTable,
};

export function getFirestoreDb() {
  return null;
}

export const logger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};
