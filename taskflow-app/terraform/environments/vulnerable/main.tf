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
# 問題8: 過度に広範な権限を持つIAMロール
# Severity: CRITICAL
# ========================================
resource "aws_iam_role" "vulnerable_role" {
  name = "vulnerable-role-${random_string.suffix.result}"

  # 問題: すべてのサービスが引き受け可能
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "*" # 問題: すべてのサービスに許可
        }
      }
    ]
  })

  tags = {
    Name        = "Vulnerable IAM Role"
    Environment = "vulnerable"
    Issue       = "overly-permissive-assume-role"
  }
}

# 問題: 管理者権限を付与
resource "aws_iam_role_policy" "vulnerable_policy" {
  name = "vulnerable-policy"
  role = aws_iam_role.vulnerable_role.id

  # 問題: すべてのリソースに対する全アクション許可
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "*" # 問題: すべてのアクション許可
        Resource = "*" # 問題: すべてのリソースに許可
      }
    ]
  })
}

# ========================================
# 問題9: 暗号化なしのLambda環境変数
# Severity: HIGH
# ========================================
resource "aws_lambda_function" "vulnerable_lambda" {
  filename      = "dummy-lambda.zip"
  function_name = "vulnerable-lambda-${random_string.suffix.result}"
  role          = aws_iam_role.vulnerable_role.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"

  # 問題: 環境変数が暗号化されていない
  environment {
    variables = {
      DB_PASSWORD = "super_secret_password" # 問題: 平文のシークレット
      API_KEY     = "sk_live_abc123xyz"     # 問題: 平文のAPIキー
    }
  }

  # 問題: KMS暗号化キーが指定されていない
  # kms_key_arn が設定されていない

  tags = {
    Name        = "Vulnerable Lambda"
    Environment = "vulnerable"
    Issue       = "unencrypted-env-vars-secrets-in-plaintext"
  }
}

# ========================================
# 問題10: 自動ローテーションなしのKMSキー
# Severity: MEDIUM
# ========================================
resource "aws_kms_key" "vulnerable_kms" {
  description             = "Vulnerable KMS key without rotation"
  deletion_window_in_days = 7
  enable_key_rotation     = false # 問題: 自動ローテーション無効

  tags = {
    Name        = "Vulnerable KMS Key"
    Environment = "vulnerable"
    Issue       = "no-key-rotation"
  }
}

# ========================================
# 問題11: 暗号化なしのSNSトピック
# Severity: MEDIUM
# ========================================
resource "aws_sns_topic" "vulnerable_sns" {
  name = "vulnerable-sns-${random_string.suffix.result}"

  # 問題: KMS暗号化が設定されていない
  # kms_master_key_id が設定されていない

  tags = {
    Name        = "Vulnerable SNS Topic"
    Environment = "vulnerable"
    Issue       = "unencrypted-sns"
  }
}

# ========================================
# 問題12: 暗号化なしのSQSキュー
# Severity: MEDIUM
# ========================================
resource "aws_sqs_queue" "vulnerable_sqs" {
  name = "vulnerable-sqs-${random_string.suffix.result}"

  # 問題: サーバーサイド暗号化なし
  # sqs_managed_sse_enabled または kms_master_key_id が設定されていない

  tags = {
    Name        = "Vulnerable SQS Queue"
    Environment = "vulnerable"
    Issue       = "unencrypted-sqs"
  }
}

# ========================================
# 問題13: ログが無効なELB
# Severity: MEDIUM
# ========================================
resource "aws_lb" "vulnerable_alb" {
  name               = "vulnerable-alb-${random_string.suffix.result}"
  internal           = false # 問題: インターネット向け
  load_balancer_type = "application"
  subnets            = [] # ダミー（実際にはデプロイしない）

  # 問題: アクセスログが無効
  # access_logs が設定されていない

  # 問題: 削除保護が無効
  enable_deletion_protection = false

  tags = {
    Name        = "Vulnerable ALB"
    Environment = "vulnerable"
    Issue       = "no-logging-no-deletion-protection"
  }
}

# ========================================
# 問題14: デフォルト暗号化なしのElasticsearch
# Severity: HIGH
# ========================================
resource "aws_elasticsearch_domain" "vulnerable_es" {
  domain_name           = "vulnerable-es-${random_string.suffix.result}"
  elasticsearch_version = "7.10"

  cluster_config {
    instance_type = "t3.small.elasticsearch"
  }

  # 問題: 保存時の暗号化なし
  encrypt_at_rest {
    enabled = false # 問題: 暗号化無効
  }

  # 問題: ノード間暗号化なし
  node_to_node_encryption {
    enabled = false # 問題: ノード間暗号化無効
  }

  # 問題: HTTPS強制なし
  domain_endpoint_options {
    enforce_https = false # 問題: HTTPS強制なし
  }

  ebs_options {
    ebs_enabled = true
    volume_size = 10
  }

  tags = {
    Name        = "Vulnerable Elasticsearch"
    Environment = "vulnerable"
    Issue       = "no-encryption-at-rest-no-node-encryption-no-https"
  }
}

# ========================================
# 問題15: パブリックに公開されたECR
# Severity: HIGH
# ========================================
resource "aws_ecr_repository" "vulnerable_ecr" {
  name                 = "vulnerable-ecr-${random_string.suffix.result}"
  image_tag_mutability = "MUTABLE" # 問題: タグ変更可能

  # 問題: イメージスキャンが無効
  image_scanning_configuration {
    scan_on_push = false # 問題: プッシュ時のスキャン無効
  }

  # 問題: 暗号化設定なし（デフォルトはAES256だが、KMSを推奨）
  encryption_configuration {
    encryption_type = "AES256" # 問題: KMSではなくAES256
  }

  tags = {
    Name        = "Vulnerable ECR"
    Environment = "vulnerable"
    Issue       = "mutable-tags-no-scan-on-push-aes256-encryption"
  }
}

# 問題: ECRリポジトリポリシーでパブリックアクセス許可
resource "aws_ecr_repository_policy" "vulnerable_ecr_policy" {
  repository = aws_ecr_repository.vulnerable_ecr.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "PublicReadAccess"
        Effect = "Allow"
        Principal = {
          AWS = "*" # 問題: すべてのAWSアカウントに許可
        }
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability"
        ]
      }
    ]
  })
}

# ========================================
# 期待される検出結果
# ========================================
# Wizは以下の問題を検出するはずです：
#
# CRITICAL (5件):
#   1. ハードコードされたDBパスワード (aws_db_instance.vulnerable_rds)
#   2. パブリックアクセス可能なRDS (aws_db_instance.vulnerable_rds)
#   3. セキュリティグループが全ポートを0.0.0.0/0に開放 (aws_security_group.vulnerable_sg)
#   4. IAMロールの過度に広範な権限 (aws_iam_role.vulnerable_role)
#   5. Lambda環境変数に平文のシークレット (aws_lambda_function.vulnerable_lambda)
#
# HIGH (8件):
#   6. RDS暗号化なし (aws_db_instance.vulnerable_rds)
#   7. S3パブリックアクセスブロック無効 (aws_s3_bucket_public_access_block.vulnerable_pab)
#   8. S3暗号化なし (aws_s3_bucket.vulnerable_bucket)
#   9. EBS暗号化なし (aws_ebs_volume.vulnerable_ebs)
#  10. SSH/RDPが0.0.0.0/0に開放 (aws_security_group.vulnerable_sg)
#  11. Elasticsearch暗号化なし (aws_elasticsearch_domain.vulnerable_es)
#  12. ECRがパブリックアクセス可能 (aws_ecr_repository_policy.vulnerable_ecr_policy)
#  13. Lambda環境変数暗号化なし (aws_lambda_function.vulnerable_lambda)
#
# MEDIUM (7件):
#  14. S3アクセスログなし (aws_s3_bucket.vulnerable_bucket)
#  15. RDSバックアップなし (aws_db_instance.vulnerable_rds)
#  16. KMSキーの自動ローテーションなし (aws_kms_key.vulnerable_kms)
#  17. SNS暗号化なし (aws_sns_topic.vulnerable_sns)
#  18. SQS暗号化なし (aws_sqs_queue.vulnerable_sqs)
#  19. ELBログなし (aws_lb.vulnerable_alb)
#  20. ECRイメージスキャン無効 (aws_ecr_repository.vulnerable_ecr)
