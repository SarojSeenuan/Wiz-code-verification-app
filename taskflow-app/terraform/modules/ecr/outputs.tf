# ECRモジュールの出力値

output "backend_repository_url" {
  description = "バックエンドECRリポジトリURL"
  value       = aws_ecr_repository.backend.repository_url
}

output "backend_repository_arn" {
  description = "バックエンドECRリポジトリARN"
  value       = aws_ecr_repository.backend.arn
}

output "backend_repository_name" {
  description = "バックエンドECRリポジトリ名"
  value       = aws_ecr_repository.backend.name
}

output "frontend_repository_url" {
  description = "フロントエンドECRリポジトリURL"
  value       = aws_ecr_repository.frontend.repository_url
}

output "frontend_repository_arn" {
  description = "フロントエンドECRリポジトリARN"
  value       = aws_ecr_repository.frontend.arn
}

output "frontend_repository_name" {
  description = "フロントエンドECRリポジトリ名"
  value       = aws_ecr_repository.frontend.name
}

output "registry_id" {
  description = "ECRレジストリID"
  value       = aws_ecr_repository.backend.registry_id
}
