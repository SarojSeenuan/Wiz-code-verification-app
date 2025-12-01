# Networkingモジュールの変数定義

variable "environment" {
  description = "環境名（dev, prod等）"
  type        = string
}

variable "aws_region" {
  description = "AWSリージョン"
  type        = string
}

variable "vpc_cidr" {
  description = "VPCのCIDRブロック"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "使用するAvailability Zones"
  type        = list(string)
}

variable "public_subnet_cidrs" {
  description = "パブリックサブネットのCIDRブロックリスト"
  type        = list(string)
}

variable "private_subnet_cidrs" {
  description = "プライベートサブネットのCIDRブロックリスト"
  type        = list(string)
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

variable "common_tags" {
  description = "全リソースに適用する共通タグ"
  type        = map(string)
  default     = {}
}
