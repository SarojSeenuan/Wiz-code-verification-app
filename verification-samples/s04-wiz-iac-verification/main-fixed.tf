# 修正版: セキュアなTerraform設定
# このファイルは、脆弱性を修正したセキュアな設定例です
# Wizスキャンで問題が検出されないことを確認するために使用します

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
      Environment     = "secure"
      Project         = "TaskFlow-Verification"
      ManagedBy       = "Terraform"
      WizVerification = "true"
      Purpose         = "Security-Fixed-Example"
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
# 修正1: セキュアなRDS設定
# ========================================
resource "aws_db_instance" "secure_rds" {
  identifier          = "secure-rds-${random_string.suffix.result}"
  engine              = "postgres"
  engine_version      = "15.4"
  instance_class      = "db.t3.micro"
  allocated_storage   = 20
  username            = "admin"
  password            = random_password.db_password.result # 修正: ランダムパスワード使用
  publicly_accessible = false                              # 修正: パブリックアクセス無効
  skip_final_snapshot = true
  storage_encrypted   = true # 修正: 暗号化有効

  backup_retention_period = 7 # 修正: バックアップ有効

  # 修正: 監査ログ有効化
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = {
    Name        = "Secure RDS"
    Environment = "secure"
    Status      = "fixed"
  }
}

# セキュアなパスワード生成
resource "random_password" "db_password" {
  length  = 32
  special = true
}

# ========================================
# 修正2: セキュアなS3バケット設定
# ========================================
resource "aws_s3_bucket" "secure_bucket" {
  bucket = "secure-taskflow-bucket-${random_string.suffix.result}"

  tags = {
    Name        = "Secure S3 Bucket"
    Environment = "secure"
    Status      = "fixed"
  }
}

# 修正: パブリックアクセスブロック有効
resource "aws_s3_bucket_public_access_block" "secure_pab" {
  bucket = aws_s3_bucket.secure_bucket.id

  block_public_acls       = true # 修正: パブリックACLをブロック
  block_public_policy     = true # 修正: パブリックポリシーをブロック
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 修正: S3暗号化設定
resource "aws_s3_bucket_server_side_encryption_configuration" "secure_encryption" {
  bucket = aws_s3_bucket.secure_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.secure_kms.arn
    }
  }
}

# 修正: アクセスログ設定
resource "aws_s3_bucket_logging" "secure_logging" {
  bucket = aws_s3_bucket.secure_bucket.id

  target_bucket = aws_s3_bucket.secure_bucket.id
  target_prefix = "log/"
}

# 修正: バージョニング有効化
resource "aws_s3_bucket_versioning" "secure_versioning" {
  bucket = aws_s3_bucket.secure_bucket.id

  versioning_configuration {
    status = "Enabled"
  }
}

# ========================================
# 修正3: 適切に制限されたセキュリティグループ
# ========================================
resource "aws_security_group" "secure_sg" {
  name        = "secure-sg-${random_string.suffix.result}"
  description = "Properly restricted security group"

  # 修正: 特定のIPからのHTTPSのみ許可
  ingress {
    description = "HTTPS from trusted IP"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"] # 修正: 特定のCIDRに制限
  }

  # 修正: 特定のIPからのSSHのみ許可
  ingress {
    description = "SSH from bastion"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["10.0.1.0/24"] # 修正: Bastion用サブネットのみ
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "Secure Security Group"
    Environment = "secure"
    Status      = "fixed"
  }
}

# ========================================
# 修正4: 暗号化されたEBSボリューム
# ========================================
resource "aws_ebs_volume" "secure_ebs" {
  availability_zone = "${var.aws_region}a"
  size              = 10
  encrypted         = true                       # 修正: 暗号化有効
  kms_key_id        = aws_kms_key.secure_kms.arn # 修正: KMSキー指定

  tags = {
    Name        = "Secure EBS Volume"
    Environment = "secure"
    Status      = "fixed"
  }
}

# ========================================
# 修正5: 最小権限のIAMロール
# ========================================
resource "aws_iam_role" "secure_role" {
  name = "secure-role-${random_string.suffix.result}"

  # 修正: 特定のサービスのみ許可
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com" # 修正: Lambdaサービスのみ
        }
      }
    ]
  })

  tags = {
    Name        = "Secure IAM Role"
    Environment = "secure"
    Status      = "fixed"
  }
}

# 修正: 最小権限ポリシー
resource "aws_iam_role_policy" "secure_policy" {
  name = "secure-policy"
  role = aws_iam_role.secure_role.id

  # 修正: 必要な権限のみ付与
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# ========================================
# 修正6: 暗号化されたLambda環境変数
# ========================================
resource "aws_lambda_function" "secure_lambda" {
  filename      = "dummy-lambda.zip"
  function_name = "secure-lambda-${random_string.suffix.result}"
  role          = aws_iam_role.secure_role.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"

  # 修正: Secrets Managerを使用（環境変数にシークレットを置かない）
  environment {
    variables = {
      SECRETS_ARN = aws_secretsmanager_secret.db_secret.arn
    }
  }

  # 修正: KMS暗号化キー指定
  kms_key_arn = aws_kms_key.secure_kms.arn

  tags = {
    Name        = "Secure Lambda"
    Environment = "secure"
    Status      = "fixed"
  }
}

# Secrets Managerでシークレットを管理
resource "aws_secretsmanager_secret" "db_secret" {
  name       = "secure-db-secret-${random_string.suffix.result}"
  kms_key_id = aws_kms_key.secure_kms.arn

  tags = {
    Name        = "Secure DB Secret"
    Environment = "secure"
  }
}

resource "aws_secretsmanager_secret_version" "db_secret_version" {
  secret_id = aws_secretsmanager_secret.db_secret.id
  secret_string = jsonencode({
    password = random_password.db_password.result
    api_key  = random_password.api_key.result
  })
}

resource "random_password" "api_key" {
  length  = 32
  special = true
}

# ========================================
# 修正7: 自動ローテーション有効なKMSキー
# ========================================
resource "aws_kms_key" "secure_kms" {
  description             = "Secure KMS key with rotation"
  deletion_window_in_days = 30
  enable_key_rotation     = true # 修正: 自動ローテーション有効

  tags = {
    Name        = "Secure KMS Key"
    Environment = "secure"
    Status      = "fixed"
  }
}

# ========================================
# 修正8: 暗号化されたSNSトピック
# ========================================
resource "aws_sns_topic" "secure_sns" {
  name              = "secure-sns-${random_string.suffix.result}"
  kms_master_key_id = aws_kms_key.secure_kms.arn # 修正: KMS暗号化設定

  tags = {
    Name        = "Secure SNS Topic"
    Environment = "secure"
    Status      = "fixed"
  }
}

# ========================================
# 修正9: 暗号化されたSQSキュー
# ========================================
resource "aws_sqs_queue" "secure_sqs" {
  name                    = "secure-sqs-${random_string.suffix.result}"
  kms_master_key_id       = aws_kms_key.secure_kms.arn # 修正: KMS暗号化設定
  sqs_managed_sse_enabled = false

  tags = {
    Name        = "Secure SQS Queue"
    Environment = "secure"
    Status      = "fixed"
  }
}

# ========================================
# 修正10: ログが有効なALB
# ========================================
resource "aws_lb" "secure_alb" {
  name               = "secure-alb-${random_string.suffix.result}"
  internal           = true  # 修正: 内部ALB
  load_balancer_type = "application"
  subnets            = [] # ダミー（実際にはデプロイしない）

  # 修正: アクセスログ有効
  access_logs {
    bucket  = aws_s3_bucket.secure_bucket.id
    prefix  = "alb-logs"
    enabled = true
  }

  # 修正: 削除保護有効
  enable_deletion_protection = true

  tags = {
    Name        = "Secure ALB"
    Environment = "secure"
    Status      = "fixed"
  }
}

# ========================================
# 修正11: 暗号化されたElasticsearch
# ========================================
resource "aws_elasticsearch_domain" "secure_es" {
  domain_name           = "secure-es-${random_string.suffix.result}"
  elasticsearch_version = "7.10"

  cluster_config {
    instance_type = "t3.small.elasticsearch"
  }

  # 修正: 保存時の暗号化有効
  encrypt_at_rest {
    enabled    = true
    kms_key_id = aws_kms_key.secure_kms.arn
  }

  # 修正: ノード間暗号化有効
  node_to_node_encryption {
    enabled = true
  }

  # 修正: HTTPS強制
  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  ebs_options {
    ebs_enabled = true
    volume_size = 10
  }

  tags = {
    Name        = "Secure Elasticsearch"
    Environment = "secure"
    Status      = "fixed"
  }
}

# ========================================
# 修正12: セキュアなECR
# ========================================
resource "aws_ecr_repository" "secure_ecr" {
  name                 = "secure-ecr-${random_string.suffix.result}"
  image_tag_mutability = "IMMUTABLE" # 修正: タグ変更不可

  # 修正: イメージスキャン有効
  image_scanning_configuration {
    scan_on_push = true
  }

  # 修正: KMS暗号化
  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = aws_kms_key.secure_kms.arn
  }

  tags = {
    Name        = "Secure ECR"
    Environment = "secure"
    Status      = "fixed"
  }
}

# 修正: ECRリポジトリポリシー（プライベートアクセスのみ）
resource "aws_ecr_repository_policy" "secure_ecr_policy" {
  repository = aws_ecr_repository.secure_ecr.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowPull"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::ACCOUNT_ID:root" # 修正: 特定のアカウントのみ
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
# Variables
# ========================================
variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}
