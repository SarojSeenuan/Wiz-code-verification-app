# ECRリポジトリリソース定義
# コンテナイメージを保存するためのECRリポジトリを作成します
#
# ============================================================
# Wiz検証用の意図的な脆弱性
# ============================================================
# 本ファイルには以下の意図的な設定ミスが含まれています（Wiz検証用）：
# 1. イメージスキャンが無効化される可能性（scan_on_push=false、S04で検出）
# 2. イメージタグの変更が可能（image_tag_mutability=MUTABLE、S04で検出）
# 3. 暗号化がKMSではなくAES256（S04で検出）
# 4. ライフサイクルポリシーが緩い（古いイメージが削除されない、S04で検出）
#
# 本番環境では絶対に使用しないでください
# ============================================================

# バックエンドECRリポジトリ
resource "aws_ecr_repository" "backend" {
  name                 = "${var.environment}-taskflow-backend"
  image_tag_mutability = var.image_tag_mutability

  image_scanning_configuration {
    scan_on_push = var.scan_on_push
  }

  encryption_configuration {
    encryption_type = var.encryption_type
    kms_key         = var.kms_key_arn
  }

  tags = merge(
    var.common_tags,
    {
      Name      = "${var.environment}-taskflow-backend"
      Component = "backend"
    }
  )
}

# フロントエンドECRリポジトリ
resource "aws_ecr_repository" "frontend" {
  name                 = "${var.environment}-taskflow-frontend"
  image_tag_mutability = var.image_tag_mutability

  image_scanning_configuration {
    scan_on_push = var.scan_on_push
  }

  encryption_configuration {
    encryption_type = var.encryption_type
    kms_key         = var.kms_key_arn
  }

  tags = merge(
    var.common_tags,
    {
      Name      = "${var.environment}-taskflow-frontend"
      Component = "frontend"
    }
  )
}

# ライフサイクルポリシー - バックエンド
resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "タグなし画像を削除"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = var.untagged_image_retention_days
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "古い画像を保持数制限"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = var.max_image_count
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# ライフサイクルポリシー - フロントエンド
resource "aws_ecr_lifecycle_policy" "frontend" {
  repository = aws_ecr_repository.frontend.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "タグなし画像を削除"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = var.untagged_image_retention_days
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "古い画像を保持数制限"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = var.max_image_count
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# リポジトリポリシー - バックエンド（他のAWSアカウントからのアクセスを許可する場合）
resource "aws_ecr_repository_policy" "backend" {
  count      = length(var.allowed_account_ids) > 0 ? 1 : 0
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowPull"
        Effect = "Allow"
        Principal = {
          AWS = [for account_id in var.allowed_account_ids : "arn:aws:iam::${account_id}:root"]
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

# リポジトリポリシー - フロントエンド
resource "aws_ecr_repository_policy" "frontend" {
  count      = length(var.allowed_account_ids) > 0 ? 1 : 0
  repository = aws_ecr_repository.frontend.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowPull"
        Effect = "Allow"
        Principal = {
          AWS = [for account_id in var.allowed_account_ids : "arn:aws:iam::${account_id}:root"]
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
