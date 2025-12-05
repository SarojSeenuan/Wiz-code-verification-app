# Prod環境のTerraform設定
# 各モジュールを呼び出してProd環境のインフラを構築します

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # S3バックエンド設定（必要に応じてコメント解除）
  # backend "s3" {
  #   bucket         = "your-terraform-state-bucket"
  #   key            = "prod/taskflow/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-state-lock"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = "prod"
      Project     = "TaskFlow"
      ManagedBy   = "Terraform"
      WizVerification = "true"
    }
  }
}

# ローカル変数
locals {
  environment = "prod"
  common_tags = {
    Environment = local.environment
    Project     = "TaskFlow"
  }
}

# Networkingモジュール
module "networking" {
  source = "../../modules/networking"

  environment        = local.environment
  aws_region         = var.aws_region
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs
  enable_nat_gateway   = var.enable_nat_gateway
  enable_vpc_endpoints = var.enable_vpc_endpoints

  common_tags = local.common_tags
}

# ECRモジュール
module "ecr" {
  source = "../../modules/ecr"

  environment              = local.environment
  image_tag_mutability     = "IMMUTABLE"  # 本番環境はIMMUTABLE
  scan_on_push             = true
  encryption_type          = "AES256"
  untagged_image_retention_days = 14
  max_image_count          = 50

  common_tags = local.common_tags
}

# RDSモジュール
module "rds" {
  source = "../../modules/rds"

  environment         = local.environment
  private_subnet_ids  = module.networking.private_subnet_ids
  security_group_id   = module.networking.rds_security_group_id

  engine_version      = "15.14"
  instance_class      = "db.t3.micro"  # 本番環境はより大きいインスタンス
  allocated_storage   = 100
  max_allocated_storage = 500
  storage_encrypted   = true

  database_name       = var.database_name
  master_username     = var.database_username
  master_password     = var.database_password

  multi_az            = true  # 本番環境はマルチAZ
  publicly_accessible = false
  backup_retention_period = 30  # 本番環境は長めの保持期間

  deletion_protection   = true  # 本番環境は削除保護
  skip_final_snapshot   = false

  performance_insights_enabled = true
  enable_cloudwatch_alarms     = true

  common_tags = local.common_tags

  depends_on = [module.networking]
}

# ECSモジュール
module "ecs" {
  source = "../../modules/ecs"

  environment           = local.environment
  aws_region            = var.aws_region
  vpc_id                = module.networking.vpc_id
  public_subnet_ids     = module.networking.public_subnet_ids
  private_subnet_ids    = module.networking.private_subnet_ids
  alb_security_group_id = module.networking.alb_security_group_id
  ecs_security_group_id = module.networking.ecs_tasks_security_group_id

  enable_container_insights      = true
  enable_alb_deletion_protection = true  # 本番環境はALB削除保護
  log_retention_days             = 30

  # バックエンド設定
  backend_image         = module.ecr.backend_repository_url
  backend_image_tag     = var.backend_image_tag
  backend_cpu           = "512"  # 本番環境はより大きいリソース
  backend_memory        = "1024"
  backend_desired_count = 3  # 本番環境は複数タスク

  # フロントエンド設定
  frontend_image         = module.ecr.frontend_repository_url
  frontend_image_tag     = var.frontend_image_tag
  frontend_cpu           = "512"
  frontend_memory        = "1024"
  frontend_desired_count = 3

  # データベース設定
  database_host                = module.rds.db_instance_address
  database_port                = module.rds.db_instance_port
  database_name                = var.database_name
  database_password_secret_arn = var.database_password_secret_arn

  common_tags = local.common_tags

  depends_on = [module.networking, module.ecr, module.rds]
}
