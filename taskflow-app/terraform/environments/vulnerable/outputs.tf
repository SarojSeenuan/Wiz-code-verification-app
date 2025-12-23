# 検証用の脆弱なTerraform設定 - 出力定義

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.vulnerable_rds.endpoint
}

output "rds_publicly_accessible" {
  description = "Is RDS publicly accessible? (Should be false in production)"
  value       = aws_db_instance.vulnerable_rds.publicly_accessible
}

output "s3_bucket_name" {
  description = "S3 bucket name"
  value       = aws_s3_bucket.vulnerable_bucket.id
}

output "security_group_id" {
  description = "Security group ID"
  value       = aws_security_group.vulnerable_sg.id
}

output "ebs_volume_id" {
  description = "EBS volume ID"
  value       = aws_ebs_volume.vulnerable_ebs.id
}

output "detected_issues_summary" {
  description = "Summary of expected Wiz detections"
  value       = <<-EOT
  期待される検出結果:
  - CRITICAL: 3件（ハードコードパスワード、パブリックRDS、全ポート開放）
  - HIGH: 5件（暗号化なし、パブリックアクセス許可）
  - MEDIUM: 2件（ログなし、バックアップなし）

  詳細はWizコンソールで確認してください。
  EOT
}
