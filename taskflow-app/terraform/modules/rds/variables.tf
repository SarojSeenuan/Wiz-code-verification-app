# RDSモジュールの変数定義
#
# ============================================================
# Wiz検証用の意図的な脆弱性
# ============================================================
# デフォルト値に意図的なセキュリティ設定ミスを含めています：
# - engine_version = "14.7"（古いバージョン、S04で検出）
# - storage_encrypted = false（暗号化無効、S04で検出）
# - publicly_accessible = true（パブリックアクセス許可、S04で検出）
# - backup_retention_period = 0（バックアップ無効、S04で検出）
# - deletion_protection = false（削除保護無効、S04で検出）
# - performance_insights_enabled = false（監視機能無効、S04で検出）
# これらはWiz Code検証用のサンプルです
# 本番環境では絶対に使用しないでください
# ============================================================

variable "environment" {
  description = "環境名（dev, prod等）"
  type        = string
}

variable "private_subnet_ids" {
  description = "プライベートサブネットIDのリスト"
  type        = list(string)
}

variable "security_group_id" {
  description = "RDSセキュリティグループID"
  type        = string
}

variable "engine_version" {
  description = "PostgreSQLエンジンバージョン"
  type        = string
  default     = "14.7" # Wiz検証用: 意図的に古いバージョン（S04で検出）
}

variable "instance_class" {
  description = "DBインスタンスクラス"
  type        = string
  default     = "db.t3.micro"
}

variable "allocated_storage" {
  description = "割り当てストレージ容量（GB）"
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "自動スケーリングの最大ストレージ容量（GB）"
  type        = number
  default     = 100
}

variable "storage_type" {
  description = "ストレージタイプ"
  type        = string
  default     = "gp3"
}

variable "storage_encrypted" {
  description = "ストレージ暗号化を有効にするかどうか"
  type        = bool
  default     = false # Wiz検証用: 意図的に暗号化無効（S04で検出）
}

variable "kms_key_arn" {
  description = "KMS暗号化キーのARN"
  type        = string
  default     = null
}

variable "database_name" {
  description = "データベース名"
  type        = string
  default     = "taskflow"
}

variable "master_username" {
  description = "マスターユーザー名"
  type        = string
  default     = "taskflow_admin"
}

variable "master_password" {
  description = "マスターパスワード"
  type        = string
  sensitive   = true
}

variable "database_port" {
  description = "データベースポート番号"
  type        = number
  default     = 5432
}

variable "multi_az" {
  description = "マルチAZ配置を有効にするかどうか"
  type        = bool
  default     = false
}

variable "publicly_accessible" {
  description = "パブリックアクセスを許可するかどうか"
  type        = bool
  default     = true # Wiz検証用: 意図的にパブリックアクセス許可（S04で検出）
}

variable "backup_retention_period" {
  description = "バックアップ保持期間（日数）"
  type        = number
  default     = 0 # Wiz検証用: 意図的にバックアップ無効（S04で検出）
}

variable "backup_window" {
  description = "バックアップウィンドウ（UTC）"
  type        = string
  default     = "03:00-04:00"
}

variable "maintenance_window" {
  description = "メンテナンスウィンドウ（UTC）"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

variable "enabled_cloudwatch_logs_exports" {
  description = "CloudWatchにエクスポートするログタイプ"
  type        = list(string)
  default     = ["postgresql", "upgrade"]
}

variable "deletion_protection" {
  description = "削除保護を有効にするかどうか"
  type        = bool
  default     = false # Wiz検証用: 意図的に削除保護無効（S04で検出）
}

variable "skip_final_snapshot" {
  description = "最終スナップショットをスキップするかどうか"
  type        = bool
  default     = true
}

variable "performance_insights_enabled" {
  description = "Performance Insightsを有効にするかどうか"
  type        = bool
  default     = false # Wiz検証用: 意図的に監視機能無効（S04で検出）
}

variable "performance_insights_kms_key_id" {
  description = "Performance InsightsのKMSキーID"
  type        = string
  default     = null
}

variable "performance_insights_retention_period" {
  description = "Performance Insightsのデータ保持期間（日数）"
  type        = number
  default     = 7
}

variable "auto_minor_version_upgrade" {
  description = "マイナーバージョンの自動アップグレードを有効にするかどうか"
  type        = bool
  default     = true
}

variable "enable_cloudwatch_alarms" {
  description = "CloudWatchアラームを作成するかどうか"
  type        = bool
  default     = true
}

variable "common_tags" {
  description = "全リソースに適用する共通タグ"
  type        = map(string)
  default     = {}
}
