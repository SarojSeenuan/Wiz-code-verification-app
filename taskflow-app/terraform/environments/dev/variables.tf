# Dev環境の変数定義

variable "aws_region" {
  description = "AWSリージョン"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "VPCのCIDRブロック"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "使用するAvailability Zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "public_subnet_cidrs" {
  description = "パブリックサブネットのCIDRブロックリスト"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "プライベートサブネットのCIDRブロックリスト"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24"]
}

variable "enable_nat_gateway" {
  description = "NATゲートウェイを有効化するかどうか"
  type        = bool
  default     = true
}

variable "enable_vpc_endpoints" {
  description = "VPCエンドポイントを有効化するかどうか"
  type        = bool
  default     = false
}

variable "database_name" {
  description = "データベース名"
  type        = string
  default     = "taskflow_dev"
}

variable "database_username" {
  description = "データベースユーザー名"
  type        = string
  default     = "taskflow_admin"
}

variable "database_password" {
  description = "データベースパスワード"
  type        = string
  sensitive   = true
}

variable "database_password_secret_arn" {
  description = "データベースパスワードのSecretsManager ARN"
  type        = string
}

variable "backend_image_tag" {
  description = "バックエンドイメージタグ"
  type        = string
  default     = "latest"
}

variable "frontend_image_tag" {
  description = "フロントエンドイメージタグ"
  type        = string
  default     = "latest"
}
