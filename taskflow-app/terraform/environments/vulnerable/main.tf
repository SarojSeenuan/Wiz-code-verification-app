# 検証用の脆弱なTerraform設定
# **警告**: このファイルは意図的にセキュリティ脆弱性を含んでいます
# Wizの検出機能をテストするためのものであり、本番環境では絶対に使用しないでください
# terraform apply は実行しないでください（課金が発生します）

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment     = "vulnerable"
      Project         = "TaskFlow-Verification"
      ManagedBy       = "Terraform"
      WizVerification = "true"
      Purpose         = "Security-Testing-Only"
    }
  }
}

# ランダムサフィックス生成
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

# ========================================
# 問題1: パブリックアクセス可能なRDS
# Severity: CRITICAL
# ========================================
resource "aws_db_instance" "vulnerable_rds" {
  identifier          = "vulnerable-rds-${random_string.suffix.result}"
  engine              = "postgres"
  engine_version      = "15.4"
  instance_class      = "db.t3.micro"
  allocated_storage   = 20
  username            = "admin"
  password            = "hardcoded_password123" # 問題: ハードコードされたパスワード
  publicly_accessible = true                    # 問題: パブリックアクセス有効
  skip_final_snapshot = true
  storage_encrypted   = false # 問題: 暗号化なし
  deletion_protection = false

  backup_retention_period = 0 # 問題: バックアップなし

  # 問題: 監査ログなし
  # enabled_cloudwatch_logs_exports が設定されていない

  tags = {
    Name        = "Vulnerable RDS"
    Environment = "vulnerable"
    Issue       = "public-accessible-unencrypted-hardcoded-password"
  }
}

# ========================================
# 問題2: パブリックアクセス可能なS3バケット
# Severity: HIGH
# ========================================
resource "aws_s3_bucket" "vulnerable_bucket" {
  bucket = "vulnerable-taskflow-bucket-${random_string.suffix.result}"

  tags = {
    Name        = "Vulnerable S3 Bucket"
    Environment = "vulnerable"
    Issue       = "public-access-no-encryption-no-logging"
  }
}

# 問題: パブリックアクセスブロックが無効
resource "aws_s3_bucket_public_access_block" "vulnerable_pab" {
  bucket = aws_s3_bucket.vulnerable_bucket.id

  block_public_acls       = false # 問題: パブリックACL許可
  block_public_policy     = false # 問題: パブリックポリシー許可
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# 問題: S3暗号化が設定されていない
# aws_s3_bucket_server_side_encryption_configuration が定義されていない

# 問題: アクセスログが設定されていない
# aws_s3_bucket_logging が定義されていない

# 問題: バージョニングが設定されていない
# aws_s3_bucket_versioning が定義されていない

# ========================================
# 問題3: 過度に開放されたセキュリティグループ
# Severity: CRITICAL
# ========================================
resource "aws_security_group" "vulnerable_sg" {
  name        = "vulnerable-sg-${random_string.suffix.result}"
  description = "Overly permissive security group for testing"

  # 問題: すべてのポートを全世界に開放
  ingress {
    description = "Allow all traffic from anywhere"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # 問題: 0.0.0.0/0 からアクセス可能
  }

  # 問題: SSH ポートを全世界に開放
  ingress {
    description = "SSH from anywhere"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # 問題: SSHが全世界に開放
  }

  # 問題: RDP ポートを全世界に開放
  ingress {
    description = "RDP from anywhere"
    from_port   = 3389
    to_port     = 3389
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # 問題: RDPが全世界に開放
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "Vulnerable Security Group"
    Environment = "vulnerable"
    Issue       = "overly-permissive-all-ports-ssh-rdp-open"
  }
}

# ========================================
# 問題4: 暗号化なしのEBS ボリューム
# Severity: HIGH
# ========================================
resource "aws_ebs_volume" "vulnerable_ebs" {
  availability_zone = "${var.aws_region}a"
  size              = 10
  encrypted         = false # 問題: 暗号化なし

  tags = {
    Name        = "Vulnerable EBS Volume"
    Environment = "vulnerable"
    Issue       = "unencrypted-ebs"
  }
}

# ========================================
# 問題5: パブリックIPを持つEC2インスタンス（仮）
# Severity: MEDIUM
# 注: 実際にはデプロイしないため、コメントアウト
# ========================================
# resource "aws_instance" "vulnerable_ec2" {
#   ami           = data.aws_ami.ubuntu.id
#   instance_class = "t3.micro"
#   associate_public_ip_address = true  # 問題: パブリックIP割り当て
#
#   tags = {
#     Name = "Vulnerable EC2"
#     Issue = "public-ip-no-encryption"
#   }
# }

# ========================================
# 問題6: IMDSv1を使用（メタデータサービス）
# Severity: MEDIUM
# ========================================
# resource "aws_instance" "vulnerable_imds" {
#   ami           = data.aws_ami.ubuntu.id
#   instance_class = "t3.micro"
#
#   metadata_options {
#     http_tokens = "optional"  # 問題: IMDSv1を許可（IMDSv2を強制すべき）
#   }
#
#   tags = {
#     Name = "Vulnerable IMDS"
#     Issue = "imdsv1-enabled"
#   }
# }

# ========================================
# 問題7: ログが無効なCloudTrail（仮）
# Severity: HIGH
# ========================================
# resource "aws_cloudtrail" "vulnerable_trail" {
#   name                          = "vulnerable-trail"
#   s3_bucket_name                = aws_s3_bucket.vulnerable_bucket.id
#   include_global_service_events = false  # 問題: グローバルサービスイベントを記録しない
#   enable_logging                = false  # 問題: ログ記録が無効
#
#   tags = {
#     Name = "Vulnerable CloudTrail"
#     Issue = "logging-disabled"
#   }
# }

# ========================================
# 期待される検出結果
# ========================================
# Wizは以下の問題を検出するはずです：
#
# CRITICAL (3件):
#   1. ハードコードされたDBパスワード (aws_db_instance.vulnerable_rds)
#   2. パブリックアクセス可能なRDS (aws_db_instance.vulnerable_rds)
#   3. セキュリティグループが全ポートを0.0.0.0/0に開放 (aws_security_group.vulnerable_sg)
#
# HIGH (5件):
#   4. RDS暗号化なし (aws_db_instance.vulnerable_rds)
#   5. S3パブリックアクセスブロック無効 (aws_s3_bucket_public_access_block.vulnerable_pab)
#   6. S3暗号化なし (aws_s3_bucket.vulnerable_bucket)
#   7. EBS暗号化なし (aws_ebs_volume.vulnerable_ebs)
#   8. SSH/RDPが0.0.0.0/0に開放 (aws_security_group.vulnerable_sg)
#
# MEDIUM (2件):
#   9. S3アクセスログなし (aws_s3_bucket.vulnerable_bucket)
#  10. RDSバックアップなし (aws_db_instance.vulnerable_rds)
