# ECRモジュールの変数定義

variable "environment" {
  description = "環境名（dev, prod等）"
  type        = string
}

variable "image_tag_mutability" {
  description = "イメージタグの変更可能性（MUTABLE or IMMUTABLE）"
  type        = string
  default     = "MUTABLE"

  validation {
    condition     = contains(["MUTABLE", "IMMUTABLE"], var.image_tag_mutability)
    error_message = "image_tag_mutabilityはMUTABLEまたはIMMUTABLEである必要があります。"
  }
}

variable "scan_on_push" {
  description = "プッシュ時にイメージスキャンを実行するかどうか"
  type        = bool
  default     = true
}

variable "encryption_type" {
  description = "暗号化タイプ（AES256 or KMS）"
  type        = string
  default     = "AES256"

  validation {
    condition     = contains(["AES256", "KMS"], var.encryption_type)
    error_message = "encryption_typeはAES256またはKMSである必要があります。"
  }
}

variable "kms_key_arn" {
  description = "KMS暗号化を使用する場合のKMSキーARN"
  type        = string
  default     = null
}

variable "untagged_image_retention_days" {
  description = "タグなし画像の保持日数"
  type        = number
  default     = 7
}

variable "max_image_count" {
  description = "保持する最大イメージ数"
  type        = number
  default     = 30
}

variable "allowed_account_ids" {
  description = "ECRリポジトリへのアクセスを許可するAWSアカウントIDのリスト"
  type        = list(string)
  default     = []
}

variable "common_tags" {
  description = "全リソースに適用する共通タグ"
  type        = map(string)
  default     = {}
}
