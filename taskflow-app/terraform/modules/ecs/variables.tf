# ECSモジュールの変数定義

variable "environment" {
  description = "環境名（dev, prod等）"
  type        = string
}

variable "aws_region" {
  description = "AWSリージョン"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "public_subnet_ids" {
  description = "パブリックサブネットIDのリスト"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "プライベートサブネットIDのリスト"
  type        = list(string)
}

variable "alb_security_group_id" {
  description = "ALBセキュリティグループID"
  type        = string
}

variable "ecs_security_group_id" {
  description = "ECSタスクセキュリティグループID"
  type        = string
}

variable "enable_container_insights" {
  description = "Container Insightsを有効にするかどうか"
  type        = bool
  default     = true
}

variable "enable_alb_deletion_protection" {
  description = "ALB削除保護を有効にするかどうか"
  type        = bool
  default     = false
}

variable "log_retention_days" {
  description = "CloudWatchログの保持日数"
  type        = number
  default     = 7
}

# バックエンド設定
variable "backend_image" {
  description = "バックエンドコンテナイメージURL"
  type        = string
}

variable "backend_image_tag" {
  description = "バックエンドコンテナイメージタグ"
  type        = string
  default     = "latest"
}

variable "backend_cpu" {
  description = "バックエンドタスクCPUユニット"
  type        = string
  default     = "256"
}

variable "backend_memory" {
  description = "バックエンドタスクメモリ（MB）"
  type        = string
  default     = "512"
}

variable "backend_desired_count" {
  description = "バックエンドサービスの希望タスク数"
  type        = number
  default     = 2
}

# フロントエンド設定
variable "frontend_image" {
  description = "フロントエンドコンテナイメージURL"
  type        = string
}

variable "frontend_image_tag" {
  description = "フロントエンドコンテナイメージタグ"
  type        = string
  default     = "latest"
}

variable "frontend_cpu" {
  description = "フロントエンドタスクCPUユニット"
  type        = string
  default     = "256"
}

variable "frontend_memory" {
  description = "フロントエンドタスクメモリ（MB）"
  type        = string
  default     = "512"
}

variable "frontend_desired_count" {
  description = "フロントエンドサービスの希望タスク数"
  type        = number
  default     = 2
}

# データベース設定
variable "database_host" {
  description = "データベースホスト"
  type        = string
}

variable "database_port" {
  description = "データベースポート"
  type        = number
  default     = 5432
}

variable "database_name" {
  description = "データベース名"
  type        = string
}

variable "database_password_secret_arn" {
  description = "データベースパスワードのSecretsManager ARN"
  type        = string
}

variable "common_tags" {
  description = "全リソースに適用する共通タグ"
  type        = map(string)
  default     = {}
}
