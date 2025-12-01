# RDSモジュールの出力値

output "db_instance_id" {
  description = "RDSインスタンスID"
  value       = aws_db_instance.main.id
}

output "db_instance_arn" {
  description = "RDSインスタンスARN"
  value       = aws_db_instance.main.arn
}

output "db_instance_endpoint" {
  description = "RDSインスタンスエンドポイント"
  value       = aws_db_instance.main.endpoint
}

output "db_instance_address" {
  description = "RDSインスタンスアドレス"
  value       = aws_db_instance.main.address
}

output "db_instance_port" {
  description = "RDSインスタンスポート"
  value       = aws_db_instance.main.port
}

output "db_name" {
  description = "データベース名"
  value       = aws_db_instance.main.db_name
}

output "db_username" {
  description = "マスターユーザー名"
  value       = aws_db_instance.main.username
  sensitive   = true
}

output "db_subnet_group_name" {
  description = "DBサブネットグループ名"
  value       = aws_db_subnet_group.main.name
}

output "db_parameter_group_name" {
  description = "DBパラメータグループ名"
  value       = aws_db_parameter_group.main.name
}
