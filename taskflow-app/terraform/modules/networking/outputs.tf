# Networkingモジュールの出力値

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "VPC CIDRブロック"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "パブリックサブネットIDのリスト"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "プライベートサブネットIDのリスト"
  value       = aws_subnet.private[*].id
}

output "internet_gateway_id" {
  description = "インターネットゲートウェイID"
  value       = aws_internet_gateway.main.id
}

output "nat_gateway_ids" {
  description = "NATゲートウェイIDのリスト"
  value       = var.enable_nat_gateway ? aws_nat_gateway.main[*].id : []
}

output "alb_security_group_id" {
  description = "ALBセキュリティグループID"
  value       = aws_security_group.alb.id
}

output "ecs_tasks_security_group_id" {
  description = "ECSタスクセキュリティグループID"
  value       = aws_security_group.ecs_tasks.id
}

output "rds_security_group_id" {
  description = "RDSセキュリティグループID"
  value       = aws_security_group.rds.id
}

output "availability_zones" {
  description = "使用しているAvailability Zones"
  value       = var.availability_zones
}
