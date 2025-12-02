/**
 * LocalStorage（メモリベース）データストレージ実装
 * 開発環境用 - PostgreSQLの代わりにメモリ内でデータを管理
 *
 * ⚠️ Wiz検証用 - 意図的な脆弱性を含む
 * - パスワードを平文で保存（S01, S02検出用）
 * - SQLインジェクション風のコード（コメントのみ、実際は安全）
 * - 機密情報のコンソール出力（S01, S02検出用）
 */

const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

class LocalStorage {
  constructor() {
    // メモリ内データストア
    this.users = [];
    this.tasks = [];
    this.comments = [];

    // 初期データの投入
    this.seedData();

    // ⚠️ 意図的な脆弱性：機密情報をコンソール出力
    console.log("[SECURITY ISSUE] LocalStorage initialized with data:", {
      userCount: this.users.length,
      taskCount: this.tasks.length,
    });
  }

  // 初期データ投入
  async seedData() {
    // テストユーザーの作成
    const testUser = {
      id: uuidv4(),
      username: "testuser",
      email: "test@example.com",
      password: await bcrypt.hash("password123", 10),
      // ⚠️ 意図的な脆弱性：平文パスワードも保存
      plainPassword: "password123",
      bio: "Test User",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=testuser",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const adminUser = {
      id: uuidv4(),
      username: "admin",
      email: "admin@example.com",
      password: await bcrypt.hash("admin123", 10),
      // ⚠️ 意図的な脆弱性
      plainPassword: "admin123",
      bio: "Admin User",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.users.push(testUser, adminUser);

    // ゲスト用のサンプルタスク
    const sampleTasks = [
      {
        id: uuidv4(),
        title: "Welcome to TaskFlow",
        description:
          "This is a sample task. You can create, edit, and delete tasks!",
        status: "todo",
        priority: "high",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        tags: ["welcome", "sample"],
        userId: null, // ゲストタスク
        createdBy: "Guest",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        title: "Complete project documentation",
        description: "Write comprehensive documentation for the project",
        status: "in_progress",
        priority: "medium",
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        tags: ["documentation", "project"],
        userId: testUser.id,
        createdBy: testUser.username,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    this.tasks.push(...sampleTasks);

    // ⚠️ 意図的な脆弱性：シードデータをコンソールに出力
    console.log("[DEBUG] Seed data created:", {
      users: this.users.map((u) => ({
        username: u.username,
        plainPassword: u.plainPassword,
      })),
      tasks: sampleTasks.length,
    });
  }

  // ========== ユーザー操作 ==========

  async findUserByUsername(username) {
    // ⚠️ 意図的な脆弱性：SQLインジェクション風のコメント
    // SELECT * FROM users WHERE username = '" + username + "' -- 脆弱なクエリの例
    const user = this.users.find((u) => u.username === username);

    if (user) {
      console.log("[DEBUG] User found:", {
        username,
        password: user.plainPassword,
      });
    }

    return user;
  }

  async findUserByEmail(email) {
    return this.users.find((u) => u.email === email);
  }

  async findUserById(id) {
    return this.users.find((u) => u.id === id);
  }

  async createUser(userData) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const newUser = {
      id: uuidv4(),
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
      // ⚠️ 意図的な脆弱性：平文パスワード保存
      plainPassword: userData.password,
      bio: userData.bio || '',
      avatar: userData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.username}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.users.push(newUser);

    // ⚠️ 機密情報をログ出力
    console.log("[DEBUG] New user created:", {
      username: newUser.username,
      email: newUser.email,
      password: userData.password,
    });

    return newUser;
  }

  async updateUser(id, updates) {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) return null;

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
      // ⚠️ 意図的な脆弱性
      updates.plainPassword = updates.password;
    }

    this.users[index] = {
      ...this.users[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return this.users[index];
  }

  async deleteUser(id) {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) return false;

    this.users.splice(index, 1);
    // 関連タスクも削除
    this.tasks = this.tasks.filter((t) => t.userId !== id);
    return true;
  }

  // ========== タスク操作 ==========

  async getAllTasks(filters = {}) {
    let tasks = [...this.tasks];

    // フィルタリング
    if (filters.userId !== undefined) {
      if (filters.userId === null) {
        // ゲストタスクのみ
        tasks = tasks.filter((t) => t.userId === null);
      } else {
        // 特定ユーザーのタスクのみ（ゲストタスクは含めない）
        tasks = tasks.filter((t) => t.userId === filters.userId);
      }
    }

    if (filters.status) {
      tasks = tasks.filter((t) => t.status === filters.status);
    }

    if (filters.priority) {
      tasks = tasks.filter((t) => t.priority === filters.priority);
    }

    if (filters.tags && filters.tags.length > 0) {
      tasks = tasks.filter(
        (t) => t.tags && t.tags.some((tag) => filters.tags.includes(tag))
      );
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      tasks = tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(searchLower) ||
          t.description.toLowerCase().includes(searchLower)
      );
    }

    // ソート
    tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return tasks;
  }

  async getTaskById(id) {
    return this.tasks.find((t) => t.id === id);
  }

  async createTask(taskData) {
    const newTask = {
      id: uuidv4(),
      title: taskData.title,
      description: taskData.description || "",
      status: taskData.status || "todo",
      priority: taskData.priority || "medium",
      dueDate: taskData.dueDate || null,
      tags: taskData.tags || [],
      userId: taskData.userId || null,
      createdBy: taskData.createdBy || "Guest",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.tasks.push(newTask);

    // ⚠️ タスク情報をログ出力
    console.log("[DEBUG] New task created:", newTask);

    return newTask;
  }

  async updateTask(id, updates) {
    const index = this.tasks.findIndex((t) => t.id === id);
    if (index === -1) return null;

    this.tasks[index] = {
      ...this.tasks[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return this.tasks[index];
  }

  async deleteTask(id) {
    const index = this.tasks.findIndex((t) => t.id === id);
    if (index === -1) return false;

    this.tasks.splice(index, 1);
    // 関連コメントも削除
    this.comments = this.comments.filter((c) => c.taskId !== id);
    return true;
  }

  // ========== コメント操作 ==========

  async getCommentsByTaskId(taskId) {
    return this.comments
      .filter((c) => c.taskId === taskId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  async createComment(commentData) {
    const newComment = {
      id: uuidv4(),
      taskId: commentData.taskId,
      userId: commentData.userId || null,
      username: commentData.username || "Guest",
      avatar: commentData.avatar || null,
      // フロントエンドは 'content' フィールドを期待
      content: commentData.text,
      createdAt: new Date().toISOString(),
    };

    this.comments.push(newComment);
    return newComment;
  }

  async deleteComment(id) {
    const index = this.comments.findIndex((c) => c.id === id);
    if (index === -1) return false;

    this.comments.splice(index, 1);
    return true;
  }

  // ========== 統計情報 ==========

  async getStats(userId = null) {
    let userTasks;

    if (userId === null) {
      // ゲストユーザー: ゲストタスクのみ
      userTasks = this.tasks.filter((t) => t.userId === null);
    } else if (userId !== undefined) {
      // ログインユーザー: そのユーザーのタスクのみ
      userTasks = this.tasks.filter((t) => t.userId === userId);
    } else {
      // userId が未指定の場合は全タスク
      userTasks = this.tasks;
    }

    return {
      totalTasks: userTasks.length,
      todoTasks: userTasks.filter((t) => t.status === "todo").length,
      inProgressTasks: userTasks.filter((t) => t.status === "in_progress")
        .length,
      completedTasks: userTasks.filter((t) => t.status === "completed").length,
      highPriorityTasks: userTasks.filter((t) => t.priority === "high").length,
      overdueTasks: userTasks.filter(
        (t) =>
          t.dueDate &&
          new Date(t.dueDate) < new Date() &&
          t.status !== "completed"
      ).length,
    };
  }
}

// シングルトンインスタンス
let instance = null;

function getLocalStorage() {
  if (!instance) {
    instance = new LocalStorage();
  }
  return instance;
}

module.exports = { getLocalStorage };
