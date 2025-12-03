# 検証用の脆弱なTerraform設定 - 変数定義

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "vulnerable"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "TaskFlow-Verification"
}

# 注: この変数は使用されていますが、意図的にハードコードされたパスワードを使用しています
# 本番環境では絶対にこのような使い方をしないでください
variable "database_password" {
  description = "Database master password (DO NOT USE IN PRODUCTION)"
  type        = string
  default     = "hardcoded_password123"
  sensitive   = true
}
