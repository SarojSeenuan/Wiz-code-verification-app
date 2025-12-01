# ECSモジュールの出力値

# クラスター
output "cluster_id" {
  description = "ECSクラスターID"
  value       = aws_ecs_cluster.main.id
}

output "cluster_arn" {
  description = "ECSクラスターARN"
  value       = aws_ecs_cluster.main.arn
}

output "cluster_name" {
  description = "ECSクラスター名"
  value       = aws_ecs_cluster.main.name
}

# ALB
output "alb_id" {
  description = "ALB ID"
  value       = aws_lb.main.id
}

output "alb_arn" {
  description = "ALB ARN"
  value       = aws_lb.main.arn
}

output "alb_dns_name" {
  description = "ALB DNSName"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "ALB Zone ID"
  value       = aws_lb.main.zone_id
}

# サービス
output "backend_service_id" {
  description = "バックエンドECSサービスID"
  value       = aws_ecs_service.backend.id
}

output "backend_service_name" {
  description = "バックエンドECSサービス名"
  value       = aws_ecs_service.backend.name
}

output "frontend_service_id" {
  description = "フロントエンドECSサービスID"
  value       = aws_ecs_service.frontend.id
}

output "frontend_service_name" {
  description = "フロントエンドECSサービス名"
  value       = aws_ecs_service.frontend.name
}

# タスク定義
output "backend_task_definition_arn" {
  description = "バックエンドタスク定義ARN"
  value       = aws_ecs_task_definition.backend.arn
}

output "frontend_task_definition_arn" {
  description = "フロントエンドタスク定義ARN"
  value       = aws_ecs_task_definition.frontend.arn
}

# IAMロール
output "ecs_task_execution_role_arn" {
  description = "ECSタスク実行ロールARN"
  value       = aws_iam_role.ecs_task_execution_role.arn
}

output "ecs_task_role_arn" {
  description = "ECSタスクロールARN"
  value       = aws_iam_role.ecs_task_role.arn
}

# CloudWatchロググループ
output "backend_log_group_name" {
  description = "バックエンドCloudWatchロググループ名"
  value       = aws_cloudwatch_log_group.backend.name
}

output "frontend_log_group_name" {
  description = "フロントエンドCloudWatchロググループ名"
  value       = aws_cloudwatch_log_group.frontend.name
}

# ターゲットグループ
output "backend_target_group_arn" {
  description = "バックエンドターゲットグループARN"
  value       = aws_lb_target_group.backend.arn
}

output "frontend_target_group_arn" {
  description = "フロントエンドターゲットグループARN"
  value       = aws_lb_target_group.frontend.arn
}
