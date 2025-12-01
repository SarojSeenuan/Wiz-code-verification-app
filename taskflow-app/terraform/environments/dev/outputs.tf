# Dev環境の出力値

# ネットワーク
output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

output "alb_dns_name" {
  description = "ALB DNSName（アプリケーションアクセスURL）"
  value       = module.ecs.alb_dns_name
}

# ECR
output "backend_ecr_repository_url" {
  description = "バックエンドECRリポジトリURL"
  value       = module.ecr.backend_repository_url
}

output "frontend_ecr_repository_url" {
  description = "フロントエンドECRリポジトリURL"
  value       = module.ecr.frontend_repository_url
}

# RDS
output "database_endpoint" {
  description = "RDSエンドポイント"
  value       = module.rds.db_instance_endpoint
  sensitive   = true
}

output "database_name" {
  description = "データベース名"
  value       = module.rds.db_name
}

# ECS
output "ecs_cluster_name" {
  description = "ECSクラスター名"
  value       = module.ecs.cluster_name
}

output "backend_service_name" {
  description = "バックエンドECSサービス名"
  value       = module.ecs.backend_service_name
}

output "frontend_service_name" {
  description = "フロントエンドECSサービス名"
  value       = module.ecs.frontend_service_name
}

# アプリケーションアクセス情報
output "application_url" {
  description = "アプリケーションURL"
  value       = "http://${module.ecs.alb_dns_name}"
}

output "api_url" {
  description = "API URL"
  value       = "http://${module.ecs.alb_dns_name}/api"
}
