/**
 * データストレージ抽象化層
 * 環境に応じてLocalStorageまたはPostgreSQLを選択
 */

const { getLocalStorage } = require("./localStorage");

function getStorage() {
  const mode = process.env.STORAGE_MODE || "localStorage";

  console.log(`[Storage] Using ${mode} mode`);

  switch (mode) {
    case "postgresql":
      // TODO: PostgreSQL実装（本番環境用）
      throw new Error("PostgreSQL storage not implemented yet");

    case "localStorage":
    default:
      return getLocalStorage();
  }
}

module.exports = { getStorage };
